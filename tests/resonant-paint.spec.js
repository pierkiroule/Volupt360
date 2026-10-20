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
