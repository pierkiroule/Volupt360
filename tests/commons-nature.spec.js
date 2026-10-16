import { test, expect } from "@playwright/test";
import { mockCommons, naturePng } from "./helpers/birdFixtures.js";

test("photo palette and contours transform the actual material even with an unchanged bird recording", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { analyzeNaturePixels, combineNatureProfile } =
      await import("/src/materials/commonsNature.js");
    const { createWatercolorTexture } =
      await import("/src/engine/createWatercolorTexture.js");
    const pixels = (texture) => {
      const data = new Uint8ClampedArray(64 * 64 * 4);
      for (let y = 0; y < 64; y++)
        for (let x = 0; x < 64; x++) {
          const i = (y * 64 + x) * 4;
          data[i] = texture ? (x % 4 < 2 ? 210 : 30) : 30;
          data[i + 1] = texture ? 45 : 155;
          data[i + 2] = texture ? 20 : 65;
          data[i + 3] = 255;
        }
      return data;
    };
    const a = analyzeNaturePixels(pixels(false), 64, 64),
      b = analyzeNaturePixels(pixels(true), 64, 64),
      sound = {
        seed: 101,
        acoustic: {
          brightness: 0.3,
          contrast: 0.4,
          envelope: Array(32).fill(0.7),
        },
      };
    const x = combineNatureProfile(sound, { photo: { pageid: 1 }, visual: a }),
      y = combineNatureProfile(sound, { photo: { pageid: 1 }, visual: b });
    const t1 = createWatercolorTexture(
        { color: x.color },
        x.seed,
        128,
        x.acoustic,
        x.visual,
      ),
      t2 = createWatercolorTexture(
        { color: y.color },
        y.seed,
        128,
        y.acoustic,
        y.visual,
      );
    const different =
      t1.texture.image.toDataURL() !== t2.texture.image.toDataURL();
    t1.texture.dispose();
    t2.texture.dispose();
    return {
      edgeA: a.edge,
      edgeB: b.edge,
      colorA: x.color,
      colorB: y.color,
      baseA: x.baseId,
      baseB: y.baseId,
      different,
    };
  });
  expect(result.edgeB).toBeGreaterThan(result.edgeA + 0.1);
  expect(result.colorA).not.toBe(result.colorB);
  expect(result.different).toBe(true);
});

test("photo CORS fallback decodes an untainted blob and both media credits are downloadable", async ({
  page,
}) => {
  await mockCommons(page);
  let relays = 0;
  await page.route("https://upload.wikimedia.org/**/*.png", (route) =>
    route.abort(),
  );
  await page.route("**/api/commons-media?**", (route) => {
    relays++;
    return route.fulfill({ body: naturePng(19), contentType: "image/png" });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  await expect(page.locator(".generated-brush")).toBeEnabled();
  expect(relays).toBeGreaterThan(0);
  await page.locator(".bird-credits summary").click();
  await expect(page.locator(".bird-credits")).toContainText("Photo");
  await expect(page.locator(".bird-credits")).toContainText("Chant");
  await expect(page.locator(".bird-credits")).toContainText("CC BY 4.0");
  await expect(
    page.locator(
      ".bird-credits a[href^='https://commons.wikimedia.org/wiki/']",
    ),
  ).toHaveCount(2);
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "Télécharger les crédits des matières et chants",
    })
    .click();
  expect((await download).suggestedFilename()).toBe(
    "SUNOIZO-credits-commons.txt",
  );
});

test("failed photo decoding keeps the previous material intact", async ({
  page,
}) => {
  await mockCommons(page, { count: 5 });
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  const brushes = page.locator(".generated-brush");
  await expect(brushes.first()).toBeEnabled();
  const image = await brushes.first().locator("img").getAttribute("src");
  await page.route("https://upload.wikimedia.org/**/*.png", (route) =>
    route.fulfill({ body: "not an image", contentType: "image/png" }),
  );
  await page
    .getByRole("button", { name: "Nouvelle matière", exact: true })
    .click();
  await expect(page.locator(".growing-brush-error")).toContainText(
    "Nouvelle matière indisponible",
  );
  await expect(brushes).toHaveCount(1);
  expect(await brushes.first().locator("img").getAttribute("src")).toBe(image);
});
