import { test, expect } from "@playwright/test";

test("drone framing answers turns and climbs continuously with bounded distance and roll", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createDroneChoreography } =
      await import("/src/engine/createDroneChoreography.js");
    function run(hz) {
      const drone = createDroneChoreography(),
        direction = new THREE.Vector3(),
        velocity = new THREE.Vector3();
      let last,
        straight,
        turn,
        climb,
        maxStep = 0,
        minDistance = 100,
        maxDistance = 0;
      for (let i = 0; i < hz * 18; i++) {
        const t = i / hz,
          yaw = t < 4 ? 0 : t < 10 ? (t - 4) * 0.65 : 3.9;
        const slope = t > 10 && t < 15 ? 0.5 : 0;
        direction.set(Math.sin(yaw), slope, Math.cos(yaw)).normalize();
        velocity.copy(direction).multiplyScalar(6);
        const shot = drone.update(direction, velocity, 1 / hz);
        if (last)
          maxStep = Math.max(
            maxStep,
            Math.abs(shot.distance - last.distance),
            Math.abs(shot.side - last.side),
          );
        minDistance = Math.min(minDistance, shot.distance);
        maxDistance = Math.max(maxDistance, shot.distance);
        if (i === hz * 3) straight = { ...shot };
        if (i === hz * 9) turn = { ...shot };
        if (i === hz * 14) climb = { ...shot };
        last = { ...shot };
      }
      return { straight, turn, climb, last, maxStep, minDistance, maxDistance };
    }
    return { a: run(30), b: run(60) };
  });
  for (const r of [result.a, result.b]) {
    expect(r.turn.distance - r.straight.distance).toBeGreaterThan(0.7);
    expect(r.turn.frameSide).toBeGreaterThan(0.1);
    expect(Math.abs(r.turn.bank)).toBeGreaterThan(0.02);
    expect(Math.abs(r.turn.bank)).toBeLessThan(0.08);
    expect(r.climb.height - r.straight.height).toBeGreaterThan(0.1);
    expect(r.maxStep).toBeLessThan(0.04);
    expect(r.minDistance).toBeGreaterThan(6);
    expect(r.maxDistance).toBeLessThan(8.7);
  }
  expect(result.a.last.distance).toBeCloseTo(result.b.last.distance, 2);
});
