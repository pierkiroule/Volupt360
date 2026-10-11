import { test, expect } from "@playwright/test";
import { materialGrammar } from "../src/engine/MaterialGrammar.js";

test("grammar handles silence, invalid input and acoustic variation without changing input", () => {
  const input = { energy: 0.7, flux: 0.5, freq: 3200, rms: 0.08 };
  const copy = { ...input };
  const output = materialGrammar(input);
  expect(input).toEqual(copy);
  expect(output.silence).toBe(false);
  expect(output.opacity).toBeGreaterThan(materialGrammar({ rms: 0 }).opacity);
  expect(
    materialGrammar({ energy: Infinity, flux: NaN, freq: -20 }).profile,
  ).toBe(0);
  expect(
    materialGrammar({ energy: 1, flux: 1, freq: 6000 }).granulation,
  ).toBeGreaterThan(materialGrammar({ freq: 100 }).granulation);
});

test("seeded RGBA cache never evicts live masks, stays bounded and disposes resources", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { TextureFactory } = await import("/src/engine/TextureFactory.js");
    const factory = new TextureFactory({ size: 64, maxEntries: 2 });
    const key = factory.prepare({ seed: 42 });
    const first = factory.acquire(key);
    let disposed = 0;
    first.binding.texture.addEventListener("dispose", () => disposed++);
    const pixels = Array.from(
      first.binding.texture.image.getContext("2d").getImageData(0, 0, 64, 64)
        .data,
    );
    const key2 = factory.prepare({ seed: 43 });
    const second = factory.acquire(key2);
    const blocked = factory.prepare({ seed: 44 });
    const generationCount = factory.stats.generated;
    for (let i = 0; i < 1000; i++) {
      const lease = factory.acquire(key);
      lease.release();
    }
    const unchanged = factory.stats.generated === generationCount;
    first.release();
    first.release();
    const key3 = factory.prepare({ seed: 44 });
    second.release();
    const restored = factory.prepare({ seed: 42 });
    const again = factory.acquire(restored);
    const same =
      JSON.stringify(pixels) ===
      JSON.stringify(
        Array.from(
          again.binding.texture.image
            .getContext("2d")
            .getImageData(0, 0, 64, 64).data,
        ),
      );
    const alpha = pixels.filter((_, i) => i % 4 === 3);
    const hasTransparency =
      alpha.some((v) => v === 0) &&
      alpha.some((v) => v > 50) &&
      alpha.some((v) => v > 0 && v < 50);
    again.release();
    const stats = factory.stats;
    factory.dispose();
    factory.dispose();
    return {
      blocked,
      unchanged,
      same,
      hasTransparency,
      stats,
      final: factory.stats,
      disposed,
      key3: !!key3,
    };
  });
  expect(result.blocked).toBeNull();
  expect(result.unchanged).toBe(true);
  expect(result.same).toBe(true);
  expect(result.hasTransparency).toBe(true);
  expect(result.stats.entries).toBe(2);
  expect(result.stats.leases).toBe(0);
  expect(result.final.entries).toBe(0);
  expect(result.final.generated).toBe(result.final.disposed);
  expect(result.disposed).toBe(1);
  expect(result.key3).toBe(true);
});

test("generative adapter affects only Éclats and all its leases are releasable", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createGenerativeMaterials } =
      await import("/src/engine/createGenerativeMaterials.js");
    const adapter = createGenerativeMaterials();
    const unaffected = [
      "voiles",
      "falaises",
      "corolles",
      "filaments",
      "brumes",
    ].every((id) => adapter.acquire(id, { energy: 1 }) === null);
    const leases = Array.from({ length: 1000 }, (_, i) =>
      adapter.acquire("lagons", { energy: (i % 4) / 3, flux: 0.4, freq: 1200 }),
    );
    const before = adapter.stats;
    leases.forEach((l) => l.release());
    adapter.dispose();
    return { unaffected, before, after: adapter.stats };
  });
  expect(result.unaffected).toBe(true);
  expect(result.before.entries).toBe(4);
  expect(result.before.generated).toBe(4);
  expect(result.before.leases).toBe(1000);
  expect(result.after.entries).toBe(0);
  expect(result.after.generated).toBe(result.after.disposed);
  expect(errors).toEqual([]);
});

test("real MP3 playback preserves disabled behavior and releases generated masks on reset", async ({
  page,
}) => {
  const { ENABLE_GENERATIVE_TEXTURES } =
    await import("../src/engine/generativeConfig.js");
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /WebGL|THREE|Shader/.test(m.text()))
      errors.push(m.text());
  });
  await page.goto("/");
  const canvas = page.locator("canvas");
  await page.getByRole("button", { name: "Éclats", exact: true }).click();
  await page
    .getByLabel("Importer un fichier audio")
    .setInputFiles("tests/fixtures/tone.mp3");
  await expect(
    page.getByRole("button", { name: "Mettre en pause" }),
  ).toBeVisible();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-painted-samples")))
    .toBeGreaterThan(5);
  if (ENABLE_GENERATIVE_TEXTURES) {
    await expect
      .poll(async () =>
        Number(await canvas.getAttribute("data-generative-strokes")),
      )
      .toBeGreaterThan(0);
    const stats = JSON.parse(
      await canvas.getAttribute("data-generative-textures"),
    );
    expect(stats.generated).toBe(4);
    expect(stats.entries).toBe(4);
    await page.getByRole("button", { name: "Voiles", exact: true }).click();
    await page
      .getByLabel("Importer un fichier audio")
      .setInputFiles("tests/fixtures/tone.mp3");
    await expect
      .poll(
        async () =>
          JSON.parse(await canvas.getAttribute("data-generative-textures"))
            .leases,
      )
      .toBe(0);
  } else {
    await expect(canvas).not.toHaveAttribute("data-generative-textures");
    await expect(canvas).toHaveAttribute("data-textured-strokes", "0");
  }
  await page.getByRole("button", { name: "Mettre en pause" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(errors).toEqual([]);
});
