import { test, expect } from "@playwright/test";

test("pigment atlas is deterministic and contains four different irregular materials", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { watercolorPixels } = await import("/src/simple/WatercolorAtlas.ts");
    const a = watercolorPixels(42, 64),
      b = watercolorPixels(42, 64),
      c = watercolorPixels(43, 64);
    const summaries = [];
    for (let tile = 0; tile < 4; tile++) {
      let sum = 0,
        min = 255,
        max = 0;
      for (let y = 0; y < 64; y++)
        for (let x = 0; x < 64; x++) {
          const i =
              (((tile >> 1) * 64 + y) * 128 + (tile % 2) * 64 + x) * 4 + 3,
            value = a.pixels[i];
          sum += value;
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      summaries.push({ sum, min, max });
    }
    return {
      same: a.pixels.every((v, i) => v === b.pixels[i]),
      changed: a.pixels.some((v, i) => v !== c.pixels[i]),
      summaries,
    };
  });
  expect(result.same).toBe(true);
  expect(result.changed).toBe(true);
  expect(new Set(result.summaries.map((s) => s.sum)).size).toBe(4);
  for (const s of result.summaries) expect(s.max - s.min).toBeGreaterThan(65);
});

test("viewpoint remains above the landscape and all animated layers freeze on pause", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /WebGL|shader|GL_INVALID/i.test(m.text()))
      errors.push(m.text());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-ready", "inside");
  await expect(canvas).toHaveAttribute("data-horizon", "painted-landscape");
  await expect(
    page.getByRole("button", { name: "Contempler", exact: true }),
  ).toBeVisible();
  const position = await canvas.getAttribute("data-position");
  await expect
    .poll(() => canvas.getAttribute("data-position"))
    .not.toBe(position);
  expect(Number(await canvas.getAttribute("data-altitude"))).toBeGreaterThan(
    16,
  );
  await page.mouse.move(180, 280);
  await page.mouse.down();
  await page.mouse.move(180, 420, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/painterly-horizon.png" });
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.waitForTimeout(180);
  const time = await canvas.getAttribute("data-bird-time"),
    fixed = await canvas.getAttribute("data-position");
  await page.waitForTimeout(250);
  expect(await canvas.getAttribute("data-bird-time")).toBe(time);
  expect(await canvas.getAttribute("data-position")).toBe(fixed);
  expect(
    Number(await canvas.getAttribute("data-calls")),
  ).toBeGreaterThanOrEqual(10);
  expect(Number(await canvas.getAttribute("data-calls"))).toBeLessThanOrEqual(
    12,
  );
  expect(errors).toEqual([]);
});
