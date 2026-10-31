import { test, expect } from "@playwright/test";

test("local GPU encounters vary with choices, respond smoothly and dispose resources", async ({
  page,
}, info) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { EmotionalResonance, RESONANCE_PROFILES } =
      await import("/src/simple/EmotionalResonance.ts");
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(400, 400);
    document.body.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#b8c8d4");
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 18, 7);
    camera.lookAt(0, 18, -5);
    const resonance = new EmotionalResonance(true);
    scene.add(resonance.group);
    const shapes = Object.keys(RESONANCE_PROFILES).map((id) => {
      resonance.setPalette([id]);
      const u = resonance.group.children[0].children[0].material.uniforms;
      return [
        u.color.value.getHex(),
        u.curl.value,
        u.drift.value,
        u.speed.value,
      ];
    });
    resonance.setPalette(["night", "water"]);
    resonance.update(0, camera, 0);
    renderer.render(scene, camera);
    const memory = { ...renderer.info.memory };
    camera.position.copy(resonance.group.children[0].position);
    for (let i = 1; i <= 60; i++) resonance.update(i / 30, camera, 0.8);
    const near = resonance.inspect();
    resonance.update(2, camera, 0);
    const frozen = resonance.inspect();
    camera.position.set(0, 18, 7);
    camera.lookAt(0, 18, -5);
    renderer.render(scene, camera);
    const after = { ...renderer.info.memory };
    resonance.dispose();
    renderer.render(scene, camera);
    const disposed = { ...renderer.info.memory };
    renderer.dispose();
    renderer.domElement.remove();
    return { shapes, near, frozen, memory, after, disposed };
  });
  expect(new Set(result.shapes.map((s) => JSON.stringify(s))).size).toBe(12);
  expect(result.near.presence[0]).toBeGreaterThan(0.8);
  expect(result.frozen.presence).toEqual(result.near.presence);
  expect(result.after).toEqual(result.memory);
  expect(result.disposed.geometries).toBe(0);
  expect(result.after.textures).toBe(0);
});
