import { test, expect } from "@playwright/test";

test("mobile tool tray is centered, entirely at the bottom, SVG-only and collapsible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Prendre son envol" }).click();
  const tray = page.getByRole("navigation", { name: "Outils de peinture" });
  const bounds = await tray.boundingBox();
  expect(Math.abs(bounds.x + bounds.width / 2 - 195)).toBeLessThan(1);
  expect(bounds.y).toBeGreaterThan(844 - 175);
  const buttons = tray.getByRole("button");
  expect(await buttons.count()).toBe(16);
  expect(
    await buttons.evaluateAll((items) =>
      items.every((b) => b.querySelector("svg") && !b.textContent.trim()),
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Réglage du son" }).click();
  await page.getByRole("slider", { name: "Volume musical" }).fill("0.2");
  await page.getByRole("button", { name: "Replier les outils" }).click();
  await expect(tray.getByRole("button")).toHaveCount(1);
  await expect(
    page.getByRole("group", { name: "Choisir une brosse" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Déplier les outils" }).click();
  await expect(
    page.getByRole("group", { name: "Choisir une brosse" }).getByRole("button"),
  ).toHaveCount(9);
  await page
    .getByRole("button", { name: "Grain minéral", exact: true })
    .click();
  await expect(page.locator("#stage canvas")).toHaveAttribute(
    "data-active-brush",
    "falaises",
  );
  await page.getByRole("button", { name: "Réglage du son" }).click();
  await page.screenshot({ path: "/tmp/oizo-pictorial-toolbar.png" });
  await page.setViewportSize({ width: 320, height: 640 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("painted celestial cycle has a crescent and stars, crosses chromatic stages, then settles to ivory paper", async ({
  page,
}) => {
  await page.goto("/");
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const r = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createChillSky } = await import("/src/chill/createChillSky.js");
    const { sampleExperience } =
      await import("/src/chill/experienceTimeline.js");
    const sky = createChillSky(),
      renderer = new THREE.WebGLRenderer();
    renderer.setSize(192, 192);
    const target = new THREE.WebGLRenderTarget(192, 192);
    renderer.setRenderTarget(target);
    const scene = new THREE.Scene();
    scene.add(sky.object);
    const cam = new THREE.PerspectiveCamera(75, 1, 0.1, 400);
    cam.lookAt(0.48, 0.44, -0.76);
    const pixels = new Uint8Array(192 * 192 * 4);
    const draw = (t) => {
      sky.update(t, {}, t / 360, sampleExperience(t));
      renderer.render(scene, cam);
      renderer.readRenderTargetPixels(target, 0, 0, 192, 192, pixels);
      let red = 0,
        green = 0,
        blue = 0,
        lights = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        red += pixels[i];
        green += pixels[i + 1];
        blue += pixels[i + 2];
        if (pixels[i] > 160 && pixels[i + 1] > 160) lights++;
      }
      const n = 192 * 192;
      return { red: red / n, green: green / n, blue: blue / n, lights };
    };
    const night = draw(0),
      violet = draw(90),
      blue = draw(150),
      sunrise = draw(240),
      rose = draw(300),
      paper = draw(360);
    sky.dispose();
    target.dispose();
    renderer.dispose();
    return { night, violet, blue, sunrise, rose, paper };
  });
  expect(r.night.red).toBeLessThan(20);
  expect(r.night.lights).toBeGreaterThan(0);
  expect(r.violet.blue).toBeGreaterThan(r.violet.green);
  expect(r.blue.blue).toBeGreaterThan(r.blue.red);
  expect(r.sunrise.red).toBeGreaterThan(r.sunrise.blue);
  expect(r.rose.red).toBeGreaterThan(r.rose.blue);
  expect(r.paper.red).toBeGreaterThan(230);
  expect(r.paper.blue).toBeGreaterThan(220);
  expect(errors).toEqual([]);
});
