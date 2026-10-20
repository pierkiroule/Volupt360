import { test, expect } from "@playwright/test";

test("EmoCiel has five projective tools, animated paper and a silent autonomous 360 world", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [],
    audioRequests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /WebGL|shader|THREE/.test(m.text()))
      errors.push(m.text());
  });
  page.on("request", (r) => {
    if (/\.mp3(?:\?|$)/.test(r.url())) audioRequests.push(r.url());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "EmoCiel360" })).toBeVisible();
  await expect(
    page
      .getByRole("group", { name: "Outils", exact: true })
      .getByRole("button"),
  ).toHaveCount(5);
  const canvas = page.getByRole("img", { name: "Dessin 2D" }),
    r = await canvas.boundingBox();
  await page.mouse.move(r.x + r.width * 0.15, r.y + r.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width * 0.8, r.y + r.height * 0.55, {
    steps: 30,
  });
  await page.mouse.up();
  await expect(canvas).toHaveAttribute("data-actions", "1");
  const before = await canvas.evaluate((c) => c.toDataURL());
  await expect
    .poll(() => canvas.evaluate((c) => c.toDataURL()))
    .not.toBe(before);
  await page.screenshot({ path: "/tmp/emociel-paper.png" });
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  const world = page.locator("#stage canvas");
  await expect(world).toBeVisible();
  await expect(page.getByLabel("Importer un MP3")).toHaveCount(0);
  await expect(page.getByLabel("Volume", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Suspendre le voyage" }).click();
  await page.getByLabel("Style d’animation").selectOption("ripple");
  const time = await world.getAttribute("data-life-time");
  await page.waitForTimeout(600);
  await page.screenshot({ path: "/tmp/emociel-world.png" });
  await page.getByRole("button", { name: "Retour au dessin" }).click();
  await expect(canvas).toHaveAttribute("data-actions", "1");
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-actions", "0");
  await page.getByRole("button", { name: "Rétablir", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-actions", "1");
  expect(errors).toEqual([]);
  expect(audioRequests).toEqual([]);
});

test("dry pigment structures are seeded, detailed, distinct and preserved through history", async ({
  page,
}) => {
  await page.goto("/");
  const r = await page.evaluate(async () => {
    const { createDrawingSurface } =
      await import("/src/resonant/drawingSurface.js");
    const signatures = [],
      variety = [];
    for (const tool of ["watercolor", "dry", "ink", "splatch"]) {
      const d = createDrawingSurface(() => {}, { projective: true });
      d.begin(
        { x: 150, y: 250 },
        { tool, color: "#456f9c", opacity: 0.8, size: 55 },
      );
      for (let i = 1; i < 80; i++)
        d.move({ x: 150 + i * 7, y: 250 + Math.sin(i * 0.08) * 40 });
      d.finish();
      const image = d.canvas.toDataURL(),
        pixels = d.canvas.getContext("2d").getImageData(0, 0, 1200, 800).data,
        values = new Set();
      for (let i = 0; i < pixels.length; i += 4)
        if (pixels[i + 3] > 10) values.add(`${pixels[i]}:${pixels[i + 3]}`);
      signatures.push(image);
      variety.push(values.size);
      d.undo();
      d.redo();
      if (image !== d.canvas.toDataURL())
        throw Error("History changed pigment");
      d.dispose();
    }
    const a = createDrawingSurface(() => {}, { projective: true }),
      b = createDrawingSurface(() => {}, { projective: true });
    for (const d of [a, b]) {
      d.begin(
        { x: 150, y: 150 },
        { tool: "splatch", color: "#8a6b9c", opacity: 0.7, size: 55 },
      );
      d.finish();
    }
    const same = a.canvas.toDataURL() === b.canvas.toDataURL();
    a.dispose();
    b.dispose();
    return { distinct: new Set(signatures).size, variety, same };
  });
  expect(r.distinct).toBe(4);
  expect(r.same).toBe(true);
  expect(Math.min(...r.variety.slice(0, 2))).toBeGreaterThan(200);
});

test("autonomous world ignores audio input and reduced motion freezes the paper", async ({
  page,
}) => {
  await page.goto("/");
  const r = await page.evaluate(async () => {
    const { createResonantWorld } =
      await import("/src/resonant/createResonantWorld.js");
    const a = createResonantWorld({ autonomous: true }),
      b = createResonantWorld({ autonomous: true });
    for (let i = 0; i < 100; i++) {
      a.update(i / 60, { energy: 0 }, 1 / 60);
      b.update(i / 60, { energy: 1, bands: [1, 1, 1, 1, 1, 1] }, 1 / 60);
    }
    const ua = a.group.children[0].material.uniforms,
      ub = b.group.children[0].material.uniforms;
    const same = Array.from(ua.bands.value).every(
      (v, i) => v === ub.bands.value[i],
    );
    a.dispose();
    b.dispose();
    return same;
  });
  expect(r).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const canvas = page.getByRole("img", { name: "Dessin 2D" });
  await expect(canvas).toHaveAttribute("data-animation-time", "0.000");
  const before = await canvas.evaluate((c) => c.toDataURL());
  await page.waitForTimeout(400);
  expect(await canvas.evaluate((c) => c.toDataURL())).toBe(before);
});

test.describe("EmoCiel mobile", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  test("touch paints textured matter, returns from the world and exports the unchanged source", async ({
    page,
  }) => {
    await page.goto("/");
    const canvas = page.getByRole("img", { name: "Dessin 2D" }),
      r = await canvas.boundingBox();
    const client = await page.context().newCDPSession(page);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: r.x + r.width * 0.2, y: r.y + r.height * 0.4 }],
    });
    for (let i = 1; i <= 12; i++)
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: r.x + r.width * (0.2 + i * 0.045),
            y: r.y + r.height * (0.4 + Math.sin(i * 0.2) * 0.1),
          },
        ],
      });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(canvas).toHaveAttribute("data-actions", "1");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "PNG", exact: true }).tap();
    expect((await download).suggestedFilename()).toBe("emociel360.png");
    await page.getByRole("button", { name: "Entrer dans mon ciel" }).tap();
    await expect(page.locator("#stage canvas")).toBeVisible();
    await page.getByRole("button", { name: "Retour au dessin" }).tap();
    await expect(canvas).toHaveAttribute("data-actions", "1");
    await page.getByRole("button", { name: "Plier les outils" }).tap();
    await expect(
      page.getByRole("button", { name: "Pigments secs", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Déplier les outils" }).tap();
    await expect(
      page.getByRole("button", { name: "Pigments secs", exact: true }),
    ).toBeVisible();
  });
});
