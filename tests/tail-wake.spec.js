import { test, expect } from "@playwright/test";

test("tail emitter follows the articulated bird and deposits retain their own unfolding time", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createOizo } = await import("/src/sonoizo/createOizo.js");
    const { createBrushStroke, disposeMark } =
      await import("/src/engine/brushes.js");
    const bird = createOizo(),
      direction = new THREE.Vector3(0.5, 0.3, 1).normalize(),
      side = new THREE.Vector3()
        .crossVectors(direction, new THREE.Vector3(0, 1, 0))
        .normalize(),
      up = new THREE.Vector3().crossVectors(side, direction);
    bird.update({
      time: 0,
      position: new THREE.Vector3(8, 3, -2),
      direction,
      side,
      up,
    });
    const tail = bird.getTailPosition(new THREE.Vector3()),
      offset = tail.clone().sub(bird.group.position);
    const stroke = createBrushStroke("voiles", {
      seed: 1,
      color: new THREE.Color("#658c99"),
    });
    for (let i = 0; i < 8; i++)
      stroke.append({
        position: tail.clone().addScaledVector(direction, -i * 0.4),
        direction,
        side,
        up,
        time: i * 0.1,
        energy: 0.5,
        low: 0.3,
        density: 1,
        wake: true,
        depositionTime: 10 + i * 0.1,
      });
    const mesh = stroke.group.children[0],
      births = Array.from(mesh.geometry.attributes.aBirth.array).slice(
        0,
        stroke.count * 13,
      ),
      centers = mesh.geometry.attributes.aTrailCenter.array;
    const firstCenter = Array.from(centers.slice(0, 3));
    stroke.finish();
    disposeMark(stroke.group);
    bird.dispose();
    return {
      behind: offset.dot(direction),
      distance: offset.length(),
      tail: tail.toArray(),
      firstCenter,
      min: Math.min(...births),
      max: Math.max(...births),
    };
  });
  expect(result.behind).toBeLessThan(-0.3);
  expect(result.distance).toBeLessThan(0.5);
  expect(result.firstCenter).toEqual(
    result.tail.map((v) => expect.closeTo(v, 5)),
  );
  expect(result.min).toBeCloseTo(10);
  expect(result.max).toBeGreaterThan(10.6);
});

test("GPU wake grows from a fine thread into ribbons and scattered pigment", async ({
  page,
}) => {
  await page.goto("/");
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const results = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createBrushStroke, disposeMark } =
      await import("/src/engine/brushes.js");
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(128, 128);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("white");
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.set(0, 0, 9);
    camera.lookAt(0, 0, 0);
    const target = new THREE.WebGLRenderTarget(128, 128);
    renderer.setRenderTarget(target);
    const results = [];
    for (const id of ["voiles", "brumes", "lagons"]) {
      const stroke = createBrushStroke(id, {
        seed: 3,
        color: new THREE.Color("#326c8b"),
      });
      scene.add(stroke.group);
      for (let i = 0; i < 20; i++)
        stroke.append({
          position: new THREE.Vector3(-2 + i * 0.2, 0, 0),
          direction: new THREE.Vector3(1, 0, 0),
          side: new THREE.Vector3(0, 1, 0),
          up: new THREE.Vector3(0, 0, 1),
          time: i * 0.1,
          energy: 0.6,
          low: 0.3,
          density: 1,
          motion: 0.5,
          wake: true,
          depositionTime: 0,
        });
      stroke.finish();
      function area(time) {
        stroke.group.traverse((o) => {
          if (o.material?.uniforms?.uWakeClock)
            o.material.uniforms.uWakeClock.value = time;
        });
        renderer.render(scene, camera);
        const pixels = new Uint8Array(128 * 128 * 4);
        renderer.readRenderTargetPixels(target, 0, 0, 128, 128, pixels);
        let count = 0;
        for (let i = 0; i < pixels.length; i += 4)
          if (Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) < 245) count++;
        return count;
      }
      results.push({ id, young: area(0.08), mature: area(4.5) });
      disposeMark(stroke.group);
    }
    target.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    return results;
  });
  for (const result of results) {
    expect(result.mature, result.id).toBeGreaterThan(30);
    expect(result.mature, result.id).toBeGreaterThan(result.young * 2);
  }
  expect(errors).toEqual([]);
});
