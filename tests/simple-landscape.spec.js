import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("mobile landscape has six editable brushes, MP3 reaction and no generators loaded", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requested = [],
    errors = [];
  page.on("request", (request) => requested.push(request.url()));
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?classic=1");
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  await expect(page.locator("#stage canvas")).toHaveAttribute(
    "data-skydome",
    "off-white-paper",
  );
  await expect(
    page.getByRole("button", { name: "Mettre l’ambiance en pause" }),
  ).toHaveCount(0);
  await page
    .getByLabel("Importer un MP3", { exact: true })
    .setInputFiles("public/ambiances/ambiance01.mp3");
  await expect(
    page.getByRole("button", { name: "Mettre l’ambiance en pause" }),
  ).toBeVisible();
  const brushes = page.locator(".landscape-palette button"),
    canvas = page.locator("#stage canvas");
  await expect(brushes).toHaveCount(6);
  await expect(
    page.getByRole("button", { name: "Créer une brosse", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Sauvegarder la palette" }),
  ).toHaveCount(0);
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-music-energy")))
    .toBeGreaterThan(0.01);
  await expect
    .poll(async () =>
      Number(await canvas.getAttribute("data-fpv-follow-distance")),
    )
    .toBeGreaterThan(6);
  await expect(canvas).toHaveAttribute("data-drone-intent", "flight-dialogue");
  for (const name of [
    "Lavis",
    "Brosse sèche",
    "Encre fine",
    "Éclaboussures",
    "Diffusion",
    "Tampons",
  ]) {
    const button = page.getByRole("button", { name, exact: true });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await page.mouse.move(180, 350);
    await page.mouse.down();
    await expect(canvas).toHaveAttribute("data-nozzle-paint", "true");
    await page.waitForTimeout(650);
    await page.mouse.up();
  }
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-painted-samples")))
    .toBeGreaterThan(6);
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-matter-drift")))
    .toBeGreaterThan(0.01);
  await page
    .getByRole("button", { name: "FPV 360° gyro", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Photographier la vue actuelle" })
    .click();
  const photo = await download;
  expect(photo.suggestedFilename()).toMatch(/photo.*\.png$/);
  const png = await readFile(await photo.path());
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  expect(Math.max(png.readUInt32BE(16), png.readUInt32BE(20))).toBe(2560);
  await expect(
    page.getByRole("button", { name: "FPV 360° gyro", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "/tmp/living-pictorial-mobile.png" });
  expect(
    requested.some((url) => url.includes("ambiances/ambiance01.mp3")),
  ).toBe(false);
  expect(
    requested.filter((url) =>
      /createAmbientMixer|createEchoInstrument|ChillComposer|WaterProcessor|proceduralBrush/.test(
        url,
      ),
    ),
  ).toEqual([]);
  expect(errors).toEqual([]);
});

test("MP3 pause and photo resume work while synthesis stays uninitialized", async ({
  page,
}) => {
  await page.goto("/?classic=1");
  const result = await page.evaluate(async () => {
    const { createTwigBank } = await import("/src/sonoizo/createTwigBank.js");
    const bank = createTwigBank({ ids: ["voiles"] });
    await bank.preparePlayback();
    const loaded = await bank.loadUniverseAmbience("/ambiances/ambiance01.mp3");
    await bank.toggleAmbience();
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const rms = bank.getVisualFeatures().rms,
      instrument = bank.getInstrumentStats();
    await bank.toggleAmbience();
    await bank.preparePlayback();
    const manual = bank.getSnapshot().ambience;
    await bank.toggleAmbience();
    bank.pauseAmbience();
    await bank.preparePlayback();
    const resumed = bank.getSnapshot().ambience.playing;
    bank.dispose();
    return { loaded, rms, instrument, manual, resumed };
  });
  expect(result.loaded).toBe(true);
  expect(result.rms).toBeGreaterThan(0.00001);
  expect(result.instrument).toBeNull();
  expect(result.manual.userPaused).toBe(true);
  expect(result.manual.playing).toBe(false);
  expect(result.resumed).toBe(true);
});

test("contemplative steering bends gently without jumps or reversed controls", async ({
  page,
}) => {
  await page.goto("/?classic=1");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createSonoizoDance } = await import("/src/sonoizo/SonoizoDance.js");
    const a = createSonoizoDance(),
      b = createSonoizoDance(),
      features = { energy: 0.4, low: 0.3, high: 0.2 };
    for (let i = 0; i < 30; i++) {
      a.update(1 / 60, [], features);
      b.update(1 / 60, [], features);
    }
    b.steer(0.5, 0.25, {
      right: new THREE.Vector3(1, 0, 0),
      up: new THREE.Vector3(0, 1, 0),
    });
    let previous = null,
      maxStep = 0,
      maxAngle = 0,
      delta;
    for (let i = 0; i < 180; i++) {
      const baseline = a.update(1 / 60, [], features),
        pose = b.update(1 / 60, [], features);
      if (previous) {
        maxStep = Math.max(
          maxStep,
          pose.position.distanceTo(previous.position),
        );
        maxAngle = Math.max(
          maxAngle,
          pose.direction.angleTo(previous.direction),
        );
      }
      if (i === 60)
        delta = pose.position.clone().sub(baseline.position).toArray();
      previous = {
        position: pose.position.clone(),
        direction: pose.direction.clone(),
      };
    }
    return { maxStep, maxAngle, delta };
  });
  expect(result.delta[0]).toBeGreaterThan(0.03);
  expect(result.delta[1]).toBeGreaterThan(0.01);
  expect(result.maxStep).toBeLessThan(2);
  expect(result.maxAngle).toBeLessThan(0.35);
});
