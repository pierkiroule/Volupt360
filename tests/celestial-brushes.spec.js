import { test, expect } from "@playwright/test";
test.use({ hasTouch: true });

test("all eighteen brush geometries render generated watercolor parameters in WebGL", async ({
  page,
}) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.route("https://api.inaturalist.org/**", (route) =>
    route.fulfill({ json: { results: [] } }),
  );
  await page.goto("/");
  const output = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { BRUSHES, createBrushStroke, disposeMark } =
      await import("/src/engine/brushes.js");
    const { createWatercolorTexture } =
      await import("/src/engine/createWatercolorTexture.js");
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(128, 128);
    renderer.setClearColor(0x000000, 0);
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.set(0, 3, 16);
    camera.lookAt(0, 0, 0);
    const scene = new THREE.Scene(),
      target = new THREE.WebGLRenderTarget(128, 128),
      pixels = new Uint8Array(128 * 128 * 4),
      results = [];
    renderer.setRenderTarget(target);
    for (const [i, brush] of BRUSHES.entries()) {
      const binding = createWatercolorTexture(brush, i + 31, 128);
      const stroke = createBrushStroke(brush.id, {
        dynamics: { opacity: 0.8, width: 1.1 },
        seed: 0.1,
        color: new THREE.Color(brush.color),
        texture: binding,
      });
      for (let n = 0; n < 28; n++)
        stroke.append({
          position: new THREE.Vector3(
            -3 + n * 0.22,
            Math.sin(n * 0.2) * 0.6,
            0,
          ),
          direction: new THREE.Vector3(1, 0, 0),
          side: new THREE.Vector3(0, 1, 0),
          up: new THREE.Vector3(0, 0, 1),
          velocity: new THREE.Vector3(1, 0, 0),
          energy: 0.65,
          low: 0.3,
          high: 0.4,
          motion: 0.4,
          accent: 0.5,
          time: n * 0.12,
          density: 0.8,
        });
      stroke.finish();
      stroke.update?.(0.1, { energy: 0.5, low: 0.3, high: 0.3 });
      scene.add(stroke.group);
      renderer.render(scene, camera);
      renderer.readRenderTargetPixels(target, 0, 0, 128, 128, pixels);
      results.push({
        id: brush.id,
        visible: pixels.filter((value, index) => index % 4 === 3 && value > 5)
          .length,
      });
      scene.remove(stroke.group);
      disposeMark(stroke.group);
      binding.texture.dispose();
    }
    target.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    return results;
  });
  expect(output).toHaveLength(18);
  for (const brush of output)
    expect(brush.visible, brush.id).toBeGreaterThan(3);
  expect(errors).toEqual([]);
});
