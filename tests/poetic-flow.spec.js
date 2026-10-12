import { test, expect } from "@playwright/test";
import { createGazeReader } from "../src/sonoizo/GazeReader.js";

test("gaze dwells, speaks once, rearms after looking away and does not interrupt a phrase", async () => {
  const spoken = [];
  let busy = false;
  const gaze = createGazeReader({
    read: (id) => spoken.push(id),
    isSpeaking: () => busy,
  });
  gaze.update(0.3, "rives");
  expect(spoken).toEqual([]);
  gaze.update(0.4, "rives");
  expect(spoken).toEqual(["rives"]);
  gaze.update(10, "rives");
  expect(spoken).toHaveLength(1);
  gaze.update(0.1, null);
  busy = true;
  gaze.update(2, "souffle");
  expect(spoken).toHaveLength(1);
  busy = false;
  gaze.update(0.01, "souffle");
  expect(spoken).toEqual(["rives", "souffle"]);
  gaze.reset();
  gaze.update(0.7, "rives");
  expect(spoken).toHaveLength(3);
  gaze.dispose();
  gaze.update(5, "source");
  expect(spoken).toHaveLength(3);
});

test("twelve spoken fragments load silently, sculpt with real voice features and leave a centered black word", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".twig-pad.is-filled")).toHaveCount(12);
  const result = await page.evaluate(async () => {
    const { POEMS } = await import("/src/sonoizo/poems.js");
    const decoder = new OfflineAudioContext(1, 1, 24000),
      fragments = [];
    for (const poem of POEMS) {
      const response = await fetch(poem.url);
      const buffer = await decoder.decodeAudioData(
        await response.arrayBuffer(),
      );
      let energy = 0;
      for (const x of buffer.getChannelData(0)) energy += x * x;
      fragments.push({
        id: poem.id,
        text: poem.text,
        word: poem.word,
        duration: buffer.duration,
        energy,
      });
    }
    return fragments;
  });
  expect(result).toHaveLength(12);
  for (const poem of result) {
    expect(poem.text).toContain(poem.word);
    expect(poem.duration).toBeGreaterThan(1);
    expect(poem.duration).toBeLessThan(15);
    expect(poem.energy).toBeGreaterThan(1);
  }
  await page
    .getByRole("button", { name: "Jouer le fragment Voiles", exact: true })
    .click();
  const canvas = page.locator("#stage canvas");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-painted-samples")))
    .toBeGreaterThan(2);
  await expect
    .poll(() => canvas.getAttribute("data-poetic-words"))
    .toContain("Fragment 10");
  const geometry = await page.evaluate(async () => {
    const { createPoeticWord } =
      await import("/src/engine/createPoeticWord.js");
    const label = createPoeticWord({
      word: "rives",
      text: "test",
      id: "voiles",
      position: { x: 2, y: 3, z: 4 },
    });
    label.update(1.5);
    const info = {
      position: label.sprite.position.toArray(),
      opacity: label.sprite.material.opacity,
      transparent: label.sprite.material.map.image
        .getContext("2d")
        .getImageData(0, 0, 1, 1).data[3],
    };
    label.dispose();
    return info;
  });
  expect(geometry.position).toEqual([2, 3, 4]);
  expect(geometry.opacity).toBe(1);
  expect(geometry.transparent).toBe(0);
  expect(errors).toEqual([]);
});

test("global MP3 ambience is independent of brush voices, can be replaced or removed and does not sculpt alone", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".twig-pad.is-filled")).toHaveCount(12);
  await page
    .getByRole("button", { name: "Déplier les fonctionnalités" })
    .click();
  await page
    .getByLabel("Importer une ambiance MP3")
    .setInputFiles("tests/fixtures/tone.mp3");
  await page
    .getByRole("button", { name: "Lire l’ambiance", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Mettre l’ambiance en pause",
      exact: true,
    }),
  ).toBeVisible();
  const canvas = page.locator("#stage canvas");
  await page.waitForTimeout(300);
  await expect(canvas).toHaveAttribute("data-painted-samples", "0");
  await page
    .getByRole("button", { name: "Jouer le fragment Corolles", exact: true })
    .click();
  await expect
    .poll(() => canvas.getAttribute("data-painted-brushes"))
    .toContain("corolles");
  await expect(
    page.getByRole("button", {
      name: "Mettre l’ambiance en pause",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel("Importer une ambiance MP3").setInputFiles({
    name: "broken.mp3",
    mimeType: "audio/mpeg",
    buffer: Buffer.from("invalid"),
  });
  await expect(page.getByRole("alert")).toContainText("Ambiance");
  await expect(
    page.getByRole("button", {
      name: "Mettre l’ambiance en pause",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Retirer l’ambiance", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Lire l’ambiance", exact: true }),
  ).toHaveCount(0);
});

test("a centered word in gyro replays its TTS once without painting another trace", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__starts = 0;
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      window.__starts++;
      return start.apply(this, args);
    };
    if (window.DeviceOrientationEvent)
      window.DeviceOrientationEvent.requestPermission = async () => "granted";
  });
  await page.goto("/");
  await expect(page.locator(".twig-pad.is-filled")).toHaveCount(12);
  await page.evaluate(async () => {
    const { createPoeticWord } =
      await import("/src/engine/createPoeticWord.js");
    const dummy = createPoeticWord({
      word: "test",
      position: { x: 0, y: 0, z: 0 },
    });
    const proto = Object.getPrototypeOf(Object.getPrototypeOf(dummy.sprite)),
      add = proto.add;
    proto.add = function (...objects) {
      for (const object of objects)
        if (object.isSprite) window.__wordSprite = object;
      return add.apply(this, objects);
    };
    dummy.dispose();
  });
  const pad = page.getByRole("button", {
    name: "Jouer le fragment Voiles",
    exact: true,
  });
  await pad.click();
  await expect(pad).toHaveAttribute("aria-pressed", "false", {
    timeout: 10000,
  });
  const canvas = page.locator("#stage canvas");
  await expect
    .poll(() => canvas.getAttribute("data-poetic-words"))
    .toContain("Fragment 10");
  const samples = await canvas.getAttribute("data-painted-samples");
  const target = await page.evaluate(() => {
    const position = window.__wordSprite.getWorldPosition(
      window.__wordSprite.position.clone(),
    );
    const painter = document
      .querySelector("#stage canvas")
      .dataset.painterPosition.split(",")
      .map(Number);
    return {
      alpha:
        ((Math.atan2(position.x, position.z) -
          Math.atan2(painter[0], painter[2])) *
          180) /
        Math.PI,
      beta: 90 + (Math.asin(position.y / position.length()) * 180) / Math.PI,
    };
  });
  const before = await page.evaluate(() => window.__starts);
  await page
    .getByRole("button", { name: "FPV 360° gyro", exact: true })
    .click();
  await page.waitForTimeout(100);
  await page.evaluate(({ alpha, beta }) => {
    window.dispatchEvent(
      new DeviceOrientationEvent("deviceorientation", {
        alpha: 0,
        beta: 90,
        gamma: 0,
      }),
    );
    window.dispatchEvent(
      new DeviceOrientationEvent("deviceorientation", {
        alpha,
        beta,
        gamma: 0,
      }),
    );
  }, target);
  await expect
    .poll(() => canvas.getAttribute("data-gaze-word"), { timeout: 5000 })
    .toBe("Fragment 10");
  await expect
    .poll(() => page.evaluate(() => window.__starts))
    .toBe(before + 1);
  await page.waitForTimeout(7400);
  expect(await page.evaluate(() => window.__starts)).toBe(before + 1);
  await expect(canvas).toHaveAttribute("data-painted-samples", samples);
});
