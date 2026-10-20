import { test, expect } from "@playwright/test";
async function stroke(page, y = 0.35) {
  const canvas = page.getByRole("img", {
      name: "Canevas aquarelle 2D plein écran",
    }),
    r = await canvas.boundingBox();
  await page.mouse.move(r.width * 0.15, r.height * y);
  await page.mouse.down();
  await page.mouse.move(r.width * 0.8, r.height * (y + 0.07), { steps: 24 });
  await page.mouse.up();
}
test("full-screen paper and sculpture share all additions through repeated reversible switches", async ({
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
  await page.getByRole("button", { name: "Entrer dans l’atelier" }).click();
  const paper = page.getByRole("img", {
    name: "Canevas aquarelle 2D plein écran",
  });
  await expect(paper).toBeVisible();
  expect(await paper.boundingBox()).toMatchObject({ width: 390, height: 844 });
  await stroke(page);
  await expect(paper).toHaveAttribute("data-stroke-count", "1");
  const a = await paper.getAttribute("data-animation-time");
  await expect
    .poll(() => paper.getAttribute("data-animation-time"))
    .not.toBe(a);
  await page.screenshot({ path: "/tmp/projective-paper.png" });
  await page.getByRole("button", { name: "Passer en 3D" }).click();
  const world = page.locator("#stage canvas");
  await expect(world).toBeVisible();
  await expect(world).toHaveAttribute("data-spatial-strokes", "1");
  const r = await world.boundingBox();
  await page.mouse.move(r.width * 0.45, r.height * 0.3);
  await page.mouse.down();
  await page.mouse.move(r.width * 0.65, r.height * 0.4, { steps: 15 });
  await expect
    .poll(async () => Number(await world.getAttribute("data-spatial-samples")))
    .toBeGreaterThan(3);
  await page.mouse.up();
  await expect(world).toHaveAttribute("data-spatial-strokes", "2");
  await page.getByRole("button", { name: "Revenir en 2D" }).click();
  await expect(paper).toBeVisible();
  await expect(paper).toHaveAttribute("data-stroke-count", "2");
  await page.getByRole("button", { name: "Densité", exact: true }).click();
  await stroke(page, 0.5);
  await expect(paper).toHaveAttribute("data-stroke-count", "3");
  await page.getByRole("button", { name: "Passer en 3D" }).click();
  await expect(world).toHaveAttribute("data-spatial-strokes", "3");
  await page.getByRole("button", { name: "Annuler le dernier tracé" }).click();
  await expect(world).toHaveAttribute("data-spatial-strokes", "2");
  await page.getByRole("button", { name: "Revenir en 2D" }).click();
  await expect(paper).toHaveAttribute("data-stroke-count", "2");
  expect(errors).toEqual([]);
});
test("all abstract materials share their geometry across dimensions and preserve spatial depth", async ({
  page,
}) => {
  await page.goto("/");
  const r = await page.evaluate(async () => {
    const { createEmojiPainting } = await import("/src/chill/emojiPainting.js"),
      { SENSORY_EMOJIS } = await import("/src/chill/sensoryEmojiCatalog.js"),
      { worldToPaper, pointToWorld, pointToPaper } =
        await import("/src/chill/twinProjection.js"),
      { createSpatialEmojiPainter } =
        await import("/src/chill/createSpatialEmojiPainter.js"),
      T = await import("/node_modules/.vite/deps/three.js");
    const errors = [];
    for (const p of [
      { x: -0.45, y: 0.49 },
      { x: 0.42, y: -0.49 },
      { x: 0, y: 0 },
    ]) {
      const q = worldToPaper(pointToWorld(p, 4, 0.04));
      errors.push(Math.hypot(q.x - p.x, q.y - p.y));
    }
    const camera = new T.PerspectiveCamera(90, 1, 0.1, 100);
    camera.position.z = 20;
    camera.lookAt(0, 0, 0);
    const painter = createSpatialEmojiPainter(
      document.createElement("canvas"),
      camera,
    );
    const flat = {
      emojiId: "water",
      size: 0.05,
      opacity: 0.8,
      points: [
        { x: -0.2, y: 0 },
        { x: 0.2, y: 0.1 },
      ],
    };
    painter.appendPaperStroke(flat);
    painter.setTool({ emojiId: "warm", size: 0.05, opacity: 0.8, depth: 4 });
    for (let i = 0; i < 20; i++) {
      camera.position.x += 0.1;
      painter.update(i / 60, { energy: 0.3 }, 1 / 60);
    }
    painter.setTool(null);
    const doc = painter.getDocument(),
      depth = doc.strokes[1].frame.spine[0].point[2];
    const projected = pointToPaper(
      doc.strokes[1].points[0],
      doc.strokes[1].frame,
    );
    const signatures = new Set(
      SENSORY_EMOJIS.map((e) =>
        JSON.stringify(
          createEmojiPainting([{ ...flat, emojiId: e.id }]).paths.map((p) => [
            p.width,
            p.points,
          ]),
        ),
      ),
    ).size;
    painter.dispose();
    return {
      errors,
      count: doc.strokes.length,
      flatUnchanged: doc.strokes[0] === flat,
      depth,
      projected,
      signatures,
    };
  });
  expect(Math.max(...r.errors)).toBeLessThan(1e-8);
  expect(r.count).toBe(2);
  expect(r.flatUnchanged).toBe(true);
  expect(r.depth).toBeCloseTo(16);
  expect(r.projected.y).toBeCloseTo(0);
  expect(r.signatures).toBe(12);
});

test("the MP3 drives the paper as well as the spatial painting without a playback break", async ({
  page,
}) => {
  await page.route("**/gravity.mp3", (route) =>
    route.fulfill({
      path: "tests/fixtures/tone.mp3",
      contentType: "audio/mpeg",
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans l’atelier" }).click();
  await stroke(page);
  const paper = page.getByRole("img", {
    name: "Canevas aquarelle 2D plein écran",
  });
  await expect
    .poll(async () => Number(await paper.getAttribute("data-paper-energy")), {
      timeout: 12000,
    })
    .toBeGreaterThan(0.01);
  await page.getByRole("button", { name: "Passer en 3D" }).click();
  await expect
    .poll(async () =>
      Number(
        await page.locator("#stage canvas").getAttribute("data-music-energy"),
      ),
    )
    .toBeGreaterThan(0.01);
  await page.getByRole("button", { name: "Revenir en 2D" }).click();
  await expect
    .poll(async () => Number(await paper.getAttribute("data-paper-energy")))
    .toBeGreaterThan(0.01);
});

test.describe("mobile twin paper", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  test("native touch draws on the full page and survives a dimensional round trip", async ({
    page,
    context,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Entrer dans l’atelier" }).tap();
    const paper = page.getByRole("img", {
        name: "Canevas aquarelle 2D plein écran",
      }),
      r = await paper.boundingBox(),
      client = await context.newCDPSession(page);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: r.width * 0.2, y: r.height * 0.3 }],
    });
    for (let i = 1; i <= 18; i++)
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: r.width * (0.2 + i * 0.025),
            y: r.height * (0.3 + Math.sin(i * 0.2) * 0.04),
          },
        ],
      });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(paper).toHaveAttribute("data-stroke-count", "1");
    await page.screenshot({ path: "/tmp/projective-final-mobile.png" });
    await page.getByRole("button", { name: "Passer en 3D" }).tap();
    await expect(page.locator("#stage canvas")).toHaveAttribute(
      "data-spatial-strokes",
      "1",
    );
    await page.getByRole("button", { name: "Revenir en 2D" }).tap();
    await expect(paper).toHaveAttribute("data-stroke-count", "1");
  });
});
