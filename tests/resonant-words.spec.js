import { test, expect } from "@playwright/test";

test("poetry follows weather combinations, remains readable, sparse and paused", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/three/build/three.module.js");
    const { ResonantWords } = await import("/src/simple/ResonantWords.ts");
    const { fragmentsFor, WEATHER_FRAGMENTS } =
      await import("/src/simple/poeticFragments.ts");
    const words = new ResonantWords(),
      camera = new THREE.PerspectiveCamera(68, 0.5, 0.1, 100);
    camera.position.set(0, 18, 2);
    camera.lookAt(0, 18, -10);
    words.setPalette(["warm", "water"]);
    words.update(0, 0, camera, true, true);
    const reduced = words.inspect();
    let maxVisible = 0,
      silent = 0;
    const seen = new Set();
    for (let i = 1; i <= 1200; i++) {
      words.update(i * 0.1, 0.1, camera, false, true);
      const state = words.inspect();
      const visible = state.fades.filter((v) => v > 0.01).length;
      maxVisible = Math.max(maxVisible, visible);
      if (!visible) silent++;
      state.words.forEach((text, j) => {
        if (state.fades[j] > 0.5) seen.add(text);
      });
    }
    const before = words.inspect();
    words.update(120, 1, camera, true, true);
    const after = words.inspect();
    const lines = after.lines;
    words.update(120, 0, camera, true, false);
    const hidden = !words.mesh.visible;
    words.dispose();
    return {
      maxVisible,
      silent,
      seen: [...seen],
      before,
      after,
      lines,
      hidden,
      reduced,
      pool: fragmentsFor(["water", "warm"]),
      reverse: fragmentsFor(["warm", "water"]),
      wind: fragmentsFor(["air", "surprise"]),
      moon: fragmentsFor(["soft", "tired"]),
      count: Object.values(WEATHER_FRAGMENTS).flat().length,
    };
  });
  expect(result.maxVisible).toBe(1);
  expect(result.silent).toBeGreaterThan(600);
  expect(result.seen.length).toBeGreaterThan(2);
  expect(result.pool).toEqual(result.reverse);
  expect(result.pool[0]).toBe("entre l’or et le bleu");
  expect(result.wind[0]).toBe("un seuil possible");
  expect(result.moon[0]).toBe("des plis en suspens");
  expect(result.count).toBe(96);
  expect(result.after).toEqual(result.before);
  expect(result.lines.every((lines) => lines.length <= 2)).toBe(true);
  expect(result.reduced.fades.filter((v) => v > 0)).toHaveLength(1);
  expect(result.hidden).toBe(true);
});

test("a fragment approaches the gaze without moving the camera", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/three/build/three.module.js");
    const { ResonantWords } = await import("/src/simple/ResonantWords.ts");
    const words = new ResonantWords(),
      camera = new THREE.PerspectiveCamera(68, 0.5, 0.1, 100);
    words.setPalette(["warm", "water"]);
    camera.position.set(0, 18, 2);
    camera.lookAt(0, 18, -10);
    for (let i = 0; i < 1000; i++)
      words.update(i * 0.02, 0.02, camera, false, true);
    const focused = words.inspect();
    const position = camera.position.toArray();
    camera.lookAt(8, 18, 2);
    for (let i = 1000; i < 1200; i++)
      words.update(i * 0.02, 0.02, camera, false, true);
    const released = words.inspect();
    words.dispose();
    return { focused, released, position, after: camera.position.toArray() };
  });
  expect(result.focused.focused).toBe("entre l’or et le bleu");
  expect(result.focused.approach).toBeGreaterThan(0.9);
  expect(result.released.focused).toBeNull();
  expect(result.after).toEqual(result.position);
});
