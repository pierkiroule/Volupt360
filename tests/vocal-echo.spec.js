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

test("vocal echo is quiet, delayed and decays without altering the dry onset", async ({
  page,
}) => {
  await page.goto("/");
  const waveform = await page.evaluate(async () => {
    const { createVocalEcho } = await import("/src/audio/createVocalEcho.js");
    const ctx = new OfflineAudioContext(1, 24000 * 2, 24000),
      echo = createVocalEcho(ctx, ctx.destination);
    const source = ctx.createBufferSource();
    source.buffer = ctx.createBuffer(1, 24000, 24000);
    source.buffer.getChannelData(0)[2400] = 1;
    source.connect(echo.input);
    source.start();
    const rendered = await ctx.startRendering(),
      data = rendered.getChannelData(0);
    const energy = (start, end) => {
      let sum = 0;
      for (let i = Math.floor(start * 24000); i < end * 24000; i++)
        sum += data[i] ** 2;
      return sum;
    };
    const result = {
      direct: data[2400],
      early: energy(0.12, 0.3),
      echo: energy(0.31, 0.38),
      tail: energy(1, 1.9),
    };
    echo.dispose();
    return result;
  });
  expect(waveform.direct).toBeCloseTo(1);
  expect(waveform.early).toBeLessThan(0.00001);
  expect(waveform.echo).toBeGreaterThan(0.0001);
  expect(waveform.echo).toBeLessThan(0.1);
  expect(waveform.tail).toBeLessThan(0.0001);
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
