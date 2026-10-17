import { test, expect } from "@playwright/test";

test("held control stays expressive and releasing it steers gently into the sculpture", async ({
  page,
}) => {
  await page.goto("/");
  const r = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createSonoizoDance } = await import("/src/sonoizo/SonoizoDance.js");
    const dance = createSonoizoDance(),
      target = new THREE.Vector3(2, 1, 0),
      frame = {
        right: new THREE.Vector3(1, 0, 0),
        up: new THREE.Vector3(0, 1, 0),
      };
    dance.setVisitTarget(target);
    dance.beginPilot();
    dance.setPilot(0.65, 0.35, frame);
    let held;
    for (let i = 0; i < 120; i++) held = dance.update(1 / 60, []);
    const start = held.position.distanceTo(target),
      heldValue = held.pilotX,
      heldVisit = held.visiting;
    dance.releasePilot();
    let min = start,
      maxStep = 0,
      maxAngle = 0,
      lastPosition = held.position.clone(),
      lastDirection = held.direction.clone(),
      end;
    for (let i = 0; i < 1800; i++) {
      end = dance.update(1 / 60, []);
      min = Math.min(min, end.position.distanceTo(target));
      maxStep = Math.max(maxStep, end.position.distanceTo(lastPosition));
      maxAngle = Math.max(maxAngle, end.direction.angleTo(lastDirection));
      lastPosition.copy(end.position);
      lastDirection.copy(end.direction);
    }
    dance.beginPilot();
    dance.setPilot(-0.6, 0, frame);
    for (let i = 0; i < 60; i++) end = dance.update(1 / 60, []);
    return {
      heldValue,
      heldVisit,
      start,
      min,
      maxStep,
      maxAngle,
      returnVisit: end.visiting,
      pilot: end.pilotX,
    };
  });
  expect(r.heldValue).toBeCloseTo(0.65, 2);
  expect(r.heldVisit).toBeLessThan(0.01);
  expect(r.min).toBeLessThan(5);
  expect(r.min).toBeLessThan(r.start * 0.3);
  expect(r.maxStep).toBeLessThan(0.2);
  expect(r.maxAngle).toBeLessThan(0.2);
  expect(r.returnVisit).toBeLessThan(0.02);
  expect(r.pilot).toBeCloseTo(-0.6, 2);
});

test("FPV touch displacement holds its direction and release starts a visit of old paint", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?classic=1");
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  const canvas = page.locator("#stage canvas");
  await page.mouse.move(170, 340);
  await page.mouse.down();
  await expect(canvas).toHaveAttribute("data-nozzle-paint", "true");
  await page.waitForTimeout(2500);
  await page.mouse.up();
  await expect
    .poll(
      async () => Number(await canvas.getAttribute("data-flight-visiting")),
      { timeout: 6000 },
    )
    .toBeGreaterThan(0.3);
  await page.mouse.move(170, 350);
  await page.mouse.down();
  await page.mouse.move(240, 300, { steps: 8 });
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-flight-visiting")))
    .toBeLessThan(0.05);
  const input = await canvas.getAttribute("data-steering-input");
  expect(Number(input.split(",")[0])).toBeGreaterThan(0);
  expect(Number(input.split(",")[1])).toBeGreaterThan(0);
  await page.mouse.up();
});

test("wing rig expresses held steering before the flight direction has caught up", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createOizo } = await import("/src/sonoizo/createOizo.js");
    function measure(input) {
      const bird = createOizo();
      for (let i = 0; i < 120; i++)
        bird.update({
          time: i / 60,
          position: new THREE.Vector3(),
          direction: new THREE.Vector3(0, 0, 1),
          side: new THREE.Vector3(-1, 0, 0),
          up: new THREE.Vector3(0, 1, 0),
          pilotX: input,
          pilotY: 0.5,
        });
      const bank = bird.group.children[0].rotation.z;
      bird.dispose();
      return bank;
    }
    return { right: measure(0.8), left: measure(-0.8), neutral: measure(0) };
  });
  expect(result.right).toBeGreaterThan(0.15);
  expect(result.left).toBeLessThan(-0.15);
  expect(Math.abs(result.neutral)).toBeLessThan(0.01);
});
