import { test, expect } from "@playwright/test";

test("articulated wings stay continuous through turns and release their GPU resources", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createOizo } = await import("/src/sonoizo/createOizo.js");
    const bird = createOizo(),
      wings = [];
    bird.group.traverse((object) => {
      if (object.isSkinnedMesh) wings.push(object);
    });
    const direction = new THREE.Vector3(),
      side = new THREE.Vector3(),
      up = new THREE.Vector3(0, 1, 0);
    let maximumStep = 0,
      previous = null,
      excursion = 0,
      disposed = 0,
      finite = true;
    bird.group.traverse((object) => {
      if (object.geometry)
        object.geometry.addEventListener("dispose", () => disposed++);
    });
    wings[0].material.addEventListener("dispose", () => disposed++);
    for (let i = 0; i < 1200; i++) {
      const t = i / 60;
      direction.set(Math.sin(t * 0.45), 0, Math.cos(t * 0.45));
      side.set(-direction.z, 0, direction.x);
      bird.update({
        time: t,
        position: new THREE.Vector3(t, 0, 0),
        direction,
        side,
        up,
      });
      const angles = wings.flatMap((wing) =>
        wing.skeleton.bones.map((bone) => bone.rotation.z),
      );
      finite &&= angles.every(Number.isFinite);
      if (previous)
        maximumStep = Math.max(
          maximumStep,
          ...angles.map((v, index) => Math.abs(v - previous[index])),
        );
      excursion = Math.max(excursion, ...angles.map(Math.abs));
      previous = angles;
    }
    const weights = wings[0].geometry.attributes.skinWeight;
    let weightError = 0;
    for (let i = 0; i < weights.count; i++)
      weightError = Math.max(
        weightError,
        Math.abs(weights.getX(i) + weights.getY(i) - 1),
      );
    const position = bird.group.position.x;
    bird.dispose();
    return {
      count: wings.length,
      bones: wings.map((w) => w.skeleton.bones.length),
      maximumStep,
      excursion,
      finite,
      weightError,
      disposed,
      position,
    };
  });
  expect(result.count).toBe(2);
  expect(result.bones).toEqual([3, 3]);
  expect(result.finite).toBe(true);
  expect(result.weightError).toBeLessThan(0.000001);
  expect(result.maximumStep).toBeLessThan(0.065);
  expect(result.excursion).toBeGreaterThan(0.25);
  expect(result.position).toBeCloseTo(1199 / 60);
  expect(result.disposed).toBe(4);
});

test("twilight shader renders stars and moon with a seamless camera-relative dome and skinned bird", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createSunsetSky } = await import("/src/engine/createSunsetSky.js");
    const { createOizo } = await import("/src/sonoizo/createOizo.js");
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(640, 400);
    renderer.domElement.id = "twilight-preview";
    document.body.replaceChildren(renderer.domElement);
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(78, 1.6, 0.08, 400);
    const sky = createSunsetSky(),
      bird = createOizo();
    scene.add(sky.mesh, bird.group);
    camera.position.set(0, 0, 3);
    camera.lookAt(1.1, 0.8, 0);
    bird.update({
      time: 0,
      position: new THREE.Vector3(0.3, 0.25, 0),
      direction: new THREE.Vector3(0, 0, 1),
      side: new THREE.Vector3(-1, 0, 0),
      up: new THREE.Vector3(0, 1, 0),
    });
    const draw = (time) => {
      sky.mesh.material.uniforms.uTime.value = time;
      sky.update(camera);
      renderer.render(scene, camera);
      const pixels = new Uint8Array(640 * 400 * 4);
      renderer
        .getContext()
        .readPixels(
          0,
          0,
          640,
          400,
          renderer.getContext().RGBA,
          renderer.getContext().UNSIGNED_BYTE,
          pixels,
        );
      return pixels;
    };
    const daylight = draw(0),
      dusk = draw(260);
    let change = 0,
      nonzero = 0;
    for (let i = 0; i < dusk.length; i += 4) {
      change += Math.abs(daylight[i] - dusk[i]);
      if (dusk[i] > 0) nonzero++;
    }
    const before = sky.mesh.material.uniforms.uTime.value;
    sky.update(camera, 1 / 60);
    const advance = sky.mesh.material.uniforms.uTime.value - before;
    sky.update(camera);
    const frozen = sky.mesh.material.uniforms.uTime.value === before + advance;
    const calls = renderer.info.render.calls;
    const resources = renderer.info.memory;
    window.disposePreview = () => {
      sky.dispose();
      bird.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    };
    return {
      meanChange: change / (640 * 400),
      nonzero,
      advance,
      frozen,
      calls,
      resources,
    };
  });
  await page
    .locator("#twilight-preview")
    .screenshot({ path: "/tmp/oizo-twilight-preview.png" });
  expect(result.meanChange).toBeGreaterThan(15);
  expect(result.nonzero).toBe(640 * 400);
  expect(result.advance).toBeCloseTo(1 / 60);
  expect(result.frozen).toBe(true);
  expect(result.calls).toBe(4);
  expect(result.resources.geometries).toBe(4);
  expect(errors).toEqual([]);
  await page.evaluate(() => window.disposePreview());
});
