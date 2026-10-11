import { test, expect } from "@playwright/test";

test("camera rendering controls work in both views and reset to natural", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /THREE|WebGL|Shader/.test(m.text()))
      errors.push(m.text());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Rendu", exact: true }).click();
  const canvas = page.locator("#stage canvas");
  await page
    .getByRole("slider", { name: "Contraste", exact: true })
    .fill("1.5");
  await page
    .getByRole("slider", { name: "Saturation", exact: true })
    .fill("1.3");
  await page
    .getByRole("slider", { name: "Seuil d’encre", exact: true })
    .fill("0.4");
  await expect(canvas).toHaveAttribute(
    "data-view-effects",
    JSON.stringify({ contrast: 1.5, saturation: 1.3, threshold: 0.4 }),
  );
  await page
    .getByRole("button", { name: "FPV 360° gyro", exact: true })
    .click();
  await expect(
    page.getByRole("slider", { name: "Contraste", exact: true }),
  ).toHaveValue("1.5");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const name of ["Contraste", "Saturation", "Seuil d’encre"])
    await expect(
      page.getByRole("slider", { name, exact: true }),
    ).toBeInViewport();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Naturel", exact: true }).click();
  await expect(canvas).toHaveAttribute(
    "data-view-effects",
    JSON.stringify({ contrast: 1, saturation: 1, threshold: 0 }),
  );
  expect(errors).toEqual([]);
});

test("postprocessing changes actual pigment pixels, preserves paper and restores neutral output", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createViewEffects } =
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
    const original = read();
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
    effects.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    return { original, edited, restored, resized, paper, filteredPaper };
  });
  expect(result.edited).not.toEqual(result.original);
  expect(result.restored).toEqual(result.original);
  expect(result.resized).toEqual(result.edited);
  expect(
    result.paper
      .slice(0, 3)
      .every((value, i) => Math.abs(value - result.filteredPaper[i]) < 4),
  ).toBe(true);
});
