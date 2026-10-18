import { test, expect } from "@playwright/test";

test("FPV follows the bird at a stable distance and keeps its heading", async ({
  page,
}) => {
  await page.goto("/");
  const r = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createCameraRig } = await import("/src/engine/createCameraRig.js");
    const camera = new THREE.PerspectiveCamera(),
      landscape = new THREE.Group(),
      canvas = document.createElement("canvas");
    landscape.rotation.y = 0.7;
    const state = {
      position: new THREE.Vector3(8, 2, 4),
      direction: new THREE.Vector3(1, 0.2, 1).normalize(),
      velocity: new THREE.Vector3(1, 0, 1),
      bounds: new THREE.Sphere(new THREE.Vector3(), 20),
      windEnabled: true,
    };
    const rig = createCameraRig(
      camera,
      canvas,
      landscape,
      () => state,
      () => {},
    );
    rig.update(1 / 60);
    const expected = state.position.clone().applyMatrix4(landscape.matrixWorld);
    const forward = state.direction
      .clone()
      .transformDirection(landscape.matrixWorld);
    expected.addScaledVector(forward, -5.5);
    const error = camera.position.distanceTo(expected),
      alignment = camera.getWorldDirection(new THREE.Vector3()).dot(forward);
    rig.dispose();
    return { error, alignment };
  });
  expect(r.error).toBeLessThan(0.00001);
  expect(r.alignment).toBeGreaterThan(0.9999);
});

test("mobile starts in bird-follow FPV, touch immediately paints while steering", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "🌊", exact: true }).click();
  await page.getByRole("button", { name: "Faire éclore mon OIZO" }).click();
  const canvas = page.locator("#stage canvas");
  await expect(canvas).toHaveAttribute(
    "data-drone-intent",
    "point-guided-follow",
  );
  await expect(canvas).toHaveAttribute("data-oizo-visible", "true");
  await expect(canvas).toHaveAttribute("data-fpv-follow-distance", "5.5");
  await page.evaluate(() => {
    window.addEventListener("pointerdown", (event) => {
      if (event.target.tagName === "CANVAS")
        window.__contactPaint = {
          active: event.target.dataset.nozzlePaint,
          samples: Number(event.target.dataset.paintedSamples),
        };
    });
  });
  await page.mouse.move(150, 350);
  await page.mouse.down();
  const contact = await page.evaluate(() => window.__contactPaint);
  expect(contact.active).toBe("true");
  expect(contact.samples).toBeGreaterThan(0);
  await page.mouse.move(225, 310, { steps: 8 });
  await expect(canvas).toHaveAttribute("data-nozzle-paint", "true");
  await expect(canvas).toHaveAttribute(
    "data-steering-input",
    /^0\.[0-9]+,0\.[0-9]+$/,
  );
  await page.mouse.up();
  await page.mouse.move(150, 350);
  await page.mouse.down();
  await expect(canvas).toHaveAttribute("data-nozzle-paint", "true");
  await page.waitForTimeout(900);
  await page.mouse.up();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-mark-count")))
    .toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
