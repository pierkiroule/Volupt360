import { test, expect } from "@playwright/test";

test("canvas contact paints immediately and release stops deposition while flight continues", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?atelier");
  await page.getByRole("button", { name: "Entrer dans l’atelier" }).click();
  await page.getByRole("button", { name: "Passer en 3D" }).click();
  const canvas = page.locator("#stage canvas");
  await expect(canvas).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sculpter", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Entrer en VR" }),
  ).toBeVisible();
  await expect(canvas).toHaveAttribute("data-spatial-strokes", "0");
  const box = await canvas.boundingBox();
  await page.mouse.move(box.width * 0.5, box.height * 0.35);
  await page.mouse.down();
  await expect(canvas).toHaveAttribute("data-spatial-drawing", "true");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-spatial-samples")))
    .toBeGreaterThan(0);
  await page.mouse.move(box.width * 0.65, box.height * 0.3, { steps: 8 });
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-spatial-samples")))
    .toBeGreaterThan(4);
  await page.mouse.up();
  await expect(canvas).toHaveAttribute("data-spatial-drawing", "false");
  await expect(canvas).toHaveAttribute("data-spatial-strokes", "1");
  await page.getByRole("button", { name: "Chaleur", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Suspendre le voyage", exact: true }),
  ).toBeVisible();
  await expect(canvas).toHaveAttribute("data-journey-moving", "true");
  await expect(canvas).toHaveAttribute("data-spatial-strokes", "1");
  await page.mouse.move(box.width * 0.5, box.height * 0.35);
  await page.mouse.down();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-spatial-samples")))
    .toBeGreaterThan(3);
  await page.mouse.up();
  await expect(canvas).toHaveAttribute("data-spatial-strokes", "2");
  await expect(canvas).toHaveAttribute("data-spatial-drawing", "false");
  await expect(canvas).toHaveAttribute("data-journey-moving", "true");
  await page.getByRole("button", { name: "Annuler le dernier tracé" }).click();
  await expect(canvas).toHaveAttribute("data-spatial-strokes", "1");
  await page.getByRole("button", { name: "Accueil", exact: true }).click();
  await page.getByRole("button", { name: "Reprendre mon atelier" }).click();
  await expect(canvas).toHaveAttribute("data-spatial-strokes", "1");
  expect(errors).toEqual([]);
});

test("spatial brush paths stay anchored in world space, retain all twelve signatures and dispose", async ({
  page,
}) => {
  await page.goto("/?atelier");
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
    await page.goto("/?atelier");
    await page.getByRole("button", { name: "Entrer dans l’atelier" }).tap();
    await page.getByRole("button", { name: "Passer en 3D" }).click();
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
    await expect(canvas).toHaveAttribute("data-spatial-drawing", "false");
    await expect
      .poll(async () =>
        Number(await canvas.getAttribute("data-spatial-strokes")),
      )
      .toBeGreaterThan(0);
  });
});

test("smart tools hide during sculpting, restore after release and preserve folded state", async ({
  page,
}) => {
  await page.goto("/?atelier");
  await page.getByRole("button", { name: "Entrer dans l’atelier" }).click();
  await page.getByRole("button", { name: "Passer en 3D" }).click();
  await page.getByRole("button", { name: "Plier les outils" }).click();
  const panel = page.getByRole("region", {
      name: "Atelier de sculpture 360°",
      includeHidden: true,
    }),
    canvas = page.locator("#stage canvas"),
    r = await canvas.boundingBox();
  await page.mouse.move(r.width * 0.5, r.height * 0.35);
  await page.mouse.down();
  await expect(panel).toHaveAttribute("aria-hidden", "true");
  await expect(
    page.getByRole("button", { name: "Afficher les outils" }),
  ).toBeVisible();
  await expect(canvas).toHaveAttribute("data-journey-touching", "true");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-spatial-samples")))
    .toBeGreaterThan(2);
  await page.mouse.up();
  await expect(panel).toHaveAttribute("aria-hidden", "false");
  await expect(
    page.getByRole("button", { name: "Déplier les outils" }),
  ).toBeVisible();
  await expect(page.getByRole("group", { name: "Brosses émojis" })).toHaveCount(
    0,
  );
  await page.mouse.down();
  await expect(panel).toHaveAttribute("aria-hidden", "true");
  await page.keyboard.press("Escape");
  await expect(panel).toHaveAttribute("aria-hidden", "false");
  await page.mouse.up();
  await page.mouse.move(r.width * 0.5, r.height * 0.35);
  await page.mouse.down();
  await expect(canvas).toHaveAttribute("data-journey-touching", "true");
  await expect(panel).toHaveAttribute("aria-hidden", "true");
  await page.mouse.up();
});

test("travel alone does not paint and keyboard settings remain available", async ({
  page,
}) => {
  await page.goto("/?atelier");
  await page.getByRole("button", { name: "Entrer dans l’atelier" }).click();
  await page.getByRole("button", { name: "Passer en 3D" }).click();
  await expect(
    page.getByRole("button", { name: "Suspendre le voyage", exact: true }),
  ).toBeVisible();
  await page.getByRole("slider", { name: "Taille de la brosse" }).focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(3000);
  await expect(
    page.getByRole("slider", { name: "Taille de la brosse" }),
  ).toBeFocused();
  await expect(page.locator("#stage canvas")).toHaveAttribute(
    "data-spatial-strokes",
    "0",
  );
  await expect(page.locator("#stage canvas")).toHaveAttribute(
    "data-spatial-drawing",
    "false",
  );
});

test("the menu is translucent at rest and becomes readable for keyboard interaction", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?atelier");
  await page.getByRole("button", { name: "Entrer dans l’atelier" }).click();
  await page.getByRole("button", { name: "Passer en 3D" }).click();
  const menu = page.locator("#spatial-tools");
  await page.mouse.move(20, 20);
  await expect(menu).toHaveCSS("opacity", "0.74");
  await expect(menu).toHaveCSS("transition-duration", "0s");
  await page.keyboard.press("Tab");
  await expect(menu).toHaveCSS("opacity", "1");
  await expect(
    page.getByRole("button", { name: "Suspendre le voyage", exact: true }),
  ).toHaveCSS("min-height", "44px");
});

test("audio envelopes absorb impacts without jumps and survive live geometry reconstruction", async ({
  page,
}) => {
  await page.goto("/?atelier");
  const r = await page.evaluate(async () => {
    const { createPigmentEnvelope } =
        await import("/src/chill/createPigmentEnvelope.js"),
      { createPictorialLandscape } =
        await import("/src/chill/createPictorialLandscape.js"),
      { createEmojiPainting } = await import("/src/chill/emojiPainting.js");
    const env = createPigmentEnvelope();
    env.update({ bands: [1, 0, 0, 0, 0, 0], flux: 1, energy: 1 }, 1 / 60);
    const first = env.bands[0];
    let maxStep = 0,
      last = first;
    for (let i = 0; i < 360; i++) {
      env.update(
        { bands: [i % 2, 0, 0, 0, 0, 0], flux: i % 2, energy: i % 2 },
        1 / 60,
      );
      maxStep = Math.max(maxStep, Math.abs(env.bands[0] - last));
      last = env.bands[0];
    }
    const stable = env.bands[0],
      accent = env.accent,
      local = env.bands[2];
    for (let i = 0; i < 180; i++) env.update({ energy: 0 }, 1 / 60);
    const released = env.bands[0];
    const stroke = {
      emojiId: "water",
      size: 0.05,
      opacity: 0.8,
      phase: 0.618,
      points: [
        { x: 0, y: 0 },
        { x: 0.2, y: 0 },
      ],
    };
    const landscape = createPictorialLandscape();
    landscape.setDocument(createEmojiPainting([stroke]));
    for (let i = 0; i < 180; i++)
      landscape.update(i / 60, { bands: [0.8, 0, 0, 0, 0, 0] }, 1 / 60);
    const mesh = landscape.group.children[0],
      before = landscape.motion.snapshot(),
      prefix = Array.from(mesh.geometry.attributes.flowCoordinate.array).slice(
        0,
        12,
      );
    landscape.setDocument(
      createEmojiPainting([
        { ...stroke, points: [...stroke.points, { x: 0.4, y: 0 }] },
      ]),
    );
    const after = landscape.motion.snapshot(),
      newPrefix = Array.from(
        landscape.group.children[0].geometry.attributes.flowCoordinate.array,
      ).slice(0, 12);
    landscape.dispose();
    return {
      first,
      maxStep,
      stable,
      accent,
      local,
      released,
      preserved: JSON.stringify(before) === JSON.stringify(after),
      prefixStable: JSON.stringify(prefix) === JSON.stringify(newPrefix),
    };
  });
  expect(r.first).toBeLessThan(0.005);
  expect(r.maxStep).toBeLessThan(0.02);
  expect(r.stable).toBeGreaterThan(0.35);
  expect(r.accent).toBeLessThan(0.2);
  expect(r.local).toBe(0);
  expect(r.released).toBeLessThan(r.stable * 0.2); // Most motion settles over three seconds, without an abrupt cut.
  expect(r.preserved).toBe(true);
  expect(r.prefixStable).toBe(true);
});

test("VR pictogram requests a native immersive session and reports denial without breaking the workshop", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "xr", {
      configurable: true,
      value: {
        requestSession: async (mode) => {
          window.requestedXRMode = mode;
          throw new Error("Autorisation VR refusée");
        },
      },
    });
  });
  await page.goto("/?atelier");
  await page.getByRole("button", { name: "Entrer dans l’atelier" }).click();
  await page.getByRole("button", { name: "Passer en 3D" }).click();
  const button = page.getByRole("button", { name: "Entrer en VR" });
  await expect(button.locator("svg")).toBeVisible();
  await button.click();
  await expect(page.getByRole("status")).toContainText(
    "Autorisation VR refusée",
  );
  expect(await page.evaluate(() => window.requestedXRMode)).toBe(
    "immersive-vr",
  );
  await expect(
    page.getByRole("group", { name: "Brosses émojis" }),
  ).toBeVisible();
});
