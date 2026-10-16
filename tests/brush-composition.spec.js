import { test, expect } from "@playwright/test";
import { createBrush } from "./helpers/proceduralBrushes.js";

test("painting composes procedural audio with no MP3 request and preserves pause and photo resume", async ({
  page,
}) => {
  const mp3 = [],
    errors = [];
  page.on("request", (request) => {
    if (/\.mp3(?:\?|$)/.test(request.url())) mp3.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  const pause = page.getByRole("button", {
    name: "Mettre la composition en pause",
  });
  await expect(pause).toBeVisible();
  await createBrush(page, 1);
  const canvas = page.locator("#stage canvas");
  await page.mouse.move(180, 350);
  await page.mouse.down();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-painted-samples")))
    .toBeGreaterThan(4);
  await page.mouse.up();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-music-energy")))
    .toBeGreaterThan(0.01);
  await pause.click();
  await expect(
    page.getByRole("button", { name: "Reprendre la composition" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "FPV 360° gyro", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Reprendre la composition" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reprendre la composition" }).click();
  await page.getByRole("button", { name: "Vue photo", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-sculpture-paused", "true");
  await page.getByRole("button", { name: "FPV drone", exact: true }).click();
  await expect(pause).toBeVisible();
  expect(mp3).toEqual([]);
  expect(errors).toEqual([]);
});

test("real native synthesis records trace motifs, produces measured audio and recalls them", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createTwigBank } = await import("/src/sonoizo/createTwigBank.js");
    const { createProceduralBrush } =
      await import("/src/materials/proceduralBrush.js");
    const bank = createTwigBank({ ids: ["voiles"] });
    await bank.preparePlayback();
    await bank.startInstrument("souffle");
    bank.setBrushSound(
      "voiles",
      createProceduralBrush({
        name: "Bleu",
        baseId: "voiles",
        color: "#246d91",
        effect: "Nervures",
        life: "Vibrante",
        seed: 37,
        width: 1,
        opacity: 0.8,
      }),
    );
    const before = bank.getInstrumentStats().dialogue.traces;
    bank.depositSound("voiles", { x: 0, y: 1, z: -2 }, 0.8, "trace-a");
    bank.depositSound("voiles", { x: 2, y: 3, z: -4 }, 0.7, "trace-b");
    const after = bank.getInstrumentStats();
    let rms = 0;
    for (let i = 0; i < 12; i++) {
      await new Promise((resolve) => setTimeout(resolve, 120));
      rms = Math.max(rms, bank.getVisualFeatures().rms);
    }
    const recall = bank.recallSound("voiles", { x: 0, y: 1, z: -2 }, "trace-a");
    bank.forgetSound("trace-b");
    const remaining = bank.getInstrumentStats().dialogue.traces;
    bank.pauseAmbience();
    const paused = bank.getSnapshot().composition.playing;
    await bank.preparePlayback();
    const resumed = bank.getSnapshot().composition.playing;
    const mix = bank.getInstrumentStats().mix;
    bank.dispose();
    return { before, after, rms, recall, remaining, paused, resumed, mix };
  });
  expect(result.after.dialogue.traces).toBe(result.before + 2);
  expect(result.after.total).toBeGreaterThan(0);
  expect(result.rms).toBeGreaterThan(0.00001);
  expect(result.remaining).toBe(result.before + 1);
  expect(result.paused).toBe(false);
  expect(result.resumed).toBe(true);
  expect(result.mix).toEqual([1]);
});
