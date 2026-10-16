import { test, expect } from "@playwright/test";

test("one landscape and a simplified workshop retain refinement controls", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /Choisir (ÉTHER|ABYSSE|MÉMOIRE)/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  await page
    .getByRole("button", { name: "Créer une brosse", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Forme", { exact: true })).toBeVisible();
  await expect(dialog.getByLabel("Matière", { exact: true })).toBeVisible();
  await expect(dialog.getByLabel("Épaisseur")).not.toBeVisible();
  await dialog.getByText("Affiner", { exact: true }).click();
  await expect(dialog.getByLabel("Épaisseur")).toBeVisible();
  await dialog
    .getByRole("button", { name: "Créer la brosse", exact: true })
    .click();
  await expect(page.locator(".generated-brush")).toBeEnabled();
  const canvas = page.locator("#stage canvas");
  await expect
    .poll(async () => {
      const values = (
        (await canvas.getAttribute("data-oizo-screen")) || "2,2,2"
      )
        .split(",")
        .map(Number);
      return (
        Math.abs(values[0]) < 0.85 &&
        Math.abs(values[1]) < 0.85 &&
        values[2] < 1
      );
    })
    .toBe(true);
  await page.mouse.move(400, 350);
  await page.mouse.down();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-painted-samples")))
    .toBeGreaterThan(5);
  await page.mouse.up();
  await page.screenshot({ path: "/tmp/living-resonant-flight.png" });
});

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
  expect(result.near).toBeLessThan(5.5);
  expect(result.quiet).toBeCloseTo(result.near, 2);
  expect(result.quietFov).toBeCloseTo(result.fov, 2);
  expect(result.manual).toBeGreaterThan(30);
});

test("all brush families render evolving and music-reactive matter without WebGL errors", async ({
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
    const { BRUSHES, createBrushStroke, disposeMark } =
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
    for (const brush of BRUSHES) {
      const stroke = createBrushStroke(brush.id, {
        seed: 31,
        color: new THREE.Color("#376f87"),
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
    }
    target.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    return results;
  });
  expect(results).toHaveLength(18);
  for (const result of results) {
    expect(result.sound, `${result.id}: musical resonance`).toBeGreaterThan(0);
    expect(result.evolution, `${result.id}: evolution`).toBeGreaterThan(0);
  }
  expect(errors).toEqual([]);
});
