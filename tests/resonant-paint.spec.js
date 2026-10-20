import { test, expect } from "@playwright/test";

test("drawing commands retain opacity, real flood fill, erasure and reversible history", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createDrawingSurface } =
      await import("/src/resonant/drawingSurface.js");
    const d = createDrawingSurface();
    const sample = (x, y) =>
      Array.from(d.canvas.getContext("2d").getImageData(x, y, 1, 1).data);
    const paint = (tool, points, extra = {}) => {
      d.begin(points[0], {
        tool,
        color: "#ff0000",
        opacity: 0.5,
        size: 20,
        filled: false,
        shape: "star",
        ...extra,
      });
      for (const p of points.slice(1)) d.move(p);
      d.finish();
    };
    paint("paint", [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
    ]);
    const alpha = sample(200, 100)[3];
    paint(
      "eraser",
      [
        { x: 200, y: 80 },
        { x: 200, y: 120 },
      ],
      { opacity: 1 },
    );
    const erased = sample(200, 100)[3];
    d.undo();
    const restored = sample(200, 100)[3];
    d.redo();
    const redone = sample(200, 100)[3];
    paint(
      "rectangle",
      [
        { x: 400, y: 100 },
        { x: 600, y: 300 },
      ],
      { color: "#000000", opacity: 1, size: 8 },
    );
    paint("fill", [{ x: 500, y: 200 }], { color: "#00ff00", opacity: 1 });
    const inside = sample(500, 200),
      outside = sample(700, 200);
    const before = d.canvas.toDataURL();
    d.clear();
    const cleared = sample(500, 200)[3];
    d.undo();
    const same = before === d.canvas.toDataURL(),
      png = d.exportPNG().startsWith("data:image/png");
    d.dispose();
    return {
      alpha,
      erased,
      restored,
      redone,
      inside,
      outside,
      cleared,
      same,
      png,
    };
  });
  expect(result.alpha).toBeGreaterThanOrEqual(126);
  expect(result.alpha).toBeLessThanOrEqual(129);
  expect(result.erased).toBe(0);
  expect(result.restored).toBe(result.alpha);
  expect(result.redone).toBe(0);
  expect(result.inside).toEqual([0, 255, 0, 255]);
  expect(result.outside[3]).toBe(0);
  expect(result.cleared).toBe(0);
  expect(result.same && result.png).toBe(true);
});

test("editor tools, MP3 and animation styles operate on the same drawing through 360 switches", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /WebGL|shader|THREE/.test(m.text()))
      errors.push(m.text());
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Resonant Paint 360" }),
  ).toBeVisible();
  const paper = page.getByRole("img", { name: "Dessin 2D" });
  for (const name of [
    "Crayon",
    "Peinture",
    "Aquarelle",
    "Gomme",
    "Remplir",
    "Ligne",
    "Rectangle",
    "Ellipse",
    "Tampon",
  ])
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  const r = await paper.boundingBox();
  await page.mouse.move(r.x + r.width * 0.2, r.y + r.height * 0.25);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width * 0.7, r.y + r.height * 0.7, {
    steps: 12,
  });
  await page.mouse.up();
  await expect(paper).toHaveAttribute("data-actions", "1");
  const image = await paper.evaluate((c) => c.toDataURL());
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(paper).toHaveAttribute("data-actions", "0");
  await page.getByRole("button", { name: "Rétablir", exact: true }).click();
  expect(await paper.evaluate((c) => c.toDataURL())).toBe(image);
  await page.screenshot({ path: "/tmp/resonant-editor.png" });
  await page.getByRole("button", { name: "Animer en 360°" }).click();
  const world = page.locator("#stage canvas");
  await expect(world).toBeVisible();
  await expect(world).toHaveAttribute("data-journey-moving", "true");
  await page.getByLabel("Style d’animation").selectOption("ripple");
  await page
    .getByLabel("Importer un MP3")
    .setInputFiles("tests/fixtures/tone.mp3");
  await expect(
    page.getByRole("button", { name: "Pause audio", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => Number(await world.getAttribute("data-music-energy")))
    .toBeGreaterThan(0.01);
  await page.getByLabel("Style d’animation").selectOption("breath");
  await page.screenshot({ path: "/tmp/resonant-world.png" });
  await page.getByRole("button", { name: "Retour au dessin" }).click();
  await expect(paper).toBeVisible();
  expect(await paper.evaluate((c) => c.toDataURL())).toBe(image);
  await page.getByRole("button", { name: "Animer en 360°" }).click();
  await expect(world).toBeVisible();
  expect(errors).toEqual([]);
});

test("resonant world reuses one texture and geometry across styles and disposes GPU resources", async ({
  page,
}) => {
  await page.goto("/");
  const r = await page.evaluate(async () => {
    const { createResonantWorld } =
      await import("/src/resonant/createResonantWorld.js");
    const w = createResonantWorld(),
      c = document.createElement("canvas");
    c.width = c.height = 64;
    w.setCanvas(c);
    const mesh = w.group.children[0],
      texture = mesh.material.uniforms.drawing.value,
      geometry = mesh.geometry;
    let disposed = 0;
    for (const object of [texture, geometry, mesh.material])
      object.addEventListener("dispose", () => disposed++);
    for (let i = 0; i < 200; i++) {
      w.setStyle(["flow", "breath", "ripple"][i % 3]);
      w.update(i / 60, { energy: 0.5 }, 1 / 60);
      w.setCanvas(c);
    }
    const stable =
        texture === mesh.material.uniforms.drawing.value &&
        geometry === mesh.geometry,
      energy = mesh.material.uniforms.energy.value;
    w.dispose();
    return { stable, energy, disposed };
  });
  expect(r.stable).toBe(true);
  expect(r.energy).toBeGreaterThan(0.1);
  expect(r.disposed).toBe(3);
});

test.describe("mobile drawing", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  test("native touch paints immediately, supports history shortcuts and exports the drawing", async ({
    page,
  }) => {
    await page.goto("/");
    const canvas = page.getByRole("img", { name: "Dessin 2D" }),
      r = await canvas.boundingBox();
    const client = await page.context().newCDPSession(page);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: r.x + r.width * 0.2, y: r.y + r.height * 0.5 }],
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: r.x + r.width * 0.7, y: r.y + r.height * 0.5 }],
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(canvas).toHaveAttribute("data-actions", "1");
    await page.keyboard.press("Control+z");
    await expect(canvas).toHaveAttribute("data-actions", "0");
    await page.keyboard.press("Control+Shift+z");
    await expect(canvas).toHaveAttribute("data-actions", "1");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "PNG", exact: true }).click();
    expect((await download).suggestedFilename()).toBe("resonant-paint-360.png");
    await page.getByRole("button", { name: "Plier les outils" }).click();
    await expect(
      page.getByRole("button", { name: "Crayon", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Déplier les outils" }).click();
    await expect(
      page.getByRole("button", { name: "Crayon", exact: true }),
    ).toBeVisible();
  });
});

test("drawing-born FX keep bounded reusable buffers, source colors and smooth spectral motion", async ({
  page,
}) => {
  await page.goto("/");
  const r = await page.evaluate(async () => {
    const { createResonantWorld } =
      await import("/src/resonant/createResonantWorld.js");
    const w = createResonantWorld(),
      canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(50, 40, 180, 110);
    w.setCanvas(canvas);
    const mesh = w.group.children[0],
      fx = w.group.children[1],
      points = fx.children[0],
      lines = fx.children[1];
    const position = points.geometry.attributes.position,
      color = points.geometry.attributes.color;
    const count = points.geometry.drawRange.count,
      capacity = position.count;
    let sourceColors = true,
      finite = true,
      disposed = 0;
    for (let i = 0; i < count; i++) {
      sourceColors &&=
        color.array[i * 3] > 0.3 &&
        color.array[i * 3 + 1] === 0 &&
        color.array[i * 3 + 2] === 0;
      finite &&= Number.isFinite(position.array[i * 3]);
    }
    for (const child of fx.children)
      for (const resource of [child.geometry, child.material])
        resource.addEventListener("dispose", () => disposed++);
    const initial = mesh.material.uniforms.energy.value;
    w.setStyle("ripple");
    w.update(
      1,
      { bands: [1, 0.2, 0.7, 0.3, 0.8, 0.9], energy: 0.8, flux: 0.5 },
      1 / 60,
    );
    const first = mesh.material.uniforms.style.value;
    for (let i = 0; i < 180; i++)
      w.update(
        i / 60,
        { bands: [1, 0.2, 0.7, 0.3, 0.8, 0.9], energy: 0.8, flux: 0.5 },
        1 / 60,
      );
    const energy = mesh.material.uniforms.energy.value,
      style = mesh.material.uniforms.style.value;
    w.setCanvas(canvas);
    const stable =
      position === points.geometry.attributes.position &&
      count === points.geometry.drawRange.count;
    const filaments = lines.geometry.drawRange.count;
    ctx.clearRect(0, 0, 300, 200);
    w.setCanvas(canvas);
    const cleared =
      points.geometry.drawRange.count === 0 &&
      lines.geometry.drawRange.count === 0;
    w.dispose();
    return {
      count,
      capacity,
      sourceColors,
      finite,
      initial,
      energy,
      first,
      style,
      stable,
      filaments,
      cleared,
      disposed,
    };
  });
  expect(r.count).toBeGreaterThan(300);
  expect(r.count).toBeLessThanOrEqual(r.capacity);
  expect(r.capacity).toBeLessThanOrEqual(3200);
  expect(r.sourceColors && r.finite && r.stable && r.cleared).toBe(true);
  expect(r.filaments).toBeGreaterThan(100);
  expect(r.first).toBeGreaterThan(0);
  expect(r.first).toBeLessThan(0.1);
  expect(r.style).toBeGreaterThan(1.9);
  expect(r.energy).toBeGreaterThan(r.initial + 0.4);
  expect(r.disposed).toBe(4);
});

test("spectral response changes rendered 360 pixels with a fixed camera and clock", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const T = await import("/node_modules/.vite/deps/three.js");
    const { createResonantWorld } =
      await import("/src/resonant/createResonantWorld.js");
    const renderer = new T.WebGLRenderer({ preserveDrawingBuffer: true });
    renderer.setSize(160, 120);
    const scene = new T.Scene(),
      camera = new T.PerspectiveCamera(80, 4 / 3, 0.1, 100);
    camera.position.z = 20;
    camera.lookAt(0, 0, 8);
    const drawing = document.createElement("canvas");
    drawing.width = 300;
    drawing.height = 200;
    const ctx = drawing.getContext("2d");
    ctx.fillStyle = "#376e88";
    ctx.fillRect(20, 30, 260, 140);
    const world = createResonantWorld();
    scene.add(world.group);
    world.setCanvas(drawing);
    const read = () => {
      renderer.render(scene, camera);
      const pixels = new Uint8Array(160 * 120 * 4);
      renderer
        .getContext()
        .readPixels(
          0,
          0,
          160,
          120,
          renderer.getContext().RGBA,
          renderer.getContext().UNSIGNED_BYTE,
          pixels,
        );
      return pixels;
    };
    world.update(3, { energy: 0 }, 1 / 60);
    const before = read();
    for (let i = 0; i < 180; i++)
      world.update(
        3,
        { energy: 0.9, bands: [1, 0.5, 0.8, 0.3, 0.9, 0.7], flux: 0.4 },
        1 / 60,
      );
    const after = read();
    let changed = 0;
    for (let i = 0; i < before.length; i += 4)
      if (
        Math.abs(before[i] - after[i]) +
          Math.abs(before[i + 1] - after[i + 1]) +
          Math.abs(before[i + 2] - after[i + 2]) >
        4
      )
        changed++;
    world.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    return changed;
  });
  expect(result).toBeGreaterThan(300);
});
