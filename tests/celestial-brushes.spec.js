import { test, expect } from "@playwright/test";
test.use({ hasTouch: true });

test("3D planets select only on double tap and show a single blue halo", async ({
  page,
}) => {
  await page.route("https://api.inaturalist.org/**", (route) =>
    route.fulfill({ json: { results: [] } }),
  );
  await page.goto("/");
  await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createCelestialBrushes } =
      await import("/src/engine/CelestialBrushes.js");
    const texture = new THREE.Texture();
    const hits = [];
    const planets = createCelestialBrushes(
      [{ id: "one" }, { id: "two" }],
      new Map([
        ["one", { texture }],
        ["two", { texture }],
      ]),
      (id) => hits.push(id),
    );
    planets.setBrushes(["one", "two"]);
    const meshes = planets.group.children.filter(
      (object) => object.userData.brushId,
    );
    meshes[0].position.set(-6, 0, 0);
    meshes[1].position.set(0, 0, 0);
    planets.group.position.set(2, 0, 0);
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(2, 0, 15);
    camera.lookAt(2, 0, 0);
    const canvas = document.createElement("canvas");
    canvas.id = "planet-test";
    canvas.style.cssText =
      "position:fixed;left:0;top:0;width:200px;height:200px;z-index:9999;touch-action:none";
    document.body.append(canvas);
    let enabled = true;
    const unbind = planets.bindInput(canvas, camera, () => enabled);
    window.planetTest = {
      hits,
      planets,
      meshes,
      disable: () => (enabled = false),
      cleanup: () => {
        unbind();
        planets.dispose();
        texture.dispose();
        canvas.remove();
      },
    };
  });
  await page.mouse.click(100, 100);
  expect(await page.evaluate(() => window.planetTest.hits)).toEqual([]);
  await page.waitForTimeout(400);
  await page.touchscreen.tap(100, 100);
  await page.touchscreen.tap(100, 100);
  const selected = await page.evaluate(() => {
    const { planets, meshes, hits } = window.planetTest;
    const halo = planets.group.children.find(
      (object) => !object.userData.brushId,
    );
    return {
      hits,
      sphere: meshes.every((mesh) => mesh.geometry.type === "SphereGeometry"),
      halo: halo.visible,
      aligned: halo.position.equals(meshes[1].position),
      solid: meshes.every((mesh) => !mesh.material.transparent),
    };
  });
  expect(selected).toEqual({
    hits: ["two"],
    sphere: true,
    halo: true,
    aligned: true,
    solid: true,
  });
  await page.waitForTimeout(400);
  await page.mouse.move(100, 100);
  await page.mouse.down();
  await page.mouse.move(130, 100);
  await page.mouse.move(100, 100);
  await page.mouse.up();
  await page.mouse.click(100, 100);
  expect(await page.evaluate(() => window.planetTest.hits)).toEqual(["two"]);
  await page.evaluate(() => window.planetTest.disable());
  await page.mouse.dblclick(100, 100, { delay: 30 });
  expect(await page.evaluate(() => window.planetTest.hits)).toEqual(["two"]);
  await page.evaluate(() => window.planetTest.cleanup());
});

test("mobile atelier paints without imports or pads and keeps photo framing", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("https://api.inaturalist.org/**", (route) =>
    route.fulfill({ json: { results: [] } }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  const canvas = page.locator("#stage canvas");
  await expect(canvas).toHaveAttribute("data-celestial-brushes", "6");
  await expect(page.locator('input[type="file"][accept^="image"]')).toHaveCount(
    0,
  );
  await expect(page.locator(".twig-pad")).toHaveCount(0);
  await page.mouse.move(190, 350);
  await page.mouse.down();
  await page.waitForTimeout(1300);
  await page.mouse.up();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-painted-samples")))
    .toBeGreaterThan(2);
  await page.screenshot({ path: "/tmp/celestial-brushes.png" });
  await page.getByRole("button", { name: "Vue photo", exact: true }).click();
  await expect(page.getByRole("button", { name: /PNG HD/i })).toBeVisible();
  expect(errors).toEqual([]);
});

test("all eighteen original brush geometries render their fixed watercolor in WebGL", async ({
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
