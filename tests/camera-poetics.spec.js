import { test, expect } from "@playwright/test";

test("optical pass is bounded, preserves the central view, pauses and releases targets", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/three/build/three.module.js");
    const { CameraPoetics } = await import("/src/simple/CameraPoetics.ts");
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(96, 96);
    const errors = [];
    renderer.debug.onShaderError = (gl, p, v, f) =>
      errors.push(gl.getShaderInfoLog(f) || gl.getProgramInfoLog(p));
    const fx = new CameraPoetics();
    fx.resize(96, 96);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#587f99");
    const camera = new THREE.Camera();
    fx.update(0, 1, false, false);
    fx.render(renderer, scene, camera);
    const initial = fx.inspect();
    fx.update(16, 1, true, false);
    const target = new THREE.WebGLRenderTarget(96, 96);
    renderer.setRenderTarget(target);
    fx.render(renderer, scene, camera);
    const pixels = new Uint8Array(4);
    renderer.readRenderTargetPixels(target, 48, 48, 1, 1, pixels);
    const active = fx.inspect();
    fx.update(16, 1, false, true);
    const paused = fx.inspect();
    fx.resize(120, 80);
    const resized = fx.inspect();
    fx.setReducedQuality();
    fx.update(17, 10, true, false);
    const reduced = fx.inspect();
    fx.dispose();
    const disposed = fx.inspect();
    target.dispose();
    renderer.dispose();
    return {
      errors,
      initial,
      active,
      paused,
      resized,
      reduced,
      disposed,
      pixel: [...pixels],
    };
  });
  expect(result.errors).toEqual([]);
  expect(result.initial.allocated).toBe(false);
  expect(result.active.allocated).toBe(true);
  expect(result.active.amount).toBeGreaterThan(0.5);
  expect(result.paused).toEqual(result.active);
  expect(result.resized.width).toBe(120);
  expect(result.resized.height).toBe(80);
  expect(result.reduced.amount).toBeLessThan(0.002);
  expect(result.disposed.allocated).toBe(false);
  expect(result.pixel[3]).toBe(255);
  expect(result.pixel[2]).toBeGreaterThan(result.pixel[0]);
});

test("flight ramps smoothly and pause freezes travel and optical progression", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-ready", "inside");
  await expect(
    page.getByRole("button", { name: "Contempler", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-travel-speed")))
    .toBeGreaterThan(0.3);
  const speed = Number(await canvas.getAttribute("data-travel-speed"));
  expect(speed).toBeLessThan(1);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.waitForTimeout(250);
  const before = await canvas.evaluate((c) => ({
    position: c.dataset.position,
    speed: c.dataset.travelSpeed,
    fx: c.dataset.cameraFx,
  }));
  await page.waitForTimeout(350);
  const after = await canvas.evaluate((c) => ({
    position: c.dataset.position,
    speed: c.dataset.travelSpeed,
    fx: c.dataset.cameraFx,
  }));
  expect(after).toEqual(before);
  expect(Number(await canvas.getAttribute("data-calls"))).toBeLessThanOrEqual(
    12,
  );
});

test("returning to the palette while paused clears travel optics", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  await expect(
    page.getByRole("button", { name: "Contempler", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: "Revenir à la palette" }).click();
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-camera-fx", "0.000");
  await expect(canvas).toHaveAttribute("data-travel-speed", "0.000");
  await expect(canvas).toHaveAttribute("data-calls", "9");
});
