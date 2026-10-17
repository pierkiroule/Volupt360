import { test, expect } from "@playwright/test";

test("emoji combinations interpolate reproducible universes and five distinct living brush families", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { echoMoodEngine, MOOD_EMOJIS } =
      await import("/src/echoMood/echoMoodEngine.js");
    const { brushFactory } = await import("/src/echoMood/brushFactory.js");
    const { universeGenerator } =
      await import("/src/echoMood/universeGenerator.js");
    const { musicSelector } = await import("/src/echoMood/musicSelector.js");
    const a = echoMoodEngine(["🌊", "🌙"], 7),
      b = echoMoodEngine(["🔥", "☀️"], 7),
      again = echoMoodEngine(["🌙", "🌊"], 7),
      variation = echoMoodEngine(["🌊", "🌙"], 8);
    const brushesA = brushFactory(a),
      brushesB = brushFactory(b);
    let invalid = 0;
    for (const list of [[], MOOD_EMOJIS.slice(0, 4)])
      try {
        echoMoodEngine(list);
      } catch {
        invalid++;
      }
    return {
      count: MOOD_EMOJIS.length,
      a,
      b,
      again,
      variation,
      brushesA,
      brushesB,
      backgroundA: universeGenerator(a).background,
      backgroundB: universeGenerator(b).background,
      invalid,
      silent: musicSelector(a, []),
      track: musicSelector(a, ["one.mp3", "two.mp3"]),
      trackAgain: musicSelector(again, ["one.mp3", "two.mp3"]),
    };
  });
  expect(result.count).toBeGreaterThanOrEqual(24);
  expect(result.count).toBeLessThanOrEqual(32);
  expect(result.a).toEqual(result.again);
  expect(result.a.palette).not.toEqual(result.b.palette);
  expect(result.backgroundA).not.toEqual(result.backgroundB);
  expect(result.variation.palette).not.toEqual(result.a.palette);
  expect(result.brushesA.map((b) => b.name)).toEqual([
    "Souffle",
    "Plume",
    "Battement",
    "Éclosion",
    "Envol",
  ]);
  expect(new Set(result.brushesA.map((b) => b.baseId)).size).toBe(5);
  for (let i = 0; i < 5; i++) {
    expect(result.brushesA[i].color).not.toBe(result.brushesB[i].color);
    expect(result.brushesA[i].width).not.toBe(result.brushesB[i].width);
    expect(result.brushesA[i].speed).not.toBe(result.brushesB[i].speed);
  }
  expect(result.invalid).toBe(2);
  expect(result.silent).toBeNull();
  expect(result.track).toBe(result.trackAgain);
});

test("mobile EchoMood blooms, plays its MP3 and sculpts all five materials directly", async ({
  page,
}) => {
  test.setTimeout(45000);
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  const bloom = page.getByRole("button", { name: "Faire éclore mon OIZO" });
  await expect(bloom).toBeDisabled();
  for (const emoji of ["🌊", "🌙", "🌿"])
    await page.getByRole("button", { name: emoji, exact: true }).click();
  await expect(
    page.getByRole("button", { name: "🔥", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "🌿", exact: true }).click();
  await bloom.click();
  const canvas = page.locator("#stage canvas");
  await expect(canvas).toHaveAttribute("data-camera-mode", "sculpt");
  await expect(canvas).toHaveAttribute("data-oizo-visible", "false");
  await expect(page.locator(".landscape-palette button")).toHaveCount(5);
  await expect(
    page.getByRole("button", { name: "Mettre l’ambiance en pause" }),
  ).toBeVisible();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-music-energy")))
    .toBeGreaterThan(0.01);
  const firstBackground = await canvas.getAttribute("data-mood-background");
  for (const name of ["Souffle", "Plume", "Battement", "Éclosion", "Envol"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await page.mouse.move(95, 390);
    await page.mouse.down();
    await expect(canvas).toHaveAttribute("data-direct-drawing", "true");
    await page.mouse.move(275, 300, { steps: 16 });
    await page.mouse.move(170, 460, { steps: 16 });
    await page.mouse.up();
    await expect(canvas).toHaveAttribute("data-direct-drawing", "false");
  }
  expect(
    (await canvas.getAttribute("data-painted-brushes")).split(","),
  ).toHaveLength(5);
  await page.getByLabel("Volume musical").fill("0.2");
  await page
    .getByRole("button", { name: "Vue globale 360°", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-camera-mode", "global");
  await page.screenshot({ path: "/tmp/echo-mood-cool-global.png" });
  await page
    .getByRole("button", { name: "Vue globale 360°", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-camera-mode", "sculpt");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Photographier la vue actuelle" })
    .click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
  await page.getByRole("button", { name: "Changer d’ÉchoMood" }).click();
  await page.getByRole("button", { name: "🔥", exact: true }).click();
  await page.getByRole("button", { name: "Faire éclore mon OIZO" }).click();
  await expect(canvas).not.toHaveAttribute(
    "data-mood-background",
    firstBackground,
  );
  await expect(page.locator(".landscape-palette button")).toHaveCount(5);
  await expect(canvas).toHaveAttribute("data-mark-count", "0");
  await page.screenshot({ path: "/tmp/echo-mood-warm.png" });
  expect(errors).toEqual([]);
});

test("unavailable musical library permits silent sculpture without an application error", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/ambiances/*.mp3", (route) =>
    route.fulfill({ status: 404, body: "" }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "🫧", exact: true }).click();
  await page.getByRole("button", { name: "Faire éclore mon OIZO" }).click();
  const canvas = page.locator("#stage canvas");
  await expect(canvas).toHaveAttribute("data-camera-mode", "sculpt");
  await page.mouse.move(100, 320);
  await page.mouse.down();
  await page.mouse.move(280, 410, { steps: 20 });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-painted-samples")))
    .toBeGreaterThan(2);
  await expect(page.locator(".ambience-error")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("changing mood while music loads leaves the picker usable", async ({
  page,
}) => {
  await page.route("**/ambiances/*.mp3", () => {});
  await page.goto("/");
  await page.getByRole("button", { name: "🌊", exact: true }).click();
  await page.getByRole("button", { name: "Faire éclore mon OIZO" }).click();
  await page.getByRole("button", { name: "Changer d’ÉchoMood" }).click();
  await expect(
    page.getByRole("button", { name: "🔥", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "🔥", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Faire éclore mon OIZO" }),
  ).toBeEnabled();
});

test("five generated brush geometries visibly evolve and react to audio on the GPU", async ({
  page,
}) => {
  await page.goto("/");
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { echoMoodEngine } = await import("/src/echoMood/echoMoodEngine.js");
    const { brushFactory } = await import("/src/echoMood/brushFactory.js");
    const { createBrushStroke, disposeMark } =
      await import("/src/engine/brushes.js");
    const { createWatercolorTexture } =
      await import("/src/engine/createWatercolorTexture.js");
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(96, 96);
    const target = new THREE.WebGLRenderTarget(96, 96);
    renderer.setRenderTarget(target);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f4f0e8");
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 1, 9);
    camera.lookAt(0, 0, 0);
    const results = [];
    for (const profile of brushFactory(echoMoodEngine(["🌊", "🌙"]))) {
      const binding = createWatercolorTexture(
        { color: profile.color, kind: profile.textureKind },
        profile.seed,
        128,
      );
      const stroke = createBrushStroke(profile.baseId, {
        seed: profile.seed % 100,
        color: new THREE.Color(profile.color),
        texture: binding,
        dynamics: profile,
      });
      scene.add(stroke.group);
      for (let i = 0; i < 24; i++)
        stroke.append({
          position: new THREE.Vector3(
            -3 + i * 0.25,
            Math.sin(i * 0.3) * 0.4,
            0,
          ),
          direction: new THREE.Vector3(1, 0, 0),
          side: new THREE.Vector3(0, 1, 0),
          up: new THREE.Vector3(0, 0, 1),
          velocity: new THREE.Vector3(2, 0, 0),
          time: i * 0.12,
          energy: 0.6,
          low: 0.4,
          high: 0.3,
          density: 1,
          motion: 0.5,
        });
      stroke.finish();
      function draw(time, energy) {
        stroke.group.traverse((o) => {
          const u = o.material?.uniforms;
          if (u)
            for (const [key, value] of Object.entries({
              uTime: time,
              uAudioEnergy: energy,
              uAudioLow: energy,
              uAudioPulse: energy,
              uPigment: 1 + energy,
            }))
              if (u[key]) u[key].value = value;
        });
        renderer.render(scene, camera);
        const pixels = new Uint8Array(96 * 96 * 4);
        renderer.readRenderTargetPixels(target, 0, 0, 96, 96, pixels);
        return pixels;
      }
      const quiet = draw(1, 0),
        loud = draw(1, 1),
        later = draw(9, 1),
        diff = (a, b) => a.reduce((sum, v, i) => sum + Math.abs(v - b[i]), 0);
      results.push({
        name: profile.name,
        sound: diff(quiet, loud),
        motion: diff(loud, later),
      });
      disposeMark(stroke.group);
      binding.texture.dispose();
    }
    target.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    return results;
  });
  for (const brush of result) {
    expect(brush.sound, brush.name).toBeGreaterThan(0);
    expect(brush.motion, brush.name).toBeGreaterThan(0);
  }
  expect(errors).toEqual([]);
});
