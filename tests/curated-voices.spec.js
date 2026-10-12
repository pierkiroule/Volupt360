import { test, expect } from "@playwright/test";
import selection from "../src/sonoizo/voiceSelection.json" with { type: "json" };
import manifest from "../public/voices/fragments.json" with { type: "json" };

test("twelve existing distinct voice files cover the twelve brush identities", () => {
  expect(selection).toHaveLength(12);
  expect(new Set(selection.map((voice) => voice.file)).size).toBe(12);
  expect(new Set(selection.map((voice) => voice.id)).size).toBe(12);
  for (const voice of selection)
    expect(
      manifest.fragments.some((fragment) => fragment.fichier === voice.file),
    ).toBe(true);
});

test("all selected voices load completely without the previous five-second truncation", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".twig-pad.is-filled")).toHaveCount(12);
  const durations = await page.evaluate(async () => {
    const { POEMS } = await import("/src/sonoizo/poems.js");
    const { createTwigBank } = await import("/src/sonoizo/createTwigBank.js");
    const bank = createTwigBank({ ids: POEMS.map((poem) => poem.id) });
    await bank.loadPoems(POEMS);
    const { BRUSHES } = await import("/src/engine/brushes.js");
    const result = bank.getSnapshot();
    bank.dispose();
    return { slots: result.slots, ids: BRUSHES.map((brush) => brush.id) };
  });
  expect(durations.ids.sort()).toEqual(
    selection.map((voice) => voice.id).sort(),
  );
  for (const voice of selection) {
    const source = manifest.fragments.find(
      (fragment) => fragment.fichier === voice.file,
    );
    expect(durations.slots[voice.id].duration).toBeGreaterThan(5);
    expect(durations.slots[voice.id].duration).toBeCloseTo(source.duree_s, 1);
  }
  await page
    .getByRole("button", { name: "Jouer le fragment Voiles", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Jouer le fragment Voiles", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(5100);
  await expect(
    page.getByRole("button", { name: "Jouer le fragment Voiles", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Jouer le fragment Voiles", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  expect(errors).toEqual([]);
});
