import { test, expect } from "@playwright/test";

test("each universe exposes six brushes without a texture tool and all new particle brushes render", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  for (const [universe, names] of [
    ["Le Souffle", ["Plumes", "Lucioles"]],
    ["Les Marées", ["Feuilles", "Filaments libres"]],
    ["La Ramure", ["Racines", "Hachures"]],
  ]) {
    await page
      .getByRole("button", { name: `${universe} Entrer`, exact: true })
      .click();
    await expect(page.locator(".twig-pad")).toHaveCount(6);

    await expect(page.getByRole("button", { name: /texture/i })).toHaveCount(0);
    await expect(page.locator(".texture-palette")).toHaveCount(0);

    for (const name of names) {
      await page
        .getByRole("button", { name: `Sculpter avec ${name}`, exact: true })
        .click();
      await expect
        .poll(async () =>
          Number(
            await page
              .locator("#stage canvas")
              .getAttribute("data-painted-samples"),
          ),
        )
        .toBeGreaterThan(0);
      await page.waitForTimeout(150);
    }
    await page
      .getByRole("button", { name: "Changer d’univers", exact: true })
      .click();
  }
  expect(errors).toEqual([]);
});

test("particle geometry is bounded, seeded, evolves without allocations and fades with the sculpture", async ({
  page,
}) => {
  await page.goto("/");
  const results = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { BRUSHES, createBrushStroke, disposeMark } =
      await import("/src/engine/brushes.js");
    const sample = {
      position: new THREE.Vector3(2, 3, 4),
      side: new THREE.Vector3(1, 0, 0),
      up: new THREE.Vector3(0, 1, 0),
      direction: new THREE.Vector3(0, 0, 1),
      energy: 0.6,
    };
    return BRUSHES.filter((brush) => brush.particle !== undefined).map(
      (brush) => {
        const a = createBrushStroke(brush.id, { seed: 7 }),
          b = createBrushStroke(brush.id, { seed: 7 });
        a.append(sample);
        b.append(sample);
        const mesh = a.group.children[0],
          geometry = mesh.geometry;
        const seeded = geometry.attributes.aSeed.array.every(
          (value, i) =>
            value === b.group.children[0].geometry.attributes.aSeed.array[i],
        );
        for (let i = 0; i < 200; i++) a.append(sample);
        a.finish();
        a.update(0.5);
        const result = {
          id: brush.id,
          count: a.count,
          full: a.full,
          drawCount: geometry.drawRange.count,
          capacity: geometry.attributes.position.count,
          sameGeometry: mesh.geometry === geometry,
          time: mesh.material.uniforms.uParticleTime.value,
          fade: mesh.material.uniforms.uFade.value,
          seeded,
        };
        disposeMark(a.group);
        disposeMark(b.group);
        return result;
      },
    );
  });
  expect(results).toHaveLength(6);
  for (const result of results) {
    expect(result.seeded).toBe(true);
    expect(result.count).toBe(52);
    expect(result.full).toBe(true);
    expect(result.drawCount).toBe(result.capacity);
    expect(result.capacity).toBe(1248);
    expect(result.sameGeometry).toBe(true);
    expect(result.time).toBe(0.5);
    expect(result.fade).toBe(1);
  }
});

test("six procedural motifs produce distinct WebGL images and obey progressive alpha fading", async ({
  page,
}) => {
  await page.goto("/");
  const images = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { BRUSHES, createBrushStroke, disposeMark } =
      await import("/src/engine/brushes.js");
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(96, 96);
    renderer.setClearColor(0, 0);
    const target = new THREE.WebGLRenderTarget(96, 96),
      scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-4, 4, 4, -4, 0.1, 20);
    camera.position.z = 6;
    camera.lookAt(0, 0, 0);
    const sample = {
      position: new THREE.Vector3(),
      side: new THREE.Vector3(1, 0, 0),
      up: new THREE.Vector3(0, 1, 0),
      direction: new THREE.Vector3(0, 0, 1),
      energy: 0.8,
    };
    const pixels = new Uint8Array(96 * 96 * 4);
    renderer.setRenderTarget(target);
    const results = BRUSHES.filter((brush) => brush.particle !== undefined).map(
      (brush) => {
        const stroke = createBrushStroke(brush.id, { seed: 7 });
        stroke.append(sample);
        stroke.finish();
        stroke.update(0.4);
        scene.add(stroke.group);
        const read = (fade) => {
          stroke.group.children[0].material.uniforms.uFade.value = fade;
          renderer.clear();
          renderer.render(scene, camera);
          renderer.readRenderTargetPixels(target, 0, 0, 96, 96, pixels);
          let alpha = 0,
            hash = 0;
          for (let i = 0; i < pixels.length; i++) {
            hash = (Math.imul(hash, 31) + pixels[i]) >>> 0;
            if (i % 4 === 3) alpha += pixels[i];
          }
          return { alpha, hash };
        };
        const result = {
          id: brush.id,
          full: read(1),
          half: read(0.5),
          gone: read(0),
        };
        disposeMark(stroke.group);
        return result;
      },
    );
    target.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    return results;
  });
  expect(new Set(images.map((image) => image.full.hash)).size).toBe(6);
  for (const image of images) {
    expect(image.full.alpha).toBeGreaterThan(1000);
    expect(image.half.alpha).toBeGreaterThan(0);
    expect(image.half.alpha).toBeLessThan(image.full.alpha);
    expect(image.gone.alpha).toBe(0);
  }
});
