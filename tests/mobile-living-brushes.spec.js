import { test, expect } from "@playwright/test";
import { createBrush } from "./helpers/proceduralBrushes.js";

test("mobile budget adapts gradually, recovers and ignores background stalls", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createRenderBudget } =
      await import("/src/engine/createRenderBudget.js");
    const b = createRenderBudget({
      mobile: true,
      dpr: 3,
      width: 390,
      height: 844,
    });
    const initial = b.ratio,
      changes = [];
    for (let i = 0; i < 400; i++) if (b.update(40, 0.04)) changes.push(b.ratio);
    const slow = b.ratio;
    for (let i = 0; i < 200; i++) b.update(2000, 0.1);
    const stalled = b.ratio;
    for (let i = 0; i < 3000; i++) b.update(16, 0.016);
    return {
      initial,
      changes,
      slow,
      stalled,
      recovered: b.ratio,
      limit: b.maxMarks,
    };
  });
  expect(result.initial).toBeLessThanOrEqual(1.25);
  expect(result.changes.length).toBeGreaterThan(0);
  expect(result.slow).toBeGreaterThanOrEqual(0.75);
  expect(result.slow).toBeLessThan(result.initial);
  expect(result.stalled).toBe(result.slow);
  expect(result.recovered).toBeGreaterThan(result.slow);
  expect(result.recovered).toBeLessThanOrEqual(result.initial);
  expect(result.limit).toBe(56);
});

test("mobile workshop preserves living character and materials keep evolving between gestures", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  await page
    .getByRole("button", { name: "Créer une brosse", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Vibrante", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "Vibrante", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const layout = await dialog.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const select = node.querySelector("select");
    return {
      width: rect.width,
      left: rect.left,
      font: parseFloat(getComputedStyle(select).fontSize),
      scroll: node.scrollHeight > node.clientHeight,
    };
  });
  expect(layout.left).toBeGreaterThanOrEqual(0);
  expect(layout.width).toBeLessThanOrEqual(390);
  expect(layout.font).toBeGreaterThanOrEqual(16);
  await page.screenshot({ path: "/tmp/mobile-brush-workshop.png" });
  await dialog
    .getByRole("button", { name: "Créer la brosse", exact: true })
    .click();
  const canvas = page.locator("#stage canvas");
  await expect(canvas).toHaveAttribute("data-mobile-quality", "true");
  expect(
    Number(await canvas.getAttribute("data-render-scale")),
  ).toBeLessThanOrEqual(1.25);
  await page.mouse.move(180, 350);
  await page.mouse.down();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-painted-samples")))
    .toBeGreaterThan(4);
  await page.mouse.up();
  const before = Number(await canvas.getAttribute("data-material-time"));
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-material-time")))
    .toBeGreaterThan(before + 0.3);
  await page.getByRole("button", { name: "Vue photo", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-sculpture-paused", "true");
  const frozen = await canvas.getAttribute("data-material-time");
  await page.waitForTimeout(250);
  expect(await canvas.getAttribute("data-material-time")).toBe(frozen);
  await page.reload();
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  await expect(page.locator(".generated-brush")).toBeEnabled();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("echohypnos-procedural-palette-v1")),
  );
  expect(stored.brushes[0].life).toBe("Vibrante");
  expect(errors).toEqual([]);
});

test("audio envelopes respond strongly and release smoothly at different frame rates", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createVisualAudioResponse } =
      await import("/src/audio/createVisualAudioResponse.js");
    function measure(fps) {
      const respond = createVisualAudioResponse();
      let value;
      for (let i = 0; i < fps; i++)
        value = respond(
          { rms: 0.12, low: 0.65, high: 0.45, flux: 0.2 },
          {},
          1 / fps,
        );
      const loud = { ...value };
      const first = respond({}, {}, 1 / fps);
      for (let i = 0; i < fps * 3; i++) value = respond({}, {}, 1 / fps);
      return { loud, first, quiet: value };
    }
    return { slow: measure(30), fast: measure(60) };
  });
  expect(result.fast.loud.energy).toBeGreaterThan(0.6);
  expect(result.fast.loud.low).toBeGreaterThan(0.7);
  expect(result.fast.loud.pulse).toBeGreaterThan(0.5);
  expect(result.fast.first.low).toBeGreaterThan(0);
  expect(result.fast.first.low).toBeLessThan(result.fast.loud.low);
  expect(result.fast.quiet.energy).toBeLessThan(0.01);
  expect(result.fast.quiet.low).toBeLessThan(0.01);
  expect(result.slow.loud.low).toBeCloseTo(result.fast.loud.low, 2);
});
