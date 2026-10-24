import { test, expect } from "@playwright/test";

test("tactile detours are smooth, bounded, reversible and freeze in pause", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/three/build/three.module.js");
    const { FlightSteering } = await import("/src/simple/FlightSteering.ts");
    const a = new FlightSteering(),
      b = new FlightSteering();
    const right = new THREE.Vector3(0.8, 0.3, -0.4).normalize(),
      left = new THREE.Vector3(-0.8, 0.3, -0.4).normalize();
    let maxStep = 0,
      previous = new THREE.Vector3();
    for (let i = 0; i < 1800; i++) {
      a.update(1 / 60, right, true, 1);
      b.update(1 / 60, left, true, 1);
      maxStep = Math.max(maxStep, previous.distanceTo(a.offset));
      previous.copy(a.offset);
    }
    const driven = a.offset.toArray(),
      other = b.offset.toArray();
    a.update(0, left, true, 1);
    const paused = a.offset.toArray();
    for (let i = 0; i < 1800; i++) a.update(1 / 60, right, false, 1);
    const returned = a.offset.length();
    a.reset();
    return {
      driven,
      other,
      paused,
      returned,
      maxStep,
      reset: a.offset.length(),
    };
  });
  expect(result.driven[0]).toBeGreaterThan(0);
  expect(result.other[0]).toBeLessThan(0);
  expect(result.driven[1]).toBeGreaterThan(0);
  expect(
    Math.hypot(
      result.driven[0] / 5,
      result.driven[1] / 2.8,
      result.driven[2] / 5,
    ),
  ).toBeLessThanOrEqual(1.001);
  expect(result.maxStep).toBeLessThan(0.025);
  expect(result.paused).toEqual(result.driven);
  expect(result.returned).toBeLessThan(0.05);
  expect(result.reset).toBe(0);
});

test("dragging right steers the actual flight, while contemplation stops translation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-ready", "inside");
  await page.mouse.move(160, 400);
  await page.mouse.down();
  await page.mouse.move(300, 400, { steps: 10 });
  await page.waitForTimeout(1500);
  const offset = (await canvas.getAttribute("data-steering"))
    .split(",")
    .map(Number);
  expect(offset[0]).toBeGreaterThan(0.1);
  await page.mouse.up();
  await page.getByRole("button", { name: "Contempler", exact: true }).click();
  await page.waitForTimeout(5000);
  const before = await canvas.getAttribute("data-position");
  await page.waitForTimeout(300);
  const after = await canvas.getAttribute("data-position");
  const delta = after
    .split(",")
    .map(Number)
    .map((v, i) => v - Number(before.split(",")[i]));
  expect(Math.hypot(...delta)).toBeLessThan(0.001);
});
