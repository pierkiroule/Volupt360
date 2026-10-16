import { test, expect } from "@playwright/test";
import { createBrush } from "./helpers/proceduralBrushes.js";

test("custom brushes are created, painted, saved and restored with identical textures", async ({
  page,
}) => {
  const errors = [],
    external = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (
      /^https?:/.test(request.url()) &&
      !["localhost", "127.0.0.1"].includes(new URL(request.url()).hostname)
    )
      external.push(request.url());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  await expect(
    page.locator('input[type="file"][accept="image/*"]'),
  ).toHaveCount(0);
  await createBrush(page, 1);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const brushes = page.locator(".generated-brush");
  await expect(brushes.first()).toBeEnabled();
  await createBrush(page, 2);
  await expect(brushes).toHaveCount(2);
  const thumbnails = await brushes
    .locator("img")
    .evaluateAll((nodes) => nodes.map((node) => node.src));
  expect(thumbnails[0]).not.toBe(thumbnails[1]);
  await page.getByRole("button", { name: "Sauvegarder la palette" }).click();
  await expect(page.getByRole("status")).toContainText("Palette sauvegardée");
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("echohypnos-procedural-palette-v1")),
  );
  expect(saved.brushes.map((b) => b.baseId)).toEqual(["voiles", "filaments"]);
  expect(saved.brushes[1].color).toBe("#d44763");
  expect(saved.brushes[1].effect).toBe("Nervures");
  await page.mouse.move(190, 350);
  await page.mouse.down();
  await expect
    .poll(async () =>
      Number(
        await page
          .locator("#stage canvas")
          .getAttribute("data-painted-samples"),
      ),
    )
    .toBeGreaterThan(2);
  await page.mouse.up();
  await page.reload();
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  await expect(brushes).toHaveCount(2);
  await expect(brushes.nth(1)).toHaveAccessibleName("Brosse 2 · Matière 2");
  expect(
    await brushes
      .locator("img")
      .evaluateAll((nodes) => nodes.map((node) => node.src)),
  ).toEqual(thumbnails);
  await createBrush(page, 3);
  await expect(brushes).toHaveCount(3);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test("workshop cancellation, surprise and unavailable storage leave the session usable", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  await page
    .getByRole("button", { name: "Créer une brosse", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  const before = await dialog.locator("img").getAttribute("src");
  await dialog.getByRole("button", { name: "Surprise", exact: true }).click();
  await expect(dialog.locator("img")).not.toHaveAttribute("src", before);
  await page.screenshot({ path: "/tmp/procedural-brush-workshop.png" });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".generated-brush")).toHaveCount(1);
  await expect(page.locator(".generated-brush")).toBeDisabled();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error("quota");
    };
  });
  await createBrush(page, 1);
  await expect(page.locator(".generated-brush")).toBeEnabled();
  await expect(page.getByRole("status")).toContainText(
    "Sauvegarde indisponible",
  );
});

test("invalid saved palettes are bounded and material effects change reproducible textures", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createProceduralBrush, loadPalette, PALETTE_KEY } =
      await import("/src/materials/proceduralBrush.js");
    const { createWatercolorTexture } =
      await import("/src/engine/createWatercolorTexture.js");
    const config = {
      name: "Test",
      baseId: "voiles",
      color: "#247c83",
      effect: "Lavis",
      seed: 125,
      width: 1.2,
      opacity: 0.6,
    };
    const render = (effect) => {
      const p = createProceduralBrush({ ...config, effect });
      const b = createWatercolorTexture(
        { color: p.color },
        p.seed,
        64,
        p.acoustic,
        p.visual,
      );
      const image = b.texture.image.toDataURL();
      b.texture.dispose();
      return image;
    };
    const first = render("Lavis"),
      repeat = render("Lavis"),
      other = render("Granulation");
    localStorage.setItem(PALETTE_KEY, "broken");
    const broken = loadPalette();
    localStorage.setItem(
      PALETTE_KEY,
      JSON.stringify({
        version: 1,
        brushes: [{ ...config, baseId: "unknown" }, ...Array(22).fill(config)],
      }),
    );
    const bounded = loadPalette();
    return {
      same: first === repeat,
      different: first !== other,
      broken,
      count: bounded.length,
      valid: bounded.every((b) => b.baseId === "voiles"),
    };
  });
  expect(result.same).toBe(true);
  expect(result.different).toBe(true);
  expect(result.broken).toEqual([]);
  expect(result.count).toBeLessThanOrEqual(18);
  expect(result.valid).toBe(true);
});
