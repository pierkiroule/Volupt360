import { test, expect } from "@playwright/test";

test("painted gestures become bounded spatial ribbons and respond to audio on the GPU", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/three/build/three.module.js");
    const { spatializeInk } =
      await import("/src/squiggle/AudioInkUniverse.jsx");
    const { createLivingRibbons } =
      await import("/src/squiggle/createLivingRibbons.js");
    const items = spatializeInk([
      {
        emoji: "🌊",
        size: 1.8,
        opacity: 0.8,
        points: [
          { x: -6, z: 0 },
          { x: -2, z: -3 },
          { x: 2, z: 3 },
          { x: 6, z: 0 },
        ],
      },
    ]);
    const { LAND_BRUSHES } = await import("/src/squiggle/landscapeModel.js");
    const field = createLivingRibbons({
      mobile: true,
      maxRibbons: 80,
      spatialInk: true,
      brushes: LAND_BRUSHES.map((b) => ({ id: b.emoji })),
    });
    field.setDocument(items);
    const scene = new THREE.Scene();
    scene.add(field.group);
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 80);
    camera.position.set(0, 6, 12);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(192, 192);
    renderer.setClearColor("#f3ecdc");
    const target = new THREE.WebGLRenderTarget(192, 192);
    renderer.setRenderTarget(target);
    const mesh = field.group.children[0],
      buffer = mesh.geometry.attributes.position.array;
    const age = mesh.geometry.attributes.life.array,
      t = (0.6 - age[2] + 1) * age[1];
    const read = (sound) => {
      field.update(t, sound);
      renderer.render(scene, camera);
      const p = new Uint8Array(192 * 192 * 4);
      renderer.readRenderTargetPixels(target, 0, 0, 192, 192, p);
      return p;
    };
    const quiet = read({ bass: 0, mid: 0, treble: 0, pulse: 0 }),
      loud = read({ bass: 0.85, mid: 0.7, treble: 0.5, pulse: 0.4 });
    let changed = 0;
    for (let i = 0; i < quiet.length; i += 4)
      if (
        Math.abs(quiet[i] - loud[i]) +
          Math.abs(quiet[i + 1] - loud[i + 1]) +
          Math.abs(quiet[i + 2] - loud[i + 2]) >
        8
      )
        changed++;
    const stable = buffer === mesh.geometry.attributes.position.array;
    const path = items[0].worldPoints;
    const opacity = mesh.geometry.attributes.density.array[0];
    field.dispose();
    target.dispose();
    renderer.dispose();
    return { changed, stable, opacity, path };
  });
  expect(result.changed).toBeGreaterThan(20);
  expect(result.stable).toBe(true);
  expect(result.opacity).toBeCloseTo(0.8);
  expect(result.path).toHaveLength(4);
  expect(result.path[0].x).toBeCloseTo(-4.08);
  expect(
    result.path.every((p) => Object.values(p).every(Number.isFinite)),
  ).toBe(true);
});

test("enter an immersive universe without a ground plane, pause and export", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /shader|WebGL|THREE/i.test(m.text()))
      errors.push(m.text());
  });
  await page.goto("/");
  const disk = page.locator(".landscape-disk canvas");
  await expect(disk).toHaveAttribute("data-landscape-mode", "disk");
  const b = await disk.boundingBox();
  await page.mouse.move(b.x + b.width * 0.2, b.y + b.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * 0.8, b.y + b.height * 0.5, {
    steps: 8,
  });
  await page.mouse.up();
  await page.getByRole("button", { name: "Entrer dans mon univers" }).click();
  const canvas = page.locator(".landscape-immersive canvas");
  await expect(canvas).toHaveAttribute(
    "data-universe-style",
    "spatial-watercolor-audiovisualizer",
  );
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-image-veils")))
    .toBeGreaterThan(0);
  await page
    .getByRole("button", { name: "Mettre les animations en pause" })
    .click();
  await page.waitForTimeout(100);
  const time = await canvas.getAttribute("data-animation-time");
  await page.waitForTimeout(150);
  await expect(canvas).toHaveAttribute("data-animation-time", time);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Photographier ce regard" }).click();
  expect((await download).suggestedFilename()).toMatch(/png$/);
  await page.screenshot({ path: "/tmp/audio-ink-universe.png" });
  expect(errors).toEqual([]);
});
