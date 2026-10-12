import { test, expect } from "@playwright/test";
test("twelve spoken fragments load silently, sculpt with real voice features without depositing text", async ({
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
  await expect(
    page.getByRole("button", { name: "Jouer le fragment Voiles", exact: true }),
  ).toHaveAttribute("aria-pressed", "false", { timeout: 10000 });
  expect(await canvas.getAttribute("data-poetic-words")).toBeNull();
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
