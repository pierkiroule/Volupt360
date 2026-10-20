import { test, expect } from "@playwright/test";

test("local alpha atlas is cached, deterministic and has eight distinct detailed transparent masks", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { pigmentAtlas, PIGMENT_CELL, ALPHA_TYPES } =
      await import("/src/squiggle/pigmentAtlas.js");
    const a = pigmentAtlas(),
      ctx = a.getContext("2d");
    const masks = ALPHA_TYPES.map((name, tile) => {
      const pixels = ctx.getImageData(
        tile * PIGMENT_CELL,
        0,
        PIGMENT_CELL,
        PIGMENT_CELL,
      ).data;
      let hash = 2166136261,
        clear = 0,
        ink = 0,
        detail = 0;
      for (let i = 3; i < pixels.length; i += 4) {
        hash = Math.imul(hash ^ pixels[i], 16777619) >>> 0;
        if (pixels[i] === 0) clear++;
        if (pixels[i] > 120) ink++;
        if (pixels[i] > 5 && pixels[i] < 100) detail++;
      }
      return { name, hash, clear, ink, detail };
    });
    return {
      width: a.width,
      height: a.height,
      same: a === pigmentAtlas(),
      masks,
    };
  });
  expect(result.same).toBe(true);
  expect(result.width).toBe(2048);
  expect(result.height).toBe(256);
  expect(new Set(result.masks.map((m) => m.hash)).size).toBe(8);
  for (const m of result.masks) {
    expect(m.clear).toBeGreaterThan(5000);
    expect(m.ink).toBeGreaterThan(10);
    expect(m.detail).toBeGreaterThan(1000);
  }
  await page.reload();
  const hashes = await page.evaluate(async () => {
    const { pigmentAtlas, PIGMENT_CELL, ALPHA_TYPES } =
      await import("/src/squiggle/pigmentAtlas.js");
    const ctx = pigmentAtlas().getContext("2d");
    return ALPHA_TYPES.map((_, tile) => {
      const data = ctx.getImageData(
        tile * PIGMENT_CELL,
        0,
        PIGMENT_CELL,
        PIGMENT_CELL,
      ).data;
      let h = 2166136261;
      for (let i = 3; i < data.length; i += 4)
        h = Math.imul(h ^ data[i], 16777619) >>> 0;
      return h;
    });
  });
  expect(hashes).toEqual(result.masks.map((m) => m.hash));
});

test("offline watercolor works in 2D and 360 without external image requests", async ({
  page,
}) => {
  const external = [],
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.route("https://**", (r) => {
    external.push(r.request().url());
    return r.abort();
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Entrer en 360", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Sources des matières" }),
  ).toHaveCount(0);
  for (const [i, name] of [
    "Feu",
    "Pluie",
    "Ondes",
    "Rayons",
    "Tourbillons",
    "Éclats",
    "Énergie",
    "Brume",
  ].entries()) {
    await page.getByRole("button", { name, exact: true }).click();
    await page.mouse.move(300, 150 + i * 45);
    await page.mouse.down();
    await page.mouse.move(650, 180 + i * 45, { steps: 20 });
    await page.mouse.up();
  }
  await expect(page.locator(".squiggle-paper")).toHaveAttribute(
    "data-strokes",
    "8",
  );
  await page
    .getByRole("button", { name: "Entrer en 360", exact: true })
    .click();
  const canvas = page.locator(".squiggle-world canvas");
  await expect(canvas).toHaveAttribute("data-strokes", "8");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-veils")))
    .toBeGreaterThan(0);
  const stats = await page.evaluate(async () => {
    const { createWatercolorField } =
      await import("/src/squiggle/createWatercolorField.js");
    const f = createWatercolorField({ mobile: true });
    f.setDocument(
      Array.from({ length: 120 }, (_, i) => ({
        id: i,
        emotionId: "peace",
        color: "#358ca1",
        size: 100,
        opacity: 0.8,
        points: Array.from({ length: 50 }, (_, j) => ({
          x: j / 50,
          y: 0.2 + i / 200,
        })),
      })),
    );
    f.update(1);
    const stats = f.stats;
    const finite = f.group.children.every((o) =>
      Object.values(o.geometry.attributes).every((a) =>
        Array.from(a.array).every(Number.isFinite),
      ),
    );
    f.dispose();
    return { stats, finite, remaining: f.group.children.length };
  });
  expect(stats.stats.particles).toBeLessThanOrEqual(2800);
  expect(stats.stats.veils).toBeLessThanOrEqual(160);
  expect(stats.stats.ribbonVertices).toBeLessThanOrEqual(4200);
  expect(stats.finite).toBe(true);
  expect(stats.remaining).toBe(0);
  await page.getByRole("button", { name: "Autres outils" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG ↓", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("squiggle-360.png");
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});
