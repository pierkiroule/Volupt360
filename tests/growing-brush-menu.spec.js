import { test, expect } from "@playwright/test";
import { observation, wav } from "./helpers/birdFixtures.js";

test("one initial brush grows into an independent collection with no planets", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  let queries = 0;
  await page.route("https://api.inaturalist.org/**", (route) => {
    queries++;
    return route.fulfill({
      json: {
        results: Array.from({ length: 18 }, (_, i) => observation(i + 1)),
      },
    });
  });
  await page.route("https://static.inaturalist.org/**", (route) =>
    route.fulfill({ body: wav(), contentType: "audio/wav" }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  const menu = page.getByRole("region", { name: "Mes brosses d’oiseaux" }),
    buttons = menu.locator(".generated-brush"),
    canvas = page.locator("#stage canvas");
  await expect(buttons).toHaveCount(1);
  await expect(buttons.first()).toBeEnabled();
  await expect(canvas).toHaveAttribute("data-celestial-brushes", "0");
  await expect(canvas).toHaveAttribute("data-generated-brush-count", "1");
  const first = await buttons.first().getAttribute("aria-label"),
    thumbnail = await buttons.first().locator("img").getAttribute("src");
  await menu.getByRole("button", { name: "Ajouter une brosse" }).click();
  await expect(buttons).toHaveCount(2);
  await expect(buttons.nth(1)).toHaveAttribute("aria-pressed", "true");
  expect(await buttons.nth(1).getAttribute("aria-label")).not.toBe(first);
  expect(await buttons.nth(1).locator("img").getAttribute("src")).not.toBe(
    thumbnail,
  );
  expect(queries).toBeGreaterThanOrEqual(2);
  await buttons.first().click();
  await expect(buttons.first()).toHaveAttribute("aria-pressed", "true");
  await expect(canvas).toHaveAttribute("data-active-brush", "voiles");
  await page.mouse.move(180, 350);
  await page.mouse.down();
  await expect(canvas).toHaveAttribute("data-nozzle-paint", "true");
  await expect(page.locator(".bird-credits summary")).toContainText("♫");
  await page.waitForTimeout(400);
  await page.mouse.up();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-painted-samples")))
    .toBeGreaterThan(2);
  await page.getByRole("button", { name: "Changer d’univers" }).click();
  await page.getByRole("button", { name: "Choisir ABYSSE" }).click();
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  await expect(buttons).toHaveCount(2);
  expect(await buttons.first().locator("img").getAttribute("src")).toBe(
    thumbnail,
  );
  await page.screenshot({ path: "/tmp/growing-bird-brush-menu.png" });
  await page.getByRole("button", { name: "Vue photo", exact: true }).click();
  await expect(menu).toHaveCount(0);
  await expect(page.getByRole("button", { name: /PNG HD/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test("failed additions retain existing brush and can be retried without duplicates", async ({
  page,
}) => {
  let fail = false;
  await page.route("https://api.inaturalist.org/**", (route) =>
    fail
      ? route.abort()
      : route.fulfill({
          json: {
            results: Array.from({ length: 4 }, (_, i) => observation(i + 1)),
          },
        }),
  );
  await page.route("**/api/bird-catalog?**", (route) =>
    route.fulfill({ status: 502, json: { error: "offline" } }),
  );
  await page.route("https://static.inaturalist.org/**", (route) =>
    route.fulfill({ body: wav(), contentType: "audio/wav" }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  const buttons = page.locator(".generated-brush");
  await expect(buttons.first()).toBeEnabled();
  const original = await buttons.first().getAttribute("aria-label");
  fail = true;
  await page.getByRole("button", { name: "Ajouter une brosse" }).click();
  await expect(page.locator(".growing-brush-error")).toContainText(
    "Création impossible",
  );
  await expect(buttons).toHaveCount(1);
  await expect(buttons.first()).toBeEnabled();
  expect(await buttons.first().getAttribute("aria-label")).toBe(original);
  fail = false;
  await page.getByRole("button", { name: "Ajouter une brosse" }).click();
  await expect(buttons).toHaveCount(2);
  await expect(page.locator(".growing-brush-error")).toHaveCount(0);
});

test("different real waveform features build reproducible, different visual profiles", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { analyzeBirdRecording, createBirdBrushProfile } =
      await import("/src/audio/birds/generativeBrush.js");
    const { createWatercolorTexture } =
      await import("/src/engine/createWatercolorTexture.js");
    const buffer = (frequency, pulsed) => {
      const data = new Float32Array(24000);
      for (let i = 0; i < data.length; i++)
        data[i] =
          Math.sin((i / 24000) * frequency * Math.PI * 2) *
          (pulsed ? (i % 4000 < 1000 ? 0.45 : 0.015) : 0.08);
      return { getChannelData: () => data };
    };
    const low = analyzeBirdRecording(buffer(200, false)),
      high = analyzeBirdRecording(buffer(5000, true));
    const recording = { sound: 101, taxon: 1 };
    const a = createBirdBrushProfile(recording, low),
      b = createBirdBrushProfile(recording, high),
      repeat = createBirdBrushProfile(recording, low);
    const x = createWatercolorTexture(
        { color: a.color },
        a.seed,
        64,
        a.acoustic,
      ),
      y = createWatercolorTexture({ color: b.color }, b.seed, 64, b.acoustic);
    const different =
      x.texture.image.toDataURL() !== y.texture.image.toDataURL();
    x.texture.dispose();
    y.texture.dispose();
    return { a, b, repeat, different };
  });
  expect(result.a).toEqual(result.repeat);
  expect(result.b.acoustic.brightness).toBeGreaterThan(
    result.a.acoustic.brightness,
  );
  expect(result.b.acoustic.rhythm).toBeGreaterThan(result.a.acoustic.rhythm);
  expect(result.b.color).not.toBe(result.a.color);
  expect(result.different).toBe(true);
});
