import { test, expect } from "@playwright/test";
import { importPhoto, photoFile } from "./helpers/localPhotos.js";

test("photo palette and contours transform the actual material independently of audio", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { analyzeNaturePixels, combineNatureProfile } =
      await import("/src/materials/naturePhoto.js");
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

test("local import and camera create different materials without any external request", async ({
  page,
}) => {
  const external = [],
    errors = [];
  page.on("request", (request) => {
    if (
      /^https?:/.test(request.url()) &&
      new URL(request.url()).hostname !== "127.0.0.1" &&
      new URL(request.url()).hostname !== "localhost"
    )
      external.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  const brushes = page.locator(".generated-brush"),
    canvas = page.locator("#stage canvas");
  await expect(brushes.first()).toBeDisabled();
  await expect(page.locator(".growing-brush-hint")).toContainText(
    "première brosse",
  );
  const picker = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Importer une photo", exact: true })
    .click();
  await (await picker).setFiles(photoFile(2));
  await expect(brushes.first()).toBeEnabled();
  const first = await brushes.first().locator("img").getAttribute("src");
  const cameraPicker = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Prendre une photo", exact: true })
    .click();
  await (await cameraPicker).setFiles(photoFile(3));
  await expect(brushes).toHaveCount(2);
  await expect(brushes.nth(1)).toHaveAttribute("aria-pressed", "true");
  expect(await brushes.nth(1).locator("img").getAttribute("src")).not.toBe(
    first,
  );
  await expect(page.locator("input[data-photo-camera]")).toHaveAttribute(
    "capture",
    "environment",
  );
  await page.mouse.move(180, 350);
  await page.mouse.down();
  await expect(canvas).toHaveAttribute("data-nozzle-paint", "true");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-painted-samples")))
    .toBeGreaterThan(2);
  await page.mouse.up();
  await page.locator(".bird-credits summary").click();
  await expect(page.locator(".bird-credits")).toContainText(
    "sans envoi à un serveur",
  );
  await page.getByRole("button", { name: "Vue photo", exact: true }).click();
  await expect(page.getByRole("button", { name: /PNG HD/ })).toBeVisible();
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test("invalid local files preserve the collection and the same file can be picked again", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  await importPhoto(page, 6);
  const brushes = page.locator(".generated-brush");
  await expect(brushes.first()).toBeEnabled();
  const first = await brushes.first().locator("img").getAttribute("src");
  await page.locator("input[data-photo-import]").setInputFiles({
    name: "bad.png",
    mimeType: "image/png",
    buffer: Buffer.from("invalid"),
  });
  await expect(page.locator(".growing-brush-error")).toContainText(
    "Photo illisible",
  );
  await expect(brushes).toHaveCount(1);
  expect(await brushes.first().locator("img").getAttribute("src")).toBe(first);
  await importPhoto(page, 6);
  await expect(brushes).toHaveCount(2);
  await expect(page.locator(".growing-brush-error")).toHaveCount(0);
  expect(await page.locator("input[data-photo-import]").inputValue()).toBe("");
});

test("local decoder validates size and format before decoding and is reproducible", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { readNaturePhoto } = await import("/src/materials/naturePhoto.js");
    const failures = [];
    for (const file of [
      new File(["text"], "x.txt", { type: "text/plain" }),
      new File([new Uint8Array(20 * 1024 * 1024 + 1)], "large.png", {
        type: "image/png",
      }),
    ]) {
      try {
        await readNaturePhoto(file);
      } catch (error) {
        failures.push(error.message);
      }
    }
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    canvas.getContext("2d").fillRect(0, 0, 64, 64);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve));
    const file = new File([blob], "same.png", { type: "image/png" });
    const a = await readNaturePhoto(file),
      b = await readNaturePhoto(file);
    return {
      failures,
      seedA: a.photo.pageid,
      seedB: b.photo.pageid,
      size: a.visual.field.length,
    };
  });
  expect(result.failures[0]).toContain("photographie");
  expect(result.failures[1]).toContain("20 Mo");
  expect(result.seedA).toBe(result.seedB);
  expect(result.size).toBe(8192);
});
