import { test, expect } from "@playwright/test";
async function paint(page, name, y) {
  await page.getByRole("button", { name, exact: true }).click();
  const c = page.getByRole("img", { name: "Disque de peinture émotionnelle" }),
    r = await c.boundingBox();
  await page.mouse.move(r.x + r.width * 0.25, r.y + r.height * y);
  await page.mouse.down();
  await expect(c).toHaveAttribute("data-drawing", "true");
  await page.mouse.move(r.x + r.width * 0.72, r.y + r.height * (y + 0.08), {
    steps: 24,
  });
  await page.mouse.up();
  return c;
}
test("emoji brushes paint an animated disk and become fire, rain and bridges in an explorable world", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /WebGL|shader|THREE/.test(m.text()))
      errors.push(m.text());
  });
  await page.goto("/?emociel");
  const c = await paint(page, "Colère", 0.32);
  await expect(c).toHaveAttribute("data-strokes", "1");
  await paint(page, "Tristesse", 0.59);
  await expect(c).toHaveAttribute("data-strokes", "2");
  const first = await c.evaluate((c) => c.toDataURL());
  await expect.poll(() => c.evaluate((c) => c.toDataURL())).not.toBe(first);
  await page.screenshot({ path: "/tmp/emociel-emotion-disk.png" });
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  const world = page.locator("#stage canvas");
  await expect(world).toBeVisible();
  await expect(world).toHaveAttribute("data-camera-position", /.+/);
  const position = await world.getAttribute("data-camera-position");
  await page.waitForTimeout(350);
  expect(await world.getAttribute("data-camera-position")).toBe(position);
  await page.screenshot({ path: "/tmp/emociel-weather-world.png" });
  await page.getByRole("button", { name: "Vol FPV", exact: true }).click();
  await expect
    .poll(() => world.getAttribute("data-camera-position"))
    .not.toBe(position);
  await page.getByLabel("Dynamique à explorer").selectOption("support");
  await expect(
    page.getByRole("region", { name: "Invitation métaphorique" }),
  ).toContainText("rayon de soleil");
  await page.getByRole("button", { name: "Fermer la question" }).click();
  await page.getByRole("button", { name: "Revenir peindre" }).click();
  await expect(c).toHaveAttribute("data-strokes", "2");
  await page.getByRole("button", { name: "Annuler le tracé" }).click();
  await expect(c).toHaveAttribute("data-strokes", "1");
  await page.getByRole("button", { name: "Rétablir le tracé" }).click();
  await expect(c).toHaveAttribute("data-strokes", "2");
  expect(errors).toEqual([]);
});
test("paint source has no emoji glyphs; weather uses bounded semantic buffers and true spatial bridges", async ({
  page,
}) => {
  await page.goto("/?emociel");
  const r = await page.evaluate(async () => {
    const { createDiskPainter, projectDiskToSky, emotionalBridges } =
      await import("/src/emociel/emotionPainting.js");
    const { createEmotionWeather } =
      await import("/src/emociel/createEmotionWeather.js");
    let textCalls = 0;
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...args) {
      textCalls++;
      return original.apply(this, args);
    };
    const strokes = [
      {
        id: 1,
        emotionId: "anger",
        size: 60,
        opacity: 0.8,
        points: [
          { x: 0.25, y: 0.3 },
          { x: 0.65, y: 0.4 },
        ],
      },
      {
        id: 2,
        emotionId: "sadness",
        size: 60,
        opacity: 0.6,
        points: [
          { x: 0.3, y: 0.6 },
          { x: 0.7, y: 0.7 },
        ],
      },
    ];
    const painter = createDiskPainter();
    painter.setDocument(strokes);
    const source = painter.canvas.toDataURL(),
      sky = projectDiskToSky(painter.canvas),
      w = createEmotionWeather();
    w.setDocument(strokes);
    const points = w.group.children[0],
      position = points.geometry.attributes.position,
      weather = points.geometry.attributes.weather;
    const kinds = new Set();
    for (let i = 0; i < points.geometry.drawRange.count; i++)
      kinds.add(weather.array[i * 4]);
    const stats = w.stats;
    w.update(3);
    w.setDocument(strokes);
    const stable = position === points.geometry.attributes.position;
    let disposed = 0;
    for (const child of w.group.children)
      for (const resource of [child.geometry, child.material])
        resource.addEventListener("dispose", () => disposed++);
    w.setDocument([]);
    const empty = w.stats.particles === 0 && w.stats.bridgeVertices === 0;
    w.dispose();
    const unchanged = source === painter.canvas.toDataURL();
    painter.dispose();
    CanvasRenderingContext2D.prototype.fillText = original;
    return {
      textCalls,
      unchanged,
      size: [sky.width, sky.height],
      kinds: [...kinds],
      stats,
      stable,
      empty,
      disposed,
      bridges: emotionalBridges(strokes).length,
    };
  });
  expect(r.textCalls).toBe(0);
  expect(r.unchanged && r.stable && r.empty).toBe(true);
  expect(r.kinds.sort((a, b) => a - b)).toEqual([1, 2, 12]);
  expect(r.stats.particles).toBeGreaterThan(50);
  expect(r.stats.particles).toBeLessThanOrEqual(r.stats.capacity);
  expect(r.stats.bridgeVertices).toBeGreaterThan(0);
  expect(r.disposed).toBe(4);
  expect(r.bridges).toBe(1);
  expect(r.size).toEqual([1536, 768]);
});
test.describe("mobile emotional painting", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  test("native touch is a continuous painted gesture, not a deposited emoji", async ({
    page,
  }) => {
    await page.goto("/?emociel");
    const c = page.getByRole("img", {
        name: "Disque de peinture émotionnelle",
      }),
      r = await c.boundingBox(),
      client = await page.context().newCDPSession(page);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: r.x + r.width * 0.3, y: r.y + r.height * 0.4 }],
    });
    for (let i = 1; i <= 10; i++)
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: r.x + r.width * (0.3 + i * 0.035),
            y: r.y + r.height * (0.4 + i * 0.01),
          },
        ],
      });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(c).toHaveAttribute("data-strokes", "1");
    await page.getByRole("button", { name: "Tristesse", exact: true }).tap();
    await expect(
      page.getByRole("button", { name: "Tristesse", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});

test("all twelve brushes have unique colors, visible symbolic marks and matching GPU identities", async ({
  page,
}) => {
  await page.goto("/?emociel");
  const r = await page.evaluate(async () => {
    const { EMOTION_BRUSHES, symbolAtlas, drawEmotionLife } =
      await import("/src/emociel/emotionPainting.js");
    const { createEmotionWeather } =
      await import("/src/emociel/createEmotionWeather.js");
    const atlas = symbolAtlas(),
      ctx = atlas.getContext("2d"),
      signatures = [],
      coverage = [];
    const sheet = document.createElement("canvas");
    sheet.width = 900;
    sheet.height = 720;
    const c = sheet.getContext("2d");
    c.fillStyle = "#f8f5ed";
    c.fillRect(0, 0, 900, 720);
    const strokes = EMOTION_BRUSHES.map((b, i) => ({
      id: i + 1,
      emotionId: b.id,
      size: 55,
      opacity: 0.8,
      points: [
        { x: 0.25, y: 0.4 },
        { x: 0.5, y: 0.5 },
        { x: 0.75, y: 0.6 },
      ],
    }));
    for (const b of EMOTION_BRUSHES) {
      const tile = document.createElement("canvas");
      tile.width = tile.height = 128;
      tile
        .getContext("2d")
        .drawImage(
          atlas,
          (b.index % 4) * 128,
          Math.floor(b.index / 4) * 128,
          128,
          128,
          0,
          0,
          128,
          128,
        );
      signatures.push(tile.toDataURL());
      const px = tile.getContext("2d").getImageData(0, 0, 128, 128).data;
      let count = 0;
      for (let i = 3; i < px.length; i += 4) if (px[i] > 30) count++;
      coverage.push(count);
      const x = (b.index % 4) * 225,
        y = Math.floor(b.index / 4) * 240;
      c.drawImage(tile, x + 60, y + 20, 105, 105);
      c.fillStyle = b.color;
      c.font = "17px system-ui";
      c.textAlign = "center";
      c.fillText(b.label, x + 112, y + 154);
      c.font = "11px system-ui";
      c.fillText(b.symbol, x + 112, y + 178);
    }
    const w = createEmotionWeather();
    w.setDocument(strokes);
    const data = w.group.children[0].geometry.attributes.weather.array,
      kinds = new Set();
    for (let i = 0; i < w.stats.particles; i++) kinds.add(data[i * 4]);
    w.dispose();
    const preview = sheet.toDataURL();
    document.body.replaceChildren();
    const img = document.createElement("img");
    img.src = preview;
    img.style.cssText = "width:900px;max-width:100%;height:auto";
    document.body.append(img);
    return {
      colors: new Set(EMOTION_BRUSHES.map((b) => b.color)).size,
      symbols: new Set(EMOTION_BRUSHES.map((b) => b.symbol)).size,
      unique: new Set(signatures).size,
      coverage,
      kinds: [...kinds],
    };
  });
  expect(r.colors).toBe(12);
  expect(r.symbols).toBe(12);
  expect(r.unique).toBe(12);
  expect(Math.min(...r.coverage)).toBeGreaterThan(150);
  for (let i = 0; i < 12; i++) expect(r.kinds).toContain(i);
  await page.screenshot({ path: "/tmp/emociel-symbolic-brushes.png" });
});
