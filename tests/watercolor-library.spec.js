import { test, expect } from "@playwright/test";

test("procedural library keeps twelve reproducible distinct plates and stable brush-biased selection", async ({
  page,
}) => {
  await page.goto("/");
  const r = await page.evaluate(async () => {
    const {
      createWatercolorTextureLibrary,
      selectWatercolorTexture,
      createWatercolorAtlas,
    } = await import("/src/chill/watercolorTextureLibrary.js");
    const a = createWatercolorTextureLibrary(),
      b = createWatercolorTextureLibrary();
    const signatures = [],
      selections = new Set();
    let identical = true,
      reused = true;
    const checksum = (canvas) => {
      const pixels = canvas
        .getContext("2d")
        .getImageData(0, 0, canvas.width, canvas.height).data;
      let hash = 2166136261;
      for (const value of pixels) hash = Math.imul(hash ^ value, 16777619);
      return hash;
    };
    for (let slot = 0; slot < 12; slot++) {
      const wet = a.get(slot),
        dry = a.get(slot, true);
      reused &&= wet === a.get(slot);
      identical &&= checksum(wet) === checksum(b.get(slot));
      signatures.push(checksum(wet), checksum(dry));
    }
    for (let i = 0; i < 80; i++)
      selections.add(selectWatercolorTexture("water", i * 0.618));
    const atlas = createWatercolorAtlas(),
      count = a.count;
    const width = atlas.width,
      height = atlas.height;
    const canvas = a.get(0);
    a.dispose();
    b.dispose();
    atlas.width = atlas.height = 1;
    return {
      distinct: new Set(signatures).size,
      identical,
      reused,
      count,
      width,
      height,
      selections: [...selections],
      disposed: canvas.width === 1 && a.count === 0,
    };
  });
  expect(r.distinct).toBe(24);
  expect(r.identical && r.reused && r.disposed).toBe(true);
  expect(r.count).toBe(24);
  expect([r.width, r.height]).toEqual([256, 3072]);
  expect(r.selections.length).toBeGreaterThan(3);
  expect(r.selections.every((slot) => [0, 1, 4, 5, 6, 7].includes(slot))).toBe(
    true,
  );
});
