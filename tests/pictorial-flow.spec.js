import { test, expect } from "@playwright/test";

test("finished pigment follows a bounded inertial field independent of frame rate", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createPictorialFlow } =
      await import("/src/engine/createPictorialFlow.js");
    function run(hz) {
      const flow = createPictorialFlow();
      const mark = {
        traceId: "trace-7",
        object: new THREE.Group(),
        bounds: new THREE.Box3(
          new THREE.Vector3(10, 5, -4),
          new THREE.Vector3(12, 7, -2),
        ),
      };
      const original = mark.bounds.clone(),
        center = original.getCenter(new THREE.Vector3());
      for (let i = 0; i < hz; i++)
        flow.update(mark, 1 / hz, { energy: 1, low: 0.8 }, i / hz, true);
      const activeStill =
        mark.object.position.length() === 0 && mark.bounds.equals(original);
      let maxStep = 0,
        maxDistance = 0,
        previous = center.clone();
      for (let i = 0; i < 120 * hz; i++) {
        flow.update(mark, 1 / hz, { energy: 0.7, low: 0.4 }, i / hz, false);
        const point = center.clone().applyMatrix4(mark.object.matrix);
        maxStep = Math.max(maxStep, point.distanceTo(previous));
        maxDistance = Math.max(maxDistance, point.distanceTo(center));
        previous.copy(point);
      }
      const before = mark.object.matrix.clone();
      flow.update(mark, 0, { energy: 1 }, 999, false);
      return {
        activeStill,
        maxStep,
        maxDistance,
        position: previous.toArray(),
        paused: before.equals(mark.object.matrix),
        bounds: mark.bounds.containsPoint(previous),
      };
    }
    return { a: run(30), b: run(60) };
  });
  for (const run of [result.a, result.b]) {
    expect(run.activeStill).toBe(true);
    expect(run.paused).toBe(true);
    expect(run.bounds).toBe(true);
    expect(run.maxDistance).toBeGreaterThan(0.5);
    expect(run.maxDistance).toBeLessThan(3.5);
    expect(run.maxStep).toBeLessThan(0.04);
  }
  expect(
    Math.hypot(...result.a.position.map((v, i) => v - result.b.position[i])),
  ).toBeLessThan(0.04);
});

test("palette masks are non-figurative, detailed and contain dry paper reserves", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { LANDSCAPE_BRUSHES } =
      await import("/src/materials/landscapePalette.js");
    const { createWatercolorTexture } =
      await import("/src/engine/createWatercolorTexture.js");
    return LANDSCAPE_BRUSHES.map((brush) => {
      const binding = createWatercolorTexture(
        { color: brush.color, kind: brush.textureKind },
        brush.seed,
        128,
      );
      const data = binding.texture.image
        .getContext("2d")
        .getImageData(0, 0, 128, 128).data;
      const levels = new Set();
      let clear = 0,
        opaque = 0;
      for (let i = 3; i < data.length; i += 4) {
        levels.add(data[i]);
        if (data[i] < 12) clear++;
        if (data[i] > 80) opaque++;
      }
      binding.texture.dispose();
      return { id: brush.id, levels: levels.size, clear, opaque };
    });
  });
  expect(result).toHaveLength(6);
  expect(result.map((b) => b.id)).not.toContain("feuilles");
  expect(result.map((b) => b.id)).not.toContain("plumes");
  for (const item of result) {
    expect(item.levels).toBeGreaterThan(50);
    expect(item.clear).toBeGreaterThan(2000);
    expect(item.opaque).toBeGreaterThan(100);
  }
});
