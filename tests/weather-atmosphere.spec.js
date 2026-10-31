import { test, expect } from "@playwright/test";

test("faces compose distinct climates, with mixed sun and rain rather than one fixed world", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { weatherClimate, CLIMATES } =
      await import("/src/simple/WeatherClimate.ts");
    const singles = Object.keys(CLIMATES).map((id) => weatherClimate([id]));
    return {
      singles,
      mix: weatherClimate(["warm", "water"]),
      reverse: weatherClimate(["water", "warm"]),
      sun: weatherClimate(["warm"]),
      rain: weatherClimate(["water"]),
      snow: weatherClimate(["surprise"]),
      invalid: weatherClimate(["invalid"]),
    };
  });
  expect(result.singles).toHaveLength(12);
  expect(new Set(result.singles.map((c) => JSON.stringify(c))).size).toBe(12);
  expect(result.mix.rain).toBeGreaterThan(0.4);
  expect(result.mix.rainbow).toBeGreaterThan(0);
  expect(result.mix.elevation).toBeGreaterThan(result.rain.elevation);
  expect(result.mix.cover).toBeGreaterThan(result.sun.cover);
  expect(result.reverse.seed).not.toBe(result.mix.seed);
  expect(result.snow.snow).toBeGreaterThan(0.5);
  expect(result.invalid.sequence).toEqual(["warm"]);
});

test("the live atmosphere preserves emoji selection, travel, pause, audio and three bounded draws", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /shader|WebGL|GL_INVALID/i.test(m.text()))
      errors.push(m.text());
  });
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(page.locator(".simple-nuance")).toHaveCount(12);
  await expect(canvas).toHaveAttribute("data-sky", "atmosphere");
  await expect(canvas).toHaveAttribute("data-clouds", "112");
  await page.screenshot({ path: testInfo.outputPath("weather-preview.png") });
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  await expect(canvas).toHaveAttribute("data-ready", "inside");
  await expect(canvas).toHaveAttribute("data-calls", "3");
  await expect(page.locator(".simple-music")).toHaveAttribute(
    "data-state",
    "on",
  );
  await page.screenshot({ path: testInfo.outputPath("weather-flight.png") });
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-reaction-paused", "true");
  const time = await canvas.getAttribute("data-time");
  await page.waitForTimeout(300);
  expect(await canvas.getAttribute("data-time")).toBe(time);
  await expect(canvas).toHaveAttribute("data-pigment", "idle");
  await page.getByRole("button", { name: "Revenir à la palette" }).click();
  await expect(
    page.getByRole("group", { name: "Choisir une à trois émotions" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("the GPU atmosphere changes with climate and viewpoint without recreating buffers", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const T = await import("/node_modules/three/build/three.module.js");
    const { WeatherAtmosphere } =
      await import("/src/simple/WeatherAtmosphere.ts");
    const renderer = new T.WebGLRenderer({ preserveDrawingBuffer: true });
    renderer.setSize(320, 240);
    const scene = new T.Scene(),
      weather = new WeatherAtmosphere(true);
    scene.add(weather.group);
    const camera = new T.PerspectiveCamera(68, 320 / 240, 0.1, 80);
    camera.position.set(0, 18, 12);
    camera.lookAt(0, 20, -5);
    const errors = [];
    renderer.debug.onShaderError = (gl, p, v, f) =>
      errors.push(gl.getShaderInfoLog(v) + gl.getShaderInfoLog(f));
    const target = new T.WebGLRenderTarget(320, 240);
    target.texture.colorSpace = T.SRGBColorSpace;
    const pixels = new Uint8Array(320 * 240 * 4),
      hashes = [],
      pictures = [];
    for (const [name, ids] of [
      ["sun", ["warm"]],
      ["rain", ["water"]],
      ["sun-rain", ["warm", "water"]],
      ["snow", ["surprise"]],
      ["storm", ["night"]],
      ["night", ["tired"]],
    ]) {
      weather.setPalette(ids);
      weather.update(3, camera, 1);
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.readRenderTargetPixels(target, 0, 0, 320, 240, pixels);
      let hash = 0;
      for (let i = 0; i < pixels.length; i += 4)
        hash =
          (Math.imul(hash, 31) +
            pixels[i] +
            pixels[i + 1] * 3 +
            pixels[i + 2] * 7) >>>
          0;
      hashes.push(hash);
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
      pictures.push({ name, png: renderer.domElement.toDataURL() });
    }
    const count = renderer.info.render.calls,
      geometry = renderer.info.memory.geometries,
      textures = renderer.info.memory.textures;
    camera.position.set(3, 20, -3);
    camera.lookAt(-10, 23, -10);
    weather.update(3, camera, 1);
    renderer.render(scene, camera);
    pictures.push({
      name: "inside-cloud",
      png: renderer.domElement.toDataURL(),
    });
    const stable =
      renderer.info.memory.geometries === geometry &&
      renderer.info.memory.textures === textures;
    const field = weather.group.getObjectByName("cloud-field");
    const centers = field.geometry.attributes.center,
      sizes = field.geometry.attributes.size;
    for (let i = 0; i < centers.count; i++)
      if (sizes.getX(i) > 0 && centers.getY(i) > 16) {
        camera.position.fromBufferAttribute(centers, i);
        break;
      }
    for (let i = 0; i < 180; i++) weather.update(3 + i / 60, camera, 1);
    const insideMist = weather.inspect().mist;
    weather.update(3 + 179 / 60, camera, 1);
    const frozenMist = weather.inspect().mist;
    camera.position.set(0, 36, 32);
    for (let i = 0; i < 240; i++) weather.update(6 + i / 60, camera, 1);
    const outsideMist = weather.inspect().mist;
    weather.dispose();
    target.dispose();
    const released = renderer.info.memory.textures;
    renderer.dispose();
    return {
      errors,
      hashes,
      pictures,
      count,
      stable,
      released,
      insideMist,
      frozenMist,
      outsideMist,
    };
  });
  const { writeFile } = await import("node:fs/promises");
  for (const p of result.pictures)
    await writeFile(
      testInfo.outputPath(`${p.name}.png`),
      Buffer.from(p.png.split(",")[1], "base64"),
    );
  expect(result.errors).toEqual([]);
  expect(new Set(result.hashes).size).toBe(6);
  expect(result.count).toBeLessThanOrEqual(3);
  expect(result.stable).toBe(true);
  expect(result.released).toBe(0);
  expect(result.insideMist).toBeGreaterThan(0.2);
  expect(result.frozenMist).toBe(result.insideMist);
  expect(result.outsideMist).toBeLessThan(0.02);
});
