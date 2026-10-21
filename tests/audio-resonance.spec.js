import { test, expect } from "@playwright/test";
test("spectral envelopes distinguish real bands, decay in silence and stay finite", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { AudioFeatures } =
      await import("/src/audio/procedural/AudioFeatures.js");
    const wave = new Float32Array(256);
    for (let i = 0; i < 256; i++) wave[i] = Math.sin(i * 0.1) * 0.04;
    const spectrum = new Float32Array(512),
      values = [];
    for (const hz of [100, 800, 3500]) {
      const features = new AudioFeatures(48000);
      spectrum.fill(-Infinity);
      spectrum[Math.round(hz / (48000 / 1024))] = -16;
      for (let i = 0; i < 90; i++) features.update(wave, spectrum, 1 / 60);
      values.push({ ...features.value });
      for (let i = 0; i < 600; i++)
        features.update(wave, spectrum, 1 / 60, false);
      values.push({ ...features.value });
    }
    return values;
  });
  for (let i = 0; i < 3; i++) {
    const active = result[i * 2],
      silent = result[i * 2 + 1];
    expect(active[["bass", "mid", "treble"][i]]).toBeGreaterThan(0.1);
    for (const key of ["bass", "mid", "treble"].filter(
      (k) => k !== ["bass", "mid", "treble"][i],
    ))
      expect(active[key]).toBeLessThan(0.001);
    for (const v of Object.values(silent)) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeLessThan(0.001);
    }
  }
});
test("real music drives the bubble and inner universe, visual pause freezes its response", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Vague", exact: true }).click();
  await page
    .getByRole("button", { name: "Activer le son", exact: true })
    .click();
  const preview = page.locator(".squibble-orb canvas");
  await expect
    .poll(async () => +(await preview.getAttribute("data-audio-energy")))
    .toBeGreaterThan(0.01);
  await expect
    .poll(async () => +(await preview.getAttribute("data-audio-mid")))
    .toBeGreaterThan(0.01);
  await page
    .getByRole("button", { name: "Entrer dans mon monde", exact: true })
    .click();
  const world = page.locator(".squiggle-world canvas");
  await expect
    .poll(async () => +(await world.getAttribute("data-audio-energy")))
    .toBeGreaterThan(0.01);
  await page
    .getByRole("button", {
      name: "Mettre les animations en pause",
      exact: true,
    })
    .click();
  const frozen = await world.getAttribute("data-audio-energy"),
    time = await world.getAttribute("data-animation-time");
  await page.waitForTimeout(300);
  await expect(world).toHaveAttribute("data-audio-energy", frozen);
  await expect(world).toHaveAttribute("data-animation-time", time);
  await page
    .getByRole("button", { name: "Reprendre les animations", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Mettre le son en pause", exact: true })
    .click();
  await expect
    .poll(async () => +(await world.getAttribute("data-audio-energy")), {
      timeout: 8000,
    })
    .toBeLessThan(0.003);
  expect(errors).toEqual([]);
});
