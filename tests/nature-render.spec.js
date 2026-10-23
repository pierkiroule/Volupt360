import { test, expect } from "@playwright/test";

test("the actual photograph shader compiles and displays image pixels", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/three/build/three.module.js");
    const { NatureDiscs } = await import("/src/simple/NatureDiscs.ts");
    const { makeWatercolorAtlas } =
      await import("/src/simple/WatercolorAtlas.ts");
    const renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
    renderer.setSize(128, 128);
    const failures = [];
    renderer.debug.onShaderError = (gl, program, vertex, fragment) =>
      failures.push(
        gl.getShaderInfoLog(fragment) || gl.getProgramInfoLog(program),
      );
    const paper = makeWatercolorAtlas(),
      photos = new NatureDiscs(paper);
    const source = document.createElement("canvas");
    source.width = source.height = 256;
    const ctx = source.getContext("2d");
    ctx.fillStyle = "#107030";
    ctx.fillRect(0, 0, 256, 256);
    const bitmap = await createImageBitmap(source);
    photos.setPhotos([{ bitmap, credit: {} }]);
    bitmap.close();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(Math.sin(0.25) * 7, 18, 0);
    camera.lookAt(Math.sin(0.25) * 7, 18, -5 - Math.cos(0.25) * 5);
    photos.update(0, 1, camera, true, true);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("white");
    scene.add(photos.mesh);
    const target = new THREE.WebGLRenderTarget(128, 128);
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    const pixel = new Uint8Array(4);
    renderer.readRenderTargetPixels(target, 64, 64, 1, 1, pixel);
    const output = {
      failures,
      pixel: [...pixel],
      calls: renderer.info.render.calls,
    };
    target.dispose();
    photos.dispose();
    paper.dispose();
    renderer.dispose();
    return output;
  });
  expect(result.failures).toEqual([]);
  expect(result.calls).toBe(1);
  // The green photographic center must survive the watercolor blend over white.
  expect(result.pixel[1]).toBeGreaterThan(result.pixel[0] + 10);
  expect(result.pixel[1]).toBeGreaterThan(result.pixel[2] + 10);
  expect(result.pixel[0]).toBeLessThan(240);
});
