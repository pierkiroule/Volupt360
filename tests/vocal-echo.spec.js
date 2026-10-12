import { test, expect } from "@playwright/test";

test("vocal lock reserves the first phrase before resume and prevents interruption, repeats and overlapping previews", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createTwigBank } = await import("/src/sonoizo/createTwigBank.js");
    const { POEMS } = await import("/src/sonoizo/poems.js");
    const bank = createTwigBank({ ids: POEMS.map((x) => x.id) });
    await bank.loadPoems(POEMS);
    const native = AudioContext.prototype.resume;
    let unblock;
    AudioContext.prototype.resume = function () {
      return new Promise((resolve) => {
        unblock = () => native.call(this).then(resolve);
      });
    };
    const first = bank.trigger("voiles");
    const pending = bank.getSnapshot();
    await bank.trigger("falaises");
    await bank.listen("corolles");
    await bank.trigger("voiles");
    unblock();
    await first;
    AudioContext.prototype.resume = native;
    await bank.trigger("falaises");
    await bank.listen("corolles");
    const active = bank.getSnapshot();
    bank.dispose();
    return { pending, active };
  });
  expect(result.pending.vocalBusy).toBe(true);
  expect(result.pending.activeVocalId).toBe("voiles");
  expect(
    Object.entries(result.active.slots)
      .filter(([, slot]) => slot.playing)
      .map(([id]) => id),
  ).toEqual(["voiles"]);
});

test("one global MP3 importer remains reachable with the atelier folded, and a finished voice enables the next pad", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".twig-pad.is-filled")).toHaveCount(12);
  await expect(
    page.getByRole("button", {
      name: "Choisir une ambiance MP3",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.locator('input[type="file"][accept="audio/*,.mp3"]'),
  ).toHaveCount(1);
  const a = page.getByRole("button", {
      name: "Jouer le fragment Voiles",
      exact: true,
    }),
    b = page.getByRole("button", {
      name: "Jouer le fragment Falaises",
      exact: true,
    });
  await a.click();
  await expect(b).toBeDisabled();
  await expect(a).toHaveAttribute("aria-pressed", "true");
  await expect(b).toBeEnabled({ timeout: 10000 });
  await b.click();
  await expect(b).toHaveAttribute("aria-pressed", "true");
});
