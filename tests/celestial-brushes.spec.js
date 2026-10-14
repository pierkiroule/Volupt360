import { test, expect } from "@playwright/test";

test("fixed pigment textures and swept celestial encounters are bounded and reproducible", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { BRUSHES } = await import("/src/engine/brushes.js");
    const { createWatercolorTexture } =
      await import("/src/engine/createWatercolorTexture.js");
    const { createCelestialBrushes } =
      await import("/src/engine/CelestialBrushes.js");
    const bindings = new Map(
      BRUSHES.map((brush, i) => [
        brush.id,
        createWatercolorTexture(brush, i + 31, 64),
      ]),
    );
    const first = bindings.get(BRUSHES[0].id);
    const repeat = createWatercolorTexture(BRUSHES[0], 31, 64);
    const pixels = (binding) => [
      ...binding.texture.image.getContext("2d").getImageData(0, 0, 64, 64).data,
    ];
    const a = pixels(first),
      b = pixels(repeat);
    const hits = [];
    const bodies = createCelestialBrushes(BRUSHES, bindings, (id) =>
      hits.push(id),
    );
    bodies.setBrushes([BRUSHES[0].id]);
    const target = bodies.group.children[0].position.clone();
    // A high-speed crossing must work even with both endpoints outside the body.
    bodies.update(0, target.clone().add(new THREE.Vector3(-10, 0, 0)));
    bodies.update(0.01, target.clone().add(new THREE.Vector3(10, 0, 0)));
    for (let i = 0; i < 30; i++) bodies.update(0.01, target);
    const visible = bodies.group.children.filter((body) => body.visible).length;
    let disposed = 0;
    bodies.group.children.forEach((body) =>
      body.material.addEventListener("dispose", () => disposed++),
    );
    bodies.dispose();
    bindings.forEach((binding) => binding.texture.dispose());
    repeat.texture.dispose();
    return {
      same: a.every((value, i) => value === b[i]),
      alpha: new Set(a.filter((_, i) => i % 4 === 3)).size,
      hits,
      visible,
      disposed,
      count: BRUSHES.length,
    };
  });
  expect(result.same).toBe(true);
  expect(result.alpha).toBeGreaterThan(50);
  expect(result.hits).toEqual(["voiles"]);
  expect(result.visible).toBe(1);
  expect(result.disposed).toBe(result.count);
});

test("mobile atelier paints without imports or pads and keeps photo framing", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
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
