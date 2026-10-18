import { test, expect } from "@playwright/test";

test("six watercolor and ink brushes respond within their pigment and dry without rigid transforms", async ({
  page,
}) => {
  await page.goto("/");
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const results = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { CHILL_BRUSHES } = await import("/src/chill/chillConfig.js");
    const { createBrushStroke, disposeMark } =
      await import("/src/engine/brushes.js");
    const { createWatercolorTexture } =
      await import("/src/engine/createWatercolorTexture.js");
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(128, 128);
    const target = new THREE.WebGLRenderTarget(128, 128);
    renderer.setRenderTarget(target);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f3eee3");
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 1, 9);
    camera.lookAt(0, 0, 0);
    const results = [];
    for (const profile of CHILL_BRUSHES) {
      const binding = createWatercolorTexture(
        { color: profile.color, kind: profile.textureKind },
        profile.seed,
        128,
      );
      const stroke = createBrushStroke(profile.baseId, {
        seed: profile.seed % 100,
        color: new THREE.Color(profile.color),
        texture: binding,
        dynamics: profile,
      });
      scene.add(stroke.group);
      for (let i = 0; i < 24; i++)
        stroke.append({
          position: new THREE.Vector3(
            -3 + i * 0.25,
            Math.sin(i * 0.3) * 0.4,
            0,
          ),
          direction: new THREE.Vector3(1, 0, 0),
          side: new THREE.Vector3(0, 1, 0),
          up: new THREE.Vector3(0, 0, 1),
          velocity: new THREE.Vector3(2, 0, 0),
          time: i * 0.12,
          energy: 0.6,
          low: 0.4,
          high: 0.3,
          density: 1,
          motion: 0.5,
          wake: true,
          depositionTime: i * 0.12,
        });
      stroke.finish();
      function draw(energy, moisture, age) {
        stroke.group.traverse((o) => {
          const u = o.material?.uniforms;
          if (u)
            for (const [key, value] of Object.entries({
              uTime: 8,
              uWakeClock: age,
              uAudioEnergy: energy,
              uAudioLow: energy,
              uAudioPulse: energy,
              uPigment: 1.4,
              uMoisture: moisture,
            }))
              if (u[key]) u[key].value = value;
        });
        renderer.render(scene, camera);
        const pixels = new Uint8Array(128 * 128 * 4);
        renderer.readRenderTargetPixels(target, 0, 0, 128, 128, pixels);
        return pixels;
      }
      const quiet = draw(0, 0.8, 8),
        loud = draw(1, 0.8, 8),
        dry = draw(0, 0.1, 80),
        diff = (a, b) => a.reduce((sum, x, i) => sum + Math.abs(x - b[i]), 0);
      results.push({
        name: profile.name,
        sound: diff(quiet, loud),
        drying: diff(quiet, dry),
        fixed:
          stroke.group.position.length() === 0 &&
          stroke.group.scale.equals(new THREE.Vector3(1, 1, 1)),
      });
      disposeMark(stroke.group);
      binding.texture.dispose();
    }
    target.dispose();
    renderer.dispose();
    return results;
  });
  expect(results).toHaveLength(6);
  for (const r of results) {
    expect(r.sound, r.name).toBeGreaterThan(0);
    expect(r.drying, r.name).toBeGreaterThan(0);
    expect(r.fixed, r.name).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("spectral responses keep a bounded moisture memory and distinct brush envelopes", async ({
  page,
}) => {
  await page.goto("/");
  const r = await page.evaluate(async () => {
    const { createMaterialResponse } =
      await import("/src/engine/createMaterialResponse.js");
    const wet = createMaterialResponse("voiles", 4),
      dry = createMaterialResponse("filaments", 9);
    let a, b;
    for (let i = 0; i < 600; i++) {
      a = wet({ bands: [0.9, 0, 0, 0.1, 0, 0], energy: 0.3 }, 1 / 60);
      b = dry({ bands: [0.9, 0, 0, 0.1, 0, 0], energy: 0.3 }, 1 / 60);
    }
    const before = a.moisture,
      contrast = Math.abs(a.energy - b.energy);
    for (let i = 0; i < 3600; i++)
      a = wet({ bands: [0, 0, 0, 0, 0, 0] }, 1 / 60);
    return { before, after: a.moisture, contrast };
  });
  expect(r.before).toBeLessThanOrEqual(1);
  expect(r.after).toBeGreaterThanOrEqual(0);
  expect(r.after).toBeLessThan(r.before);
  expect(r.contrast).toBeGreaterThan(0.1);
});
