import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("twelve emoji folders each expose three replaceable image slots", async ({
  page,
}) => {
  await page.goto("/");
  const catalog = await (
    await page.request.get("/textures/catalog.json")
  ).json();
  expect(catalog.entries).toHaveLength(12);
  for (const entry of catalog.entries) {
    expect(entry.layers).toHaveLength(3);
    for (const layer of entry.layers) {
      const image = await readFile("public/textures/" + layer.path);
      expect(image.length).toBeGreaterThan(1000);
    }
  }
});
test("seeded photomontages mix selected ingredients, are reproducible, cached and bounded", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { TextureLibraryFactory } =
      await import("/src/squiggle/textures/TextureLibraryFactory.js");
    const { EMOJI_INGREDIENTS } =
      await import("/src/squiggle/squibbleUniverse.js");
    const a = new TextureLibraryFactory(),
      b = new TextureLibraryFactory(),
      choices = EMOJI_INGREDIENTS.slice(0, 3);
    const first = await a.compose(choices, { seed: "test" }),
      cached = await a.compose(choices, { seed: "test" }),
      again = await b.compose([...choices].reverse(), { seed: "test" });
    const hash = (r) =>
      Object.values(r.photos)
        .map((p) => p.canvas.toDataURL())
        .join("");
    const same = hash(first) === hash(again),
      hit = first === cached;
    const other = await a.compose([EMOJI_INGREDIENTS[4]], { seed: "test" });
    const different = hash(first) !== hash(other);
    for (let i = 0; i < 7; i++)
      await a.compose([EMOJI_INGREDIENTS[i]], { seed: String(i) });
    const stats = a.stats,
      photoCount = Object.keys(first.photos).length,
      emojis = new Set(Object.values(first.photos).map((p) => p.emoji)).size;
    const cross = Object.values(first.photos).every((p) =>
      p.provenance.some(
        (path) => !path.includes("/" + p.id.split("-")[0] + "/"),
      ),
    );
    const materials = Object.keys(first.materials).length;
    a.dispose();
    b.dispose();
    return {
      same,
      hit,
      different,
      stats,
      photoCount,
      emojis,
      cross,
      materials,
    };
  });
  expect(result).toMatchObject({
    same: true,
    hit: true,
    different: true,
    photoCount: 6,
    emojis: 3,
    cross: true,
    materials: 8,
  });
  expect(result.stats.sources).toBeLessThanOrEqual(16);
  expect(result.stats.compositions).toBeLessThanOrEqual(4);
  expect(result.stats.hits).toBeGreaterThan(0);
});
test("missing slots fall back and rapid selections cannot publish stale montages", async ({
  page,
}) => {
  await page.route("**/textures/emojis/feu/Feubase01.png", (r) =>
    r.fulfill({ status: 404, body: "missing" }),
  );
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { TextureLibraryFactory } =
      await import("/src/squiggle/textures/TextureLibraryFactory.js");
    const { EMOJI_INGREDIENTS } =
      await import("/src/squiggle/squibbleUniverse.js");
    const factory = new TextureLibraryFactory();
    const fallback = await factory.compose([EMOJI_INGREDIENTS[0]]);
    const pending = [];
    for (let i = 0; i < 12; i++)
      pending.push(
        factory.compose(EMOJI_INGREDIENTS.slice(i % 9, (i % 9) + 3), {
          seed: String(i),
        }),
      );
    const results = await Promise.all(pending);
    const latest = results.at(-1),
      sources = factory.stats.sources,
      queue = factory.stats.queued,
      active = factory.stats.active;
    const valid = Boolean(latest),
      seed = latest?.seed,
      usedFallback = fallback.provenance.includes("Text1.png");
    factory.dispose();
    return { valid, seed, usedFallback, sources, queue, active };
  });
  expect(result).toMatchObject({
    valid: true,
    seed: "11",
    usedFallback: true,
    queue: 0,
    active: 0,
  });
  expect(result.sources).toBeLessThanOrEqual(16);
});
test("three emoji selections enrich watercolor without photo bubbles", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  for (const name of ["Feu", "Vague", "Fleur"])
    await page.getByRole("button", { name, exact: true }).click();
  await expect(page.locator("main")).toHaveAttribute(
    "data-texture-library",
    "ready",
  );
  await expect(page.locator(".squibble-orb canvas")).toHaveAttribute(
    "data-photo-bubbles",
    "0",
  );
  await page
    .getByRole("button", { name: "Entrer dans mon monde", exact: true })
    .click();
  await expect(page.locator(".squiggle-world canvas")).toHaveAttribute(
    "data-photo-bubbles",
    "0",
  );
  expect(errors).toEqual([]);
});
test("replacing a slot image changes the resulting photo without changing code", async ({
  page,
}) => {
  await page.goto("/");
  const data = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ff00bb";
    ctx.fillRect(0, 0, 32, 32);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page.route("**/textures/emojis/feu/Feubase01.png", (r) =>
    r.fulfill({ contentType: "image/png", body: Buffer.from(data, "base64") }),
  );
  const pixel = await page.evaluate(async () => {
    const { TextureLibraryFactory } =
      await import("/src/squiggle/textures/TextureLibraryFactory.js");
    const f = new TextureLibraryFactory();
    const r = await f.compose([{ emoji: "🔥" }]);
    const pixels = r.photos["feu-0"].canvas
      .getContext("2d")
      .getImageData(128, 128, 1, 1).data;
    f.dispose();
    return [...pixels];
  });
  expect(pixel[0] - pixel[1]).toBeGreaterThan(40);
  expect(pixel[2] - pixel[1]).toBeGreaterThan(20);
});
