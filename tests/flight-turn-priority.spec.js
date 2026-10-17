import { test, expect } from "@playwright/test";

test("screen-right and screen-left steering keep their sign around the sculpture and during visits", async ({
  page,
}) => {
  await page.goto("/");
  const results = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createOrbitalFlight } =
      await import("/src/engine/createOrbitalFlight.js");
    const results = [];
    for (const seconds of [0, 8, 17, 29])
      for (const sign of [-1, 1])
        for (const visit of [0, 1]) {
          const flight = createOrbitalFlight(),
            audio = { energy: 0.2 },
            zero = new THREE.Vector3();
          let pose;
          for (let i = 0; i <= seconds * 60; i++)
            pose = flight.update(1 / 60, audio, zero);
          // A following camera looks along the bird heading: its screen right is heading × up.
          const right = new THREE.Vector3()
            .crossVectors(pose.direction, new THREE.Vector3(0, 1, 0))
            .normalize();
          const wind = right.clone().multiplyScalar(sign * 7);
          const target = new THREE.Vector3(0, 0, 0);
          for (let i = 0; i < 90; i++)
            pose = flight.update(1 / 60, audio, wind, target, visit);
          results.push({
            seconds,
            sign,
            visit,
            projection: pose.velocity.dot(right) * sign,
          });
        }
    return results;
  });
  for (const result of results)
    expect(result.projection, JSON.stringify(result)).toBeGreaterThan(1);
});
