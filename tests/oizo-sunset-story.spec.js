import { test, expect } from "@playwright/test";

test("sunset sphere provides a seamless directional horizon and releases resources", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createSunsetSky } = await import("/src/engine/createSunsetSky.js");
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(96, 96);
    const sky = createSunsetSky(),
      scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(80, 1, 0.08, 400),
      target = new THREE.WebGLRenderTarget(96, 96),
      pixels = new Uint8Array(96 * 96 * 4);
    scene.add(sky.mesh);
    camera.position.set(29, 8, 40);
    camera.lookAt(29, 8, 0);
    sky.update(camera);
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(target, 0, 0, 96, 96, pixels);
    const upper = [...pixels.slice((80 * 96 + 48) * 4, (80 * 96 + 48) * 4 + 3)],
      horizon = [...pixels.slice((48 * 96 + 48) * 4, (48 * 96 + 48) * 4 + 3)];
    const center = sky.mesh.position.equals(camera.position),
      count = scene.children.length;
    let disposed = 0;
    sky.mesh.geometry.addEventListener("dispose", () => disposed++);
    sky.mesh.material.addEventListener("dispose", () => disposed++);
    sky.dispose();
    target.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    return { upper, horizon, center, count, disposed };
  });
  expect(result.center).toBe(true);
  expect(result.count).toBe(1);
  expect(result.upper).not.toEqual(result.horizon);
  expect(Math.min(...result.horizon)).toBeGreaterThan(150);
  expect(result.disposed).toBe(2);
});

test("narrative, paper background, imported music and abstract brushes coexist in FPV and 360", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await page.getByText("La démarche artistique", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sculpter les matières du monde" }),
  ).toBeAttached();
  await expect(page.locator(".artistic-lead")).toContainText(
    "papier sans horizon",
  );
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  await page
    .getByLabel("Importer un MP3", { exact: true })
    .setInputFiles("public/ambiances/ambiance01.mp3");
  const canvas = page.locator("#stage canvas");
  await expect(canvas).toHaveAttribute("data-skydome", "off-white-paper");
  await expect(
    page.getByRole("button", { name: "Mettre l’ambiance en pause" }),
  ).toBeVisible();
  await expect(page.locator(".landscape-palette button")).toHaveCount(6);
  await page
    .getByRole("button", { name: "FPV 360° gyro", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-skydome", "off-white-paper");
  await page.waitForTimeout(600);
  await page.screenshot({ path: "/tmp/oizo-sunset-360.png" });
  await page.getByRole("button", { name: "Vue photo", exact: true }).click();
  await expect(page.getByRole("button", { name: /PNG HD/ })).toBeVisible();
  await page.getByRole("button", { name: "FPV drone", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Mettre l’ambiance en pause" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
