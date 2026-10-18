import { test, expect } from "@playwright/test";
test("precise touch overrides orbit immediately; release returns to a bounded living orbit", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createPointFlight } =
      await import("/src/engine/createPointFlight.js");
    const flight = createPointFlight(),
      frame = {
        right: new THREE.Vector3(-1, 0, 0),
        up: new THREE.Vector3(0, 1, 0),
      };
    flight.beginPilot();
    let pose;
    for (let i = 0; i < 600; i++) {
      flight.setPilot(0.7, 0.3, frame);
      pose = flight.update(1 / 60, {});
      frame.right
        .crossVectors(pose.direction, new THREE.Vector3(0, 1, 0))
        .normalize();
    }
    const wanted = new THREE.Vector3(-0.7 * 0.85, 0.3 * 0.65, 1).normalize();
    const alignment = pose.direction.dot(wanted),
      last = pose.direction.clone();
    flight.setOrbitTarget(new THREE.Vector3(), 14);
    const startDistance = pose.position.length();
    flight.releasePilot();
    let maxStep = 0,
      minDistance = startDistance;
    for (let i = 0; i < 7200; i++) {
      const previous = pose.position.clone();
      pose = flight.update(1 / 60, {});
      maxStep = Math.max(maxStep, previous.distanceTo(pose.position));
      minDistance = Math.min(minDistance, pose.position.length());
    }
    const orbitDistance = Math.hypot(pose.position.x, pose.position.z),
      autonomous = pose.autonomous;
    flight.beginPilot();
    const captured = pose.direction.clone();
    for (let i = 0; i < 120; i++) pose = flight.update(1 / 60, {});
    const stoppedAuto = !pose.autonomous,
      neutralAlignment = pose.direction.dot(captured);
    return {
      alignment,
      autonomous,
      orbitDistance,
      maxStep,
      minDistance,
      startDistance,
      stoppedAuto,
      neutralAlignment,
      speed: pose.velocity.length(),
    };
  });
  expect(result.alignment).toBeGreaterThan(0.999);
  expect(result.autonomous).toBe(true);
  expect(result.orbitDistance).toBeGreaterThan(10);
  expect(result.orbitDistance).toBeLessThan(26);
  expect(result.minDistance).toBeLessThan(result.startDistance);
  expect(result.maxStep).toBeLessThan(0.05);
  expect(result.stoppedAuto).toBe(true);
  expect(result.neutralAlignment).toBeGreaterThan(0.99999);
  expect(result.speed).toBeCloseTo(2.6);
});
