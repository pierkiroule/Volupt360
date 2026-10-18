import { test, expect } from "@playwright/test";

test("emitters follow the actual skinned wing tips in landscape coordinates", async ({
  page,
}) => {
  await page.goto("/?original=1");
  const r = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createOizo } = await import("/src/sonoizo/createOizo.js");
    const parent = new THREE.Group();
    parent.position.set(12, 4, -7);
    parent.rotation.y = 0.7;
    const bird = createOizo();
    parent.add(bird.group);
    const position = new THREE.Vector3(4, 2, 9),
      direction = new THREE.Vector3(0, 0.25, 1).normalize();
    const side = new THREE.Vector3()
      .crossVectors(direction, new THREE.Vector3(0, 1, 0))
      .normalize();
    const up = new THREE.Vector3().crossVectors(side, direction);
    const left = new THREE.Vector3(),
      right = new THREE.Vector3();
    parent.updateMatrixWorld(true);
    bird.update({
      time: 0,
      position,
      direction,
      side,
      up,
      acoustic: { low: 0.2 },
    });
    bird.getWingPosition(0, left);
    bird.getWingPosition(1, right);
    const start = left.clone();
    let error = 0,
      maxMotion = 0;
    for (let i = 1; i <= 90; i++) {
      bird.update({
        time: i / 60,
        position,
        direction,
        side,
        up,
        pilotX: 0.5,
        pilotY: 0.7,
        acoustic: { low: 0.2 },
      });
      bird.getWingPosition(0, left);
      bird.getWingPosition(1, right);
      const mesh = bird.group.getObjectByName("left-wing");
      const expected = new THREE.Vector3();
      mesh.getVertexPosition(33, expected);
      mesh.localToWorld(expected);
      parent.worldToLocal(expected);
      error = Math.max(error, expected.distanceTo(left));
      maxMotion = Math.max(maxMotion, left.distanceTo(start));
    }
    const result = {
      error,
      maxMotion,
      separation: left.distanceTo(right),
      leftDistance: left.distanceTo(position),
      rightDistance: right.distanceTo(position),
    };
    bird.dispose();
    return result;
  });
  expect(r.error).toBeLessThan(0.00001);
  expect(r.maxMotion).toBeGreaterThan(0.03);
  expect(r.separation).toBeGreaterThan(1.1);
  expect(r.leftDistance).toBeLessThan(1.3);
  expect(r.rightDistance).toBeLessThan(1.3);
});

test("touch starts two separate wing strokes and changing brushes closes both streams", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?original=1");
  await page.getByRole("button", { name: "Prendre son envol" }).click();
  await expect(page.locator(".chill-welcome")).toHaveCount(0);
  const canvas = page.locator("#stage canvas");
  await page.mouse.move(170, 330);
  await page.mouse.down();
  await expect(canvas).toHaveAttribute("data-nozzle-paint", "true");
  await expect(canvas).toHaveAttribute("data-paint-emitter", "wings");
  await expect(canvas).toHaveAttribute("data-mark-count", "2");
  const points = JSON.parse(await canvas.getAttribute("data-wing-emitters"));
  expect(
    Math.hypot(...points[0].map((x, i) => x - points[1][i])),
  ).toBeGreaterThan(1.1);
  await page.waitForTimeout(300);
  await page.mouse.up();
  await expect(canvas).toHaveAttribute("data-nozzle-paint", "false");
  await page
    .getByRole("button", { name: "Tourbillons d’encre", exact: true })
    .click();
  await page.mouse.move(170, 330);
  await page.mouse.down();
  await page.waitForTimeout(200);
  await page.mouse.up();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-mark-count")))
    .toBeGreaterThanOrEqual(4);
  await page.getByRole("button", { name: "Faire une pause" }).click();
  const samples = await canvas.getAttribute("data-painted-samples");
  await page.waitForTimeout(200);
  expect(await canvas.getAttribute("data-painted-samples")).toBe(samples);
  await page.screenshot({ path: "/tmp/oizo-wing-trails.png" });
  expect(errors).toEqual([]);
});
