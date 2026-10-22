import { test, expect } from "@playwright/test";
test("music scores are seeded, distinct, harmonious and restrained", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { musicScore } = await import("/src/landscape/musicComposition.ts");
    const { DEFAULT_SETTINGS, BIOMES } =
      await import("/src/landscape/types.ts");
    const a = musicScore(DEFAULT_SETTINGS),
      b = musicScore(DEFAULT_SETTINGS);
    return {
      same: JSON.stringify(a) === JSON.stringify(b),
      scores: Object.keys(BIOMES).map((biome) =>
        musicScore({ ...DEFAULT_SETTINGS, biome }),
      ),
      night: musicScore({ ...DEFAULT_SETTINGS, atmosphere: "night" }),
      newSeed: musicScore({ ...DEFAULT_SETTINGS, seed: 234 }),
    };
  });
  expect(result.same).toBe(true);
  expect(new Set(result.scores.map((s) => s.pad)).size).toBe(5);
  expect(result.newSeed.melody).not.toBe(result.scores[0].melody);
  expect(result.night.bpm).toBeLessThan(result.scores[0].bpm);
  for (const score of result.scores) {
    const notes = score.melody.match(/\d+/g).map(Number);
    expect(notes.every((n) => n >= 48 && n <= 76)).toBe(true);
    expect(score.bpm).toBeLessThanOrEqual(74);
    expect(score.melody).toContain("~");
  }
});
test("Strudel starts voluntarily, produces audio, follows pause and stops cleanly", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (
      m.type() === "error" ||
      /error:|unknown sound|not found|could not load AudioWorklet/i.test(
        m.text(),
      )
    )
      errors.push(m.text());
  });
  await page.addInitScript(() => {
    const Native = window.AudioContext;
    window.__audioContexts = 0;
    window.AudioContext = class extends Native {
      constructor(...args) {
        super(...args);
        window.__audioContexts++;
      }
    };
  });
  await page.route("https://api.polyhaven.com/**", (r) => r.abort());
  await page.goto("/");
  await page
    .getByRole("button", { name: "Générer un paysage", exact: true })
    .click();
  await expect(page.locator("canvas")).toHaveAttribute("data-biome", "forest", {
    timeout: 20000,
  });
  expect(await page.evaluate(() => window.__audioContexts)).toBe(0);
  await page.getByRole("button", { name: "Musique", exact: true }).click();
  await page.getByRole("button", { name: "Écouter", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Couper le son", exact: true }),
  ).toBeVisible({ timeout: 20000 });
  const inspect = () =>
    page.evaluate(async () => {
      const { getLandscapeMusic } =
        await import("/src/landscape/StrudelMusicEngine.ts");
      return getLandscapeMusic().inspect();
    });
  await expect
    .poll(async () => (await inspect()).rms, { timeout: 12000 })
    .toBeGreaterThan(0.001);
  expect((await inspect()).peak).toBeLessThan(1);
  expect(await page.evaluate(() => window.__audioContexts)).toBe(1);
  const previousSeed = (await inspect()).seed;
  await page.getByRole("button", { name: "Réglages", exact: true }).click();
  await page.getByLabel("Biome", { exact: true }).selectOption("dream");
  await page.getByRole("button", { name: "Régénérer", exact: true }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-biome", "dream", {
    timeout: 20000,
  });
  await expect.poll(async () => (await inspect()).seed).not.toBe(previousSeed);
  await expect
    .poll(async () => (await inspect()).rms, { timeout: 10000 })
    .toBeGreaterThan(0.001);

  await page.getByRole("slider", { name: "Volume musical" }).fill("0");
  await page.waitForTimeout(300);
  expect((await inspect()).rms).toBeLessThan(0.00001);
  await page.getByRole("slider", { name: "Volume musical" }).fill("55");
  await page.getByRole("button", { name: "Explorer", exact: true }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect.poll(async () => (await inspect()).state).toBe("suspended");
  await page.getByRole("button", { name: "Reprendre", exact: true }).click();
  await expect.poll(async () => (await inspect()).state).toBe("running");
  await page
    .getByRole("button", { name: "Couper le son", exact: true })
    .click();
  await expect.poll(async () => (await inspect()).state).toBe("suspended");
  await page.getByRole("button", { name: "Écouter", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Couper le son", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => window.__audioContexts)).toBe(1);
  await page.evaluate(async () => {
    const { releaseLandscapeMusic } =
      await import("/src/landscape/StrudelMusicEngine.ts");
    await releaseLandscapeMusic();
  });
  expect(errors.filter((s) => !s.includes("ERR_FAILED"))).toEqual([]);
});
