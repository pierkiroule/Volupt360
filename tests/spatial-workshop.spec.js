import { test, expect } from "@playwright/test";

test("atelier starts directly in 3D and deposits only when Sculpter is enabled", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /THREE|shader|WebGL/.test(m.text()))
      errors.push(m.text());
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Entrer dans l’atelier 360°" })
    .click();
  const canvas = page.locator("#stage canvas");
  await expect(canvas).toBeVisible();
  await expect(page.locator(".emoji-painter")).toHaveCount(0);
  await expect(
    page.getByRole("group", { name: "Brosses émojis" }).getByRole("button"),
  ).toHaveCount(12);
  await expect(
    page.getByRole("button", { name: "Sculpter", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(canvas).toHaveAttribute("data-spatial-strokes", "0");
  const box = await canvas.boundingBox();
  await page.mouse.move(box.width * 0.5, box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box.width * 0.7, box.height * 0.3, { steps: 8 });
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-journey-speed")))
    .toBeGreaterThan(0.6);
  await page.mouse.up();
  await expect(canvas).toHaveAttribute("data-spatial-strokes", "0");
  await page.getByRole("button", { name: "Sculpter", exact: true }).click();
  await page.mouse.move(box.width * 0.5, box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box.width * 0.65, box.height * 0.35, { steps: 8 });
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-spatial-samples")))
    .toBeGreaterThan(5);
  await page.mouse.up();
  await page.getByRole("button", { name: "Sculpter", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-spatial-strokes", "1");
  await page.getByRole("button", { name: "Chaleur", exact: true }).click();
  await page.getByRole("button", { name: "Sculpter", exact: true }).click();
  await page.getByRole("button", { name: "Voyager", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-spatial-tool", "warm");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-spatial-samples")))
    .toBeGreaterThan(4);
  await page.getByRole("button", { name: "Sculpter", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-spatial-strokes", "2");
  await expect(canvas).toHaveAttribute("data-journey-moving", "true");
  await page.getByRole("button", { name: "Annuler le dernier tracé" }).click();
  await expect(canvas).toHaveAttribute("data-spatial-strokes", "1");
  await page.getByRole("button", { name: "Plier les outils" }).click();
  await expect(page.getByRole("group", { name: "Brosses émojis" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Sculpter", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Déplier les outils" }).click();
  await page.screenshot({ path: "/tmp/spatial-flight-workshop.png" });
  await page.getByRole("button", { name: "Accueil", exact: true }).click();
  await page.getByRole("button", { name: "Reprendre mon atelier" }).click();
  await expect(canvas).toHaveAttribute("data-spatial-strokes", "1");
  expect(errors).toEqual([]);
});

test("spatial brush paths stay anchored in world space, retain all twelve signatures and dispose", async ({
  page,
}) => {
  await page.goto("/");
  const r = await page.evaluate(async () => {
    const T = await import("/node_modules/.vite/deps/three.js"),
      { createSpatialEmojiPainter } =
        await import("/src/chill/createSpatialEmojiPainter.js"),
      { spatialBrushPoint } = await import("/src/chill/spatialBrushFrame.js"),
      { SENSORY_EMOJIS } = await import("/src/chill/sensoryEmojiCatalog.js");
    const canvas = document.createElement("canvas"),
      camera = new T.PerspectiveCamera(90, 1, 0.1, 100);
    camera.position.set(0, 0, 20);
    camera.lookAt(0, 0, 0);
    const painter = createSpatialEmojiPainter(canvas, camera);
    let time = 0;
    for (const e of SENSORY_EMOJIS) {
      painter.setTool({ emojiId: e.id, size: 0.05, opacity: 0.8, depth: 4 });
      for (let i = 0; i < 20; i++) {
        camera.position.x += 0.1;
        time += 1 / 60;
        painter.update(time, { energy: 0.2 }, 1 / 60);
      }
      painter.setTool(null);
    }
    const doc = painter.getDocument(),
      first = doc.strokes[0],
      start = spatialBrushPoint({ x: 0, y: 0 }, first.frame);
    camera.position.set(100, 100, 100);
    camera.updateMatrixWorld();
    const anchored =
      JSON.stringify(start) ===
      JSON.stringify(spatialBrushPoint({ x: 0, y: 0 }, first.frame));
    const signatures = new Set(doc.paths.map((p) => p.emojiId)).size,
      frames = doc.paths.every((p) => p.frame?.spine.length > 1),
      count = painter.count;
    let disposed = 0;
    painter.group.traverse((o) => {
      if (o.geometry) o.geometry.addEventListener("dispose", () => disposed++);
    });
    painter.dispose();
    return {
      anchored,
      signatures,
      frames,
      count,
      disposed,
      remaining: painter.group.children.length,
      depth: first.frame.spine[0].point[2],
    };
  });
  expect(r.anchored).toBe(true);
  expect(r.signatures).toBe(12);
  expect(r.frames).toBe(true);
  expect(r.count).toBe(12);
  expect(r.depth).toBeCloseTo(16);
  expect(r.disposed).toBeGreaterThanOrEqual(3);
  expect(r.remaining).toBe(0);
});

test.describe("mobile sculpting flight", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  test("a captured touch steers and accelerates while sculpture remains enabled", async ({
    page,
    context,
  }) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: "Entrer dans l’atelier 360°" })
      .tap();
    await page.getByRole("button", { name: "Sculpter", exact: true }).tap();
    const canvas = page.locator("#stage canvas"),
      r = await canvas.boundingBox(),
      client = await context.newCDPSession(page);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: r.width * 0.4, y: r.height * 0.4 }],
    });
    for (let i = 1; i <= 12; i++)
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: r.width * 0.4 + i * 7, y: r.height * 0.4 - i * 3 }],
      });
    await expect(canvas).toHaveAttribute("data-journey-touching", "true");
    await expect
      .poll(async () => Number(await canvas.getAttribute("data-journey-speed")))
      .toBeGreaterThan(0.5);
    await expect
      .poll(async () =>
        Number(await canvas.getAttribute("data-spatial-samples")),
      )
      .toBeGreaterThan(5);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(canvas).toHaveAttribute("data-journey-touching", "false");
    await page.getByRole("button", { name: "Sculpter", exact: true }).tap();
    await expect(canvas).toHaveAttribute("data-spatial-drawing", "false");
    await expect
      .poll(async () =>
        Number(await canvas.getAttribute("data-spatial-strokes")),
      )
      .toBeGreaterThan(0);
  });
});
