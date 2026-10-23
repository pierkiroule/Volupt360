import { test, expect } from "@playwright/test";

test("six local spatial membranes replace remote photos and freeze on pause", async ({
  page,
}) => {
  const requests = [],
    errors = [];
  page.on("request", (r) => {
    if (/wikimedia|polyhaven/i.test(r.url())) requests.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-resonances", "6");
  await expect(canvas).toHaveAttribute("data-calls", "11");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/three/build/three.module.js");
    const { AbstractResonances } =
      await import("/src/simple/AbstractResonances.ts");
    const { makeWatercolorAtlas } =
      await import("/src/simple/WatercolorAtlas.ts");
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(128, 128);
    const failures = [];
    renderer.debug.onShaderError = (gl, p, v, f) =>
      failures.push(gl.getShaderInfoLog(f) || gl.getProgramInfoLog(p));
    const paper = makeWatercolorAtlas(),
      forms = new AbstractResonances(paper);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("white");
    scene.add(forms.mesh);
    const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
    camera.position.set(0, 18, 10);
    camera.lookAt(0, 18, -5);
    const target = new THREE.WebGLRenderTarget(128, 128);
    renderer.setRenderTarget(target);
    const pixels = new Uint8Array(128 * 128 * 4);
    let minPainted = Infinity;
    const signatures = [];
    for (const ids of [
      ["warm", "water"],
      ["air", "surprise"],
      ["soft", "tired"],
    ]) {
      forms.setPalette(ids);
      forms.update(5, 1, true, true);
      renderer.render(scene, camera);
      renderer.readRenderTargetPixels(target, 0, 0, 128, 128, pixels);
      let painted = 0,
        sum = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) < 240) painted++;
        sum += pixels[i] + pixels[i + 1] * 2 + pixels[i + 2] * 3;
      }
      minPainted = Math.min(minPainted, painted);
      signatures.push(sum);
    }
    const triangles = renderer.info.render.triangles;
    forms.dispose();
    paper.dispose();
    target.dispose();
    renderer.dispose();
    return { failures, minPainted, signatures, triangles };
  });
  expect(result.failures).toEqual([]);
  expect(result.minPainted).toBeGreaterThan(100);
  expect(new Set(result.signatures).size).toBe(3);
  expect(result.triangles).toBe(6144);
  await page.getByRole("button", { name: "Pause" }).click();
  await page.waitForTimeout(250);
  const time = await canvas.getAttribute("data-time");
  await page.waitForTimeout(300);
  expect(await canvas.getAttribute("data-time")).toBe(time);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});
