import { test, expect } from "@playwright/test";

test("six added brushes have distinct bounded geometry, visible WebGL pigment and complete fading", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /WebGL|THREE|Shader/.test(m.text()))
      errors.push(m.text());
  });
  await page.goto("/");
  const results = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { BRUSHES, createBrushStroke, disposeMark } =
      await import("/src/engine/brushes.js");
    const { createGenerativeMaterials } =
      await import("/src/engine/createGenerativeMaterials.js");
    const adapter = createGenerativeMaterials(),
      renderer = new THREE.WebGLRenderer();
    const target = new THREE.WebGLRenderTarget(192, 192);
    renderer.setRenderTarget(target);
    const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 40);
    camera.position.set(0, 0, 15);
    camera.lookAt(0, 0, 0);
    const output = [];
    for (const id of [
      "bulles",
      "aurore",
      "calligraphie",
      "network",
      "dilution",
      "echo",
    ]) {
      const definition = BRUSHES.find((b) => b.id === id),
        lease = adapter.acquire(id, { energy: 0.9, flux: 0.6, freq: 3000 });
      const stroke = createBrushStroke(id, {
        seed: 2,
        color: new THREE.Color(definition.color),
        texture: lease.binding,
      });
      for (let i = 0; i < 24; i++)
        stroke.append({
          position: new THREE.Vector3(
            -2 + i * 0.17,
            Math.sin(i * 0.2) * 0.5,
            0,
          ),
          direction: new THREE.Vector3(1, 0, 0),
          side: new THREE.Vector3(0, 0, 1),
          up: new THREE.Vector3(0, 1, 0),
          time: i * 0.15,
          energy: 0.8,
          low: 0.4,
          high: 0.6,
          motion: 0.4,
          density: 1,
        });
      stroke.finish();
      const scene = new THREE.Scene();
      scene.background = new THREE.Color("white");
      scene.add(stroke.group);
      renderer.render(scene, camera);
      const pixels = new Uint8Array(192 * 192 * 4);
      renderer.readRenderTargetPixels(target, 0, 0, 192, 192, pixels);
      let visible = 0,
        colorful = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) < 235) visible++;
        if (
          Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) -
            Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) >
          20
        )
          colorful++;
      }
      output.push({
        id,
        meshes: stroke.group.children.length,
        type: stroke.group.children[0].geometry.type,
        visible,
        colorful,
        vertices: stroke.group.children[0].geometry.attributes.position.count,
        finite: stroke.group.children.every((mesh) =>
          Array.from(mesh.geometry.attributes.position.array).every(
            Number.isFinite,
          ),
        ),
        echoSeparation:
          id === "echo"
            ? new THREE.Vector3()
                .fromBufferAttribute(
                  stroke.group.children[0].geometry.attributes.position,
                  200,
                )
                .distanceTo(
                  new THREE.Vector3().fromBufferAttribute(
                    stroke.group.children[2].geometry.attributes.position,
                    200,
                  ),
                )
            : 0,
      });
      stroke.group.traverse((object) => {
        if (object.material?.uniforms) object.material.uniforms.uFade.value = 0;
      });
      renderer.render(scene, camera);
      renderer.readRenderTargetPixels(target, 0, 0, 192, 192, pixels);
      output[output.length - 1].fullyFaded = pixels.every(
        (value) => value === 255,
      );
      disposeMark(stroke.group);
      output[output.length - 1].remainingGeometries =
        renderer.info.memory.geometries;
      lease.release();
    }
    adapter.dispose();
    target.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    return output;
  });
  for (const result of results) {
    expect(result.visible).toBeGreaterThan(100);
    expect(result.finite).toBe(true);
    expect(result.fullyFaded).toBe(true);
    expect(result.remainingGeometries).toBe(0);
  }
  expect(results[0].type).toBe("SphereGeometry");
  expect(results[0].meshes).toBe(8);
  expect(results[0].colorful).toBeGreaterThan(30);
  expect(results[1].meshes).toBe(3);
  expect(results[1].colorful).toBeGreaterThan(100);
  expect(results[2].meshes).toBe(1);
  expect(results[3].meshes).toBe(1);
  expect(results[3].vertices).toBeGreaterThan(500);
  expect(results[3].vertices).toBeLessThanOrEqual(2808);
  expect(results[4].meshes).toBe(2);
  expect(results[5].meshes).toBe(3);
  expect(results[5].echoSeparation).toBeGreaterThan(0.5);
  expect(errors).toEqual([]);
});
