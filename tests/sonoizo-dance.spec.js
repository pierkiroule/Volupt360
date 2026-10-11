import { test, expect } from "@playwright/test";
import { createSonoizoDance } from "../src/sonoizo/SonoizoDance.js";
import { createBrushBridge } from "../src/sonoizo/BrushBridge.js";

function wav(amplitude = 0.4, seconds = 6) {
  const rate = 24000,
    frames = rate * seconds,
    data = Buffer.alloc(44 + frames * 2);
  data.write("RIFF", 0);
  data.writeUInt32LE(36 + frames * 2, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(rate, 24);
  data.writeUInt32LE(rate * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(frames * 2, 40);
  for (let i = 0; i < frames; i++)
    data.writeInt16LE(
      Math.round(Math.sin((i * Math.PI * 2 * 440) / rate) * amplitude * 32767),
      44 + i * 2,
    );
  return { name: "brindille.wav", mimeType: "audio/wav", buffer: data };
}

test("seeded dance flies continuously in silence and follows sonic impulses without jumps", () => {
  function journey(seed) {
    const dance = createSonoizoDance({ seed }),
      points = [];
    let previous;
    for (let i = 0; i < 1800; i++) {
      const voices =
        i > 120 && i < 900
          ? [
              {
                id: "echo",
                trigger: Math.floor(i / 120),
                features: {
                  energy: 0.8,
                  low: 0.5,
                  high: 0.6,
                  freq: 2200,
                  flux: 0.2,
                  rms: 0.1,
                },
              },
            ]
          : [];
      const pose = dance.update(1 / 60, voices);
      if (previous) expect(pose.position.distanceTo(previous)).toBeLessThan(2);
      expect(Number.isFinite(pose.velocity.length())).toBe(true);
      expect(pose.direction.length()).toBeCloseTo(1, 5);
      previous = pose.position.clone();
      if (i % 60 === 0) points.push(pose.position.toArray());
    }
    return points;
  }
  const first = journey(37);
  expect(first).toEqual(journey(37));
  expect(first).not.toEqual(journey(52));
  expect(first[0]).not.toEqual(first[1]);
  for (let axis = 0; axis < 3; axis++)
    expect(
      Math.max(...first.map((p) => p[axis])) -
        Math.min(...first.map((p) => p[axis])),
    ).toBeGreaterThan(10);
});

test("bridge deposits each simultaneous brush with its own acoustic features and stops in silence", () => {
  const calls = [],
    finished = [];
  const bridge = createBrushBridge({
    paint: (id, pose) => calls.push({ id, pose }),
    finish: (id) => finished.push(id),
  });
  const pose = { position: { x: 5, y: 4, z: 3 }, motion: 0.4 };
  const voices = [
    { id: "voiles", trigger: 1, features: { rms: 0.1, energy: 0.3 } },
    { id: "network", trigger: 2, features: { rms: 0.3, energy: 0.9 } },
  ];
  bridge.update(pose, voices, false);
  bridge.update(pose, voices, false);
  expect(calls.map((call) => call.id)).toEqual([
    "voiles",
    "network",
    "voiles",
    "network",
  ]);
  expect(calls[0].pose.energy).toBe(0.3);
  expect(calls[1].pose.energy).toBe(0.9);
  expect(calls.every((call) => call.pose.position === pose.position)).toBe(
    true,
  );
  bridge.update(pose, [], true);
  expect(calls).toHaveLength(4);
  expect(finished).toContain("voiles");
  expect(finished).toContain("network");
});

test("per-pad MP3 and WAV imports are capped at five seconds and only pad playback sculpts", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const canvas = page.locator("#stage canvas");
  await expect(canvas).toHaveAttribute("data-oizo", "true");
  await expect(canvas).toHaveAttribute("data-painted-samples", "0");
  const idle = await canvas.getAttribute("data-painter-position");
  await page.waitForTimeout(300);
  expect(await canvas.getAttribute("data-painter-position")).not.toBe(idle);
  await page
    .getByLabel("Importer un son pour Voiles")
    .setInputFiles("tests/fixtures/tone.mp3");
  await expect(
    page.getByRole("button", { name: "Remplacer Voiles", exact: true }),
  ).toBeEnabled();
  await expect(
    page
      .getByRole("button", { name: "Brindille Voiles", exact: true })
      .locator("small"),
  ).toHaveText("3.0 s");
  await page.getByLabel("Importer un son pour Voiles").setInputFiles(wav());
  await expect(
    page
      .getByRole("button", { name: "Brindille Voiles", exact: true })
      .locator("small"),
  ).toHaveText("5.0 s");
  await page.getByRole("button", { name: "Écouter Voiles" }).click();
  await page.waitForTimeout(300);
  await expect(canvas).toHaveAttribute("data-painted-samples", "0");
  await page.getByLabel("Importer un son pour Voiles").setInputFiles({
    name: "broken.mp3",
    mimeType: "audio/mpeg",
    buffer: Buffer.from("broken"),
  });
  await expect(page.getByRole("alert")).toContainText(
    "Import audio impossible",
  );
  await expect(
    page
      .getByRole("button", { name: "Brindille Voiles", exact: true })
      .locator("small"),
  ).toHaveText("5.0 s");
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  const pad = page.getByRole("button", {
    name: "Jouer la brindille Voiles",
    exact: true,
  });
  await pad.click();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-painted-samples")))
    .toBeGreaterThan(2);
  await expect(canvas).toHaveAttribute("data-painted-brushes", "voiles");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-painter-energy")))
    .toBeGreaterThan(0.3);
  await expect(pad).toHaveAttribute("aria-pressed", "false", { timeout: 7000 });
  await page.waitForTimeout(150);
  const painted = await canvas.getAttribute("data-painted-samples"),
    position = await canvas.getAttribute("data-painter-position");
  await page.waitForTimeout(300);
  await expect(canvas).toHaveAttribute("data-painted-samples", painted);
  expect(await canvas.getAttribute("data-painter-position")).not.toBe(position);
  expect(errors).toEqual([]);
});

test("all twelve pad identities deposit their original brushes through the bird bridge", async ({
  page,
}) => {
  const names = [
    "Voiles",
    "Falaises",
    "Corolles",
    "Filaments",
    "Encres",
    "Éclats",
    "Bulles",
    "Aurore",
    "Calligraphie",
    "Network",
    "Dilution",
    "Echo",
  ];
  const ids = [
    "voiles",
    "falaises",
    "corolles",
    "filaments",
    "brumes",
    "lagons",
    "bulles",
    "aurore",
    "calligraphie",
    "network",
    "dilution",
    "echo",
  ];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /WebGL|THREE|Shader/.test(message.text()))
      errors.push(message.text());
  });
  await page.goto("/");
  const file = wav(0.4, 1);
  for (const name of names) {
    await page
      .getByRole("button", { name: `Brindille ${name}`, exact: true })
      .click();
    await page.getByLabel(`Importer un son pour ${name}`).setInputFiles(file);
    await expect(
      page.getByRole("button", { name: `Remplacer ${name}`, exact: true }),
    ).toBeEnabled();
  }
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  for (let i = 0; i < names.length; i++) {
    await page
      .getByRole("button", {
        name: `Jouer la brindille ${names[i]}`,
        exact: true,
      })
      .click();
    await expect
      .poll(async () =>
        (await page.locator("canvas").getAttribute("data-painted-brushes"))
          .split(",")
          .includes(ids[i]),
      )
      .toBe(true);
  }
  const stats = JSON.parse(
    await page.locator("canvas").getAttribute("data-generative-textures"),
  );
  expect(stats.entries).toBe(24);
  expect(stats.generated).toBe(24);
  expect(
    Number(await page.locator("canvas").getAttribute("data-mark-count")),
  ).toBeLessThanOrEqual(80);
  expect(errors).toEqual([]);
});

test("acoustic analysis distinguishes soft and strong pads before mix gain normalization", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Brindille Voiles", exact: true })
    .click();
  const result = await page.evaluate(
    async (files) => {
      const { createTwigBank } = await import("/src/sonoizo/createTwigBank.js");
      const bank = createTwigBank({ ids: ["voiles", "echo"] });
      for (let i = 0; i < files.length; i++)
        await bank.importSample(
          i ? "echo" : "voiles",
          new File([new Uint8Array(files[i])], "sound.wav"),
        );
      bank.press("voiles", 1);
      bank.press("echo", 2);
      await new Promise((resolve) => setTimeout(resolve, 180));
      const voices = bank.getVoices();
      bank.dispose();
      return voices;
    },
    [Array.from(wav(0.03, 1).buffer), Array.from(wav(0.6, 1).buffer)],
  );
  expect(result).toHaveLength(2);
  expect(result[0].features.energy).toBeGreaterThan(0);
  expect(result[1].features.energy).toBeGreaterThan(
    result[0].features.energy + 0.3,
  );
});

test("portrait drone keeps the flying nozzle visible before any sound is played", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const canvas = page.locator("#stage canvas");
  await expect
    .poll(async () => {
      const position = (await canvas.getAttribute("data-oizo-screen"))
        ?.split(",")
        .map(Number);
      return Boolean(
        position &&
        Math.abs(position[0]) < 0.9 &&
        Math.abs(position[1]) < 0.9 &&
        position[2] < 1,
      );
    })
    .toBe(true);
  await expect(canvas).toHaveAttribute("data-painted-samples", "0");
  const before = await canvas.getAttribute("data-painter-position");
  await page.waitForTimeout(300);
  expect(await canvas.getAttribute("data-painter-position")).not.toBe(before);
});
