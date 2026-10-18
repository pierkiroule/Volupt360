import { test, expect } from "@playwright/test";
test("fixed finger converges to a fixed point and release keeps heading", async ({
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
    flight.releasePilot();
    for (let i = 0; i < 600; i++) pose = flight.update(1 / 60, {});
    return {
      alignment,
      after: pose.direction.dot(last),
      speed: pose.velocity.length(),
    };
  });
  expect(result.alignment).toBeGreaterThan(0.999);
  expect(result.after).toBeGreaterThan(0.99999);
  expect(result.speed).toBeCloseTo(2.6);
});
