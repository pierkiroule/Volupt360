import { test, expect } from "@playwright/test";

test("five distinct high-contrast organic masks have real transparency and the mobile editor exposes no image upload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const masks = await page.evaluate(async () => {
    const { PREDEFINED_TEXTURES, createPredefinedTexture } =
      await import("/src/engine/predefinedTextures.js");
    return PREDEFINED_TEXTURES.map(({ id }) => {
      const binding = createPredefinedTexture(id),
        canvas = binding.texture.image;
      const pixels = canvas.getContext("2d").getImageData(0, 0, 256, 256).data;
      let opaque = 0,
        clear = 0;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] === 255) opaque++;
        if (pixels[i] === 0) clear++;
      }
      binding.texture.dispose();
      return { opaque, clear, preview: binding.preview };
    });
  });
  expect(new Set(masks.map((mask) => mask.preview)).size).toBe(5);
  for (const mask of masks) {
    expect(mask.opaque).toBeGreaterThan(1000);
    expect(mask.clear).toBeGreaterThan(1000);
  }
  await page
    .getByRole("button", { name: "Déplier les fonctionnalités" })
    .click();
  await page.getByRole("button", { name: "Mes sons", exact: true }).click();
  await expect(
    page.locator('input[type="file"][accept="image/*"]'),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Modifier la texture Voiles" })
    .click();
  await expect(
    page.getByRole("group", { name: "Textures de Voiles" }).getByRole("button"),
  ).toHaveCount(5);
  await page
    .getByRole("button", {
      name: "Texture Encre éclatée pour Voiles",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Texture Encre éclatée pour Voiles",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await page
    .getByRole("button", { name: "Jouer la brindille Voiles", exact: true })
    .click();
  await expect
    .poll(async () =>
      Number(
        await page
          .locator("#stage canvas")
          .getAttribute("data-textured-strokes"),
      ),
    )
    .toBeGreaterThan(0);
});
