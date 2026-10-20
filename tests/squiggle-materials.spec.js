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
  expect(stats.stats.ribbonVertices).toBeGreaterThan(4200);
  expect(stats.stats.ribbonVertices).toBeLessThanOrEqual(
    stats.stats.reliefVertexCapacity,
  );
  expect(stats.finite).toBe(true);
  expect(stats.remaining).toBe(0);
  await page.getByRole("button", { name: "Autres outils" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG ↓", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("squiggle-360.png");
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test("watercolor veils are open, double-sided and translucent with bounded geometry", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createPigmentRibbons } =
      await import("/src/squiggle/createPigmentRibbons.js");
    const { pigmentAtlas } = await import("/src/squiggle/pigmentAtlas.js");
    const texture = new THREE.CanvasTexture(pigmentAtlas()),
      body = createPigmentRibbons(texture, { mobile: true });
    const stroke = {
      id: 1,
      emotionId: "peace",
      color: "#087d99",
      size: 85,
      opacity: 0.9,
      points: [
        { x: 0.22, y: 0.45 },
        { x: 0.27, y: 0.48 },
        { x: 0.34, y: 0.44 },
      ],
    };
    body.setDocument([stroke]);
    const geo = body.mesh.geometry,
      p = geo.attributes.position,
      n = geo.attributes.normal;
    let min = Infinity,
      max = -Infinity,
      normError = 0,
      outward = 0,
      total = 0;
    const a = new THREE.Vector3(),
      b = new THREE.Vector3(),
      c = new THREE.Vector3(),
      expected = new THREE.Vector3();
    for (let i = 0; i < body.vertices; i++) {
      a.fromBufferAttribute(p, i);
      min = Math.min(min, a.length());
      max = Math.max(max, a.length());
      a.fromBufferAttribute(n, i);
      normError = Math.max(normError, Math.abs(a.length() - 1));
    }
    for (let i = 0; i < body.vertices; i += 3) {
      a.fromBufferAttribute(p, i);
      b.fromBufferAttribute(p, i + 1);
      c.fromBufferAttribute(p, i + 2);
      b.sub(a);
      c.sub(a);
      b.cross(c);
      if (b.lengthSq() < 1e-12) continue;
      expected.fromBufferAttribute(n, i);
      if (b.dot(expected) > 0) outward++;
      total++;
    }
    const count = body.vertices;
    const edges = new Map();
    const key = (i) => [p.getX(i), p.getY(i), p.getZ(i)].join(",");
    for (let i = 0; i < count; i += 3)
      for (const [a, b] of [
        [i, i + 1],
        [i + 1, i + 2],
        [i + 2, i],
      ]) {
        const edge = [key(a), key(b)].sort().join("|");
        edges.set(edge, (edges.get(edge) || 0) + 1);
      }
    const openEdges = Array.from(edges.values()).filter((n) => n === 1).length;
    const doubleSided = body.mesh.material.side === THREE.DoubleSide,
      depthWrite = body.mesh.material.depthWrite,
      transparent = body.mesh.material.transparent;
    body.setDocument([{ ...stroke, points: [{ x: 0.3, y: 0.5 }] }]);
    const tap = body.vertices;
    body.setDocument([]);
    const empty = body.vertices;
    body.dispose();
    texture.dispose();
    return {
      openEdges,
      doubleSided,
      depthWrite,
      transparent,
      thickness: max - min,
      normError,
      outward: outward / total,
      count,
      tap,
      empty,
      capacity: body.capacity,
    };
  });
  expect(result.openEdges).toBeGreaterThan(10);
  expect(result.doubleSided).toBe(true);
  expect(result.depthWrite).toBe(false);
  expect(result.transparent).toBe(true);
  expect(result.thickness).toBeGreaterThan(0.1);
  expect(result.normError).toBeLessThan(0.00001);
  expect(result.outward).toBeGreaterThan(0.95);
  expect(result.count).toBeGreaterThan(500);
  expect(result.tap).toBeGreaterThan(0);
  expect(result.tap).toBeLessThanOrEqual(result.capacity);
  expect(result.empty).toBe(0);
});
