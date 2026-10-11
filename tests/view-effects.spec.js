import { test, expect } from "@playwright/test";

test("fixed watercolor grading stays active in both views without rendering controls", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /THREE|WebGL|Shader/.test(m.text()))
      errors.push(m.text());
  });
  await page.goto("/?atelier=mp3");
  await expect(
    page.getByRole("button", { name: "Rendu", exact: true }),
  ).toHaveCount(0);
  const canvas = page.locator("#stage canvas");
  const preset = JSON.stringify({
    contrast: 2.2,
    saturation: 1.45,
    threshold: 0.08,
  });
  await expect(canvas).toHaveAttribute("data-view-effects", preset);
  await page
    .getByRole("button", { name: "FPV 360° gyro", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-view-effects", preset);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("slider")).toHaveCount(0);
  await page.getByRole("button", { name: "FPV drone", exact: true }).click();
  await expect(
    page.getByRole("slider", { name: "Distance du drone" }),
  ).toBeInViewport();
  await page.waitForTimeout(300);
  expect(errors).toEqual([]);
});

test("postprocessing changes actual pigment pixels, preserves paper and restores neutral output", async ({
  page,
}) => {
  await page.goto("/?atelier=mp3");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createViewEffects, DEFAULT_VIEW } =
      await import("/src/engine/createViewEffects.js");
    const renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
    renderer.setSize(32, 32);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const effects = createViewEffects(renderer),
      scene = new THREE.Scene(),
      camera = new THREE.Camera();
    scene.background = new THREE.Color("#a95c72");
    const read = () => {
      effects.render(scene, camera);
      const gl = renderer.getContext();
      const pixels = new Uint8Array(4);
      gl.readPixels(16, 16, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      return Array.from(pixels);
    };
    effects.set({ contrast: 1, saturation: 1, threshold: 0 });
    const original = read();
    effects.set(DEFAULT_VIEW);
    const calibrated = read();
    effects.set({ contrast: 1.6, saturation: 1.4, threshold: 0.5 });
    const edited = read();
    renderer.setSize(48, 48);
    effects.resize();
    const resized = read();
    effects.set({ contrast: 1, saturation: 1, threshold: 0 });
    const restored = read();
    scene.background = new THREE.Color("#f4f0e8");
    const paper = read();
    effects.set({ contrast: 1.8, saturation: 1.8, threshold: 1 });
    const filteredPaper = read();
    const washes = ["#b9bdc9", "#7192b5", "#3d4852", "#445560"].map((hex) => {
      scene.background = new THREE.Color(hex);
      effects.set({ contrast: 1.6, saturation: 1.2, threshold: 0.04 });
      const previous = read();
      effects.set(DEFAULT_VIEW);
      return { previous, intense: read() };
    });
    effects.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    return {
      original,
      edited,
      restored,
      resized,
      paper,
      filteredPaper,
      calibrated,
      washes,
    };
  });
  expect(result.edited).not.toEqual(result.original);
  expect(
    result.calibrated[0] + result.calibrated[1] + result.calibrated[2],
  ).toBeLessThan(result.original[0] + result.original[1] + result.original[2]);
  const brightness = (pixel) =>
    pixel.slice(0, 3).reduce((sum, value) => sum + value, 0);
  expect(brightness(result.washes[0].intense)).toBeLessThan(
    brightness(result.washes[0].previous) - 20,
  );
  const chroma = (pixel) =>
    Math.max(...pixel.slice(0, 3)) - Math.min(...pixel.slice(0, 3));
  expect(chroma(result.washes[1].intense)).toBeGreaterThan(
    chroma(result.washes[1].previous),
  );
  expect(result.washes[2].intense.slice(0, 3).every((value) => value > 0)).toBe(
    true,
  );
  expect(result.washes[2].intense).not.toEqual(result.washes[3].intense);
  expect(result.restored).toEqual(result.original);
  expect(result.resized).toEqual(result.edited);
  expect(
    result.paper
      .slice(0, 3)
      .every((value, i) => Math.abs(value - result.filteredPaper[i]) < 4),
  ).toBe(true);
});
