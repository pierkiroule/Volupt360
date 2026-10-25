import { test, expect } from "@playwright/test";

test("bounded ink batches render distinct worlds, respond to music and release geometry", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const T = await import("/node_modules/three/build/three.module.js");
    const { CalligraphicInk } = await import("/src/simple/CalligraphicInk.ts");
    const { makeWatercolorAtlas } =
      await import("/src/simple/WatercolorAtlas.ts");
    const paper = makeWatercolorAtlas(),
      ink = new CalligraphicInk(paper, true);
    const renderer = new T.WebGLRenderer();
    renderer.setSize(192, 192);
    const failures = [];
    renderer.debug.onShaderError = (gl, p, v, f) =>
      failures.push(gl.getShaderInfoLog(v) + gl.getShaderInfoLog(f));
    const scene = new T.Scene();
    scene.background = new T.Color("white");
    scene.add(ink.group);
    const camera = new T.PerspectiveCamera(70, 1, 0.1, 100);
    camera.position.set(0, 18, 10);
    camera.lookAt(0, 18, -5);
    const target = new T.WebGLRenderTarget(192, 192);
    renderer.setRenderTarget(target);
    const pixels = new Uint8Array(192 * 192 * 4);
    const read = () => {
      renderer.render(scene, camera);
      renderer.readRenderTargetPixels(target, 0, 0, 192, 192, pixels);
      let hash = 2166136261,
        painted = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        hash = Math.imul(hash ^ pixels[i], 16777619) >>> 0;
        if (pixels[i] < 245) painted++;
      }
      return { hash, painted };
    };
    const signatures = [];
    for (const ids of [
      ["warm"],
      ["water"],
      ["air", "night"],
      ["soft", "tired"],
    ]) {
      ink.setPalette(ids);
      ink.update(18, new T.Vector3(), 1, true);
      signatures.push(read());
    }
    ink.update(18, new T.Vector3(1, 1, 1), 1, true);
    const sound = read();
    const frozen = read();
    const calls = renderer.info.render.calls,
      vertices = ink.lines.geometry.attributes.position.count,
      grains = ink.grains.geometry.attributes.position.count;
    ink.update(18, new T.Vector3(), 1, false);
    const hidden = read();
    ink.dispose();
    paper.dispose();
    target.dispose();
    renderer.dispose();
    return {
      failures,
      signatures,
      sound,
      frozen,
      calls,
      vertices,
      grains,
      hidden,
    };
  });
  expect(result.failures).toEqual([]);
  expect(new Set(result.signatures.map((s) => s.hash)).size).toBe(4);
  expect(result.signatures.every((s) => s.painted > 5)).toBe(true);
  expect(result.sound.hash).not.toBe(result.signatures[3].hash);
  expect(result.frozen).toEqual(result.sound);
  expect(result.calls).toBe(2);
  expect(result.vertices).toBe(3072);
  expect(result.grains).toBe(48);
  expect(result.hidden.painted).toBe(0);
});
