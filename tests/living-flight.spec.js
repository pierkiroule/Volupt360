import { test, expect } from "@playwright/test";

test("FPV stays close through silence and growing bounds, with manual zoom still available", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createCameraRig } = await import("/src/engine/createCameraRig.js");
    const camera = new THREE.PerspectiveCamera(78, 1, 0.08, 400);
    camera.position.set(0, 0, 12);
    const canvas = document.createElement("canvas"),
      landscape = new THREE.Group();
    const state = {
      position: new THREE.Vector3(),
      direction: new THREE.Vector3(0, 0, 1),
      velocity: new THREE.Vector3(0, 0, 3),
      bounds: { center: new THREE.Vector3(), radius: 4 },
      active: true,
      energy: 0.8,
      motion: 0.5,
      phrase: 0,
      progress: 0,
    };
    const rig = createCameraRig(
      camera,
      canvas,
      landscape,
      () => state,
      () => {},
    );
    for (let i = 0; i < 360; i++) rig.update(1 / 60);
    const near = camera.position.length(),
      fov = camera.fov;
    state.active = false;
    state.energy = 0;
    state.bounds.radius = 500;
    state.phrase = 9;
    for (let i = 0; i < 600; i++) rig.update(1 / 60);
    const quiet = camera.position.length(),
      quietFov = camera.fov;
    rig.setDistance(0.5);
    for (let i = 0; i < 240; i++) rig.update(1 / 60);
    const manual = camera.position.length();
    rig.dispose();
    return { near, quiet, manual, fov, quietFov };
  });
  expect(result.near).toBeLessThan(8);
  expect(result.quiet).toBeCloseTo(result.near, 2);
  expect(result.quietFov).toBeCloseTo(result.fov, 2);
  expect(result.manual).toBeGreaterThan(30);
});

test("the six landscape brushes render evolving and music-reactive matter without WebGL errors", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  const results = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createBrushStroke, disposeMark } =
      await import("/src/engine/brushes.js");
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(96, 96);
    const target = new THREE.WebGLRenderTarget(96, 96),
      scene = new THREE.Scene();
    scene.background = new THREE.Color("#f4f0e8");
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 2, 9);
    camera.lookAt(0, 0, 0);
    renderer.setRenderTarget(target);
    const results = [];
    const { LANDSCAPE_BRUSHES } =
      await import("/src/materials/landscapePalette.js");
    const { createWatercolorTexture } =
      await import("/src/engine/createWatercolorTexture.js");
    for (const brush of LANDSCAPE_BRUSHES) {
      const texture = createWatercolorTexture(
        { color: brush.color, kind: brush.textureKind },
        brush.seed,
        128,
      );
      const stroke = createBrushStroke(brush.baseId, {
        seed: 31,
        color: new THREE.Color(brush.color),
        texture,
        dynamics: brush,
      });
      for (let i = 0; i < 24; i++)
        stroke.append({
          position: new THREE.Vector3(
            (i / 23 - 0.5) * 4,
            Math.sin(i * 0.3) * 0.6,
            0,
          ),
          direction: new THREE.Vector3(1, 0, 0),
          up: new THREE.Vector3(0, 1, 0),
          side: new THREE.Vector3(0, 0, 1),
          time: i * 0.12,
          energy: 0.6,
          low: 0.4,
          high: 0.3,
          rms: 0.1,
          motion: 0.4,
          density: 1,
          freq: 1200,
          progress: i / 24,
        });
      stroke.finish();
      scene.add(stroke.group);
      function draw(time, energy) {
        stroke.update?.(0.1, { energy, low: energy, pulse: energy });
        stroke.group.traverse((object) => {
          const u = object.material?.uniforms;
          if (!u) return;
          for (const [key, value] of Object.entries({
            uTime: time,
            uAge: 4,
            uParticleTime: time,
            uAudioEnergy: energy,
            uAudioLow: energy,
            uAudioPulse: energy,
            uPigment: 1.05 + energy * 1.4,
          }))
            if (u[key]) u[key].value = value;
        });
        renderer.render(scene, camera);
        const pixels = new Uint8Array(96 * 96 * 4);
        renderer.readRenderTargetPixels(target, 0, 0, 96, 96, pixels);
        return pixels;
      }
      const quiet = draw(5, 0),
        loud = draw(5, 1),
        later = draw(35, 1);
      const difference = (a, b) =>
        a.reduce((sum, value, i) => sum + Math.abs(value - b[i]), 0);
      results.push({
        id: brush.id,
        sound: difference(quiet, loud),
        evolution: difference(loud, later),
      });
      disposeMark(stroke.group);
      texture.texture.dispose();
    }
    target.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    return results;
  });
  expect(results).toHaveLength(6);
  for (const result of results) {
    expect(result.sound, `${result.id}: musical resonance`).toBeGreaterThan(0);
    expect(result.evolution, `${result.id}: evolution`).toBeGreaterThan(0);
  }
  expect(errors).toEqual([]);
});
