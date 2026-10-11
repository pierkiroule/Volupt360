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

test("generated ink mask visibly changes actual WebGL pixels without affecting other brushes", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createBrushStroke, disposeMark } =
      await import("/src/engine/brushes.js");
    const { createGenerativeMaterials } =
      await import("/src/engine/createGenerativeMaterials.js");
    const adapter = createGenerativeMaterials();
    const lease = adapter.acquire("lagons", {
      energy: 1,
      flux: 0.8,
      freq: 4000,
    });
    const renderer = new THREE.WebGLRenderer({ antialias: false });
    const target = new THREE.WebGLRenderTarget(192, 192);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f4f0e8");
    const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 30);
    camera.position.set(0, 0, 12);
    camera.lookAt(0, 0, 0);
    renderer.setRenderTarget(target);
    const stroke = createBrushStroke("lagons", {
      seed: 1,
      color: new THREE.Color("#211f25"),
    });
    stroke.append({
      position: new THREE.Vector3(),
      side: new THREE.Vector3(1, 0, 0),
      up: new THREE.Vector3(0, 1, 0),
      direction: new THREE.Vector3(0, 0, 1),
      energy: 1,
      motion: 1,
      time: 1,
    });
    scene.add(stroke.group);
    const read = () => {
      renderer.render(scene, camera);
      const pixels = new Uint8Array(192 * 192 * 4);
      renderer.readRenderTargetPixels(target, 0, 0, 192, 192, pixels);
      return pixels;
    };
    const before = read();
    stroke.setTexture(lease.binding);
    const repeat = stroke.group.children[0].material.uniforms.uMaskRepeat.value;
    const after = read();
    let changed = 0,
      inkBefore = 0,
      inkAfter = 0;
    for (let i = 0; i < before.length; i += 4) {
      if (
        Math.abs(before[i] - after[i]) +
          Math.abs(before[i + 1] - after[i + 1]) +
          Math.abs(before[i + 2] - after[i + 2]) >
        8
      )
        changed++;
      if (before[i] < 210) inkBefore++;
      if (after[i] < 210) inkAfter++;
    }
    disposeMark(stroke.group);
    lease.release();
    adapter.dispose();
    target.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    return { changed, inkBefore, inkAfter, repeat };
  });
  expect(result.repeat).toBe(1);
  expect(result.changed).toBeGreaterThan(100);
  expect(result.inkBefore).toBeGreaterThan(100);
  expect(result.inkAfter).toBeGreaterThan(20);
});
