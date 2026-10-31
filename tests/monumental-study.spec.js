import { test, expect } from "@playwright/test";

test("one authored ink study replaces decorative layers and preserves controls", async ({
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
  test.skip(
    (await page.locator("canvas").getAttribute("data-study")) !==
      "monumental-ink",
    "Optional single-study mode is inactive; emoji flow is the active experience.",
  );
  const canvas = page.locator("canvas");
  await expect(page.getByText("Étude I — Indigo & terre")).toBeVisible();
  await expect(page.locator(".simple-nuance")).toHaveCount(0);
  await expect(canvas).toHaveAttribute("data-study", "monumental-ink");
  await expect(canvas).toHaveAttribute("data-calls", "2");
  await page.screenshot({ path: testInfo.outputPath("study-preview.png") });
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  await expect(canvas).toHaveAttribute("data-ready", "inside");
  await expect(canvas).toHaveAttribute("data-reaction", "active");
  await expect(canvas).toHaveAttribute("data-calls", "2");
  await expect(canvas).toHaveAttribute("data-pigment", "idle");
  await page.screenshot({ path: testInfo.outputPath("study-inside.png") });
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-reaction-paused", "true");
  const time = await canvas.getAttribute("data-time");
  await page.waitForTimeout(300);
  expect(await canvas.getAttribute("data-time")).toBe(time);
  await page.getByRole("button", { name: "Reprendre", exact: true }).click();
  await expect
    .poll(async () => await canvas.getAttribute("data-time"))
    .not.toBe(time);
  await page.getByRole("button", { name: "Revenir à l’accueil" }).click();
  await expect(canvas).toHaveAttribute("data-ready", "preview");
  await expect(canvas).toHaveAttribute("data-calls", "2");
  expect(errors).toEqual([]);
});

test("the authored route closes without camera jumps or degenerate gaze", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { sampleStudyTravel, STUDY_PERIOD } =
      await import("/src/simple/MonumentalStudy.ts");
    const out = new Float64Array(6),
      start = [...sampleStudyTravel(0, out)];
    let previous = start,
      maxStep = 0,
      maxTurn = 0,
      minGaze = Infinity,
      minRadius = Infinity,
      maxRadius = 0;
    for (let t = 1 / 60; t <= STUDY_PERIOD; t += 1 / 60) {
      const p = sampleStudyTravel(t, out),
        d = [p[3] - p[0], p[4] - p[1], p[5] - p[2]],
        old = [
          previous[3] - previous[0],
          previous[4] - previous[1],
          previous[5] - previous[2],
        ];
      maxStep = Math.max(
        maxStep,
        Math.hypot(p[0] - previous[0], p[1] - previous[1], p[2] - previous[2]),
      );
      minGaze = Math.min(minGaze, Math.hypot(...d));
      maxTurn = Math.max(
        maxTurn,
        Math.acos(
          Math.min(
            1,
            Math.max(
              -1,
              d.reduce((s, v, i) => s + v * old[i], 0) /
                Math.hypot(...d) /
                Math.hypot(...old),
            ),
          ),
        ),
      );
      const r = Math.hypot(p[0], p[1] - 18, p[2] + 5);
      minRadius = Math.min(minRadius, r);
      maxRadius = Math.max(maxRadius, r);
      previous = [...p];
    }
    const end = [...sampleStudyTravel(STUDY_PERIOD, out)];
    return { start, end, maxStep, maxTurn, minGaze, minRadius, maxRadius };
  });
  expect(result.maxStep).toBeLessThan(0.025);
  expect(result.maxTurn).toBeLessThan(0.008);
  expect(result.minGaze).toBeGreaterThan(2.9);
  expect(result.minRadius).toBeLessThan(2);
  expect(result.maxRadius).toBeLessThan(21);
  result.start.forEach((v, i) => expect(result.end[i]).toBeCloseTo(v, 8));
});

test("the study balances dark pigment and open paper with a bounded two-draw renderer", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const T = await import("/node_modules/three/build/three.module.js");
    const { MonumentalStudy, sampleStudyTravel } =
      await import("/src/simple/MonumentalStudy.ts");
    const { makeWatercolorAtlas } =
      await import("/src/simple/WatercolorAtlas.ts");
    const renderer = new T.WebGLRenderer({ preserveDrawingBuffer: true });
    renderer.setSize(192, 192);
    const paper = makeWatercolorAtlas(),
      study = new MonumentalStudy(paper, true),
      scene = new T.Scene();
    scene.add(study.group);
    const errors = [];
    renderer.debug.onShaderError = (gl, p, v, f) =>
      errors.push(gl.getShaderInfoLog(v) + gl.getShaderInfoLog(f));
    const camera = new T.PerspectiveCamera(56, 1, 0.1, 80);
    camera.position.set(0, 18, 12);
    camera.lookAt(0, 18, -5);
    const target = new T.WebGLRenderTarget(192, 192);
    target.texture.colorSpace = T.SRGBColorSpace;
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    const pixels = new Uint8Array(192 * 192 * 4);
    renderer.readRenderTargetPixels(target, 0, 0, 192, 192, pixels);
    let dark = 0,
      middle = 0,
      paperCount = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const luma =
        0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
      if (luma < 120) dark++;
      else if (luma < 210) middle++;
      else paperCount++;
    }
    const calls = renderer.info.render.calls,
      triangles = renderer.info.render.triangles;
    const pictures = [];
    const pose = new Float64Array(6);
    renderer.setRenderTarget(null);
    for (const time of [0, 60, 115]) {
      sampleStudyTravel(time, pose);
      camera.position.set(pose[0], pose[1], pose[2]);
      camera.lookAt(pose[3], pose[4], pose[5]);
      study.update(
        time,
        1,
        { energy: 0.3, low: 0.2, high: 0.1, onset: 0 },
        null,
      );
      renderer.render(scene, camera);
      pictures.push({ time, png: renderer.domElement.toDataURL() });
    }
    study.dispose();
    paper.dispose();
    target.dispose();
    renderer.dispose();
    return { dark, middle, paperCount, calls, triangles, errors, pictures };
  });
  const { writeFile } = await import("node:fs/promises");
  for (const picture of result.pictures)
    await writeFile(
      testInfo.outputPath(`ink-${picture.time}.png`),
      Buffer.from(picture.png.split(",")[1], "base64"),
    );
  expect(result.errors).toEqual([]);
  expect(result.dark).toBeGreaterThan(1000);
  expect(result.middle).toBeGreaterThan(2000);
  expect(result.paperCount).toBeGreaterThan(5000);
  expect(result.calls).toBe(2);
  expect(result.triangles).toBeLessThan(10000);
});

test("gyro, fallback, context restoration and saved choices survive the study", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("cosmo-simple.v1", JSON.stringify(["night", "spark"]));
    Object.defineProperty(window, "DeviceOrientationEvent", {
      configurable: true,
      value: class extends Event {
        static async requestPermission() {
          return "granted";
        }
      },
    });
  });
  await page.goto("/");
  test.skip(
    (await page.locator("canvas").getAttribute("data-study")) !==
      "monumental-ink",
    "Optional single-study mode is inactive; emoji flow is the active experience.",
  );
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-ready", "inside");
  await page.getByRole("button", { name: "Gyroscope", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-gyro", "waiting");
  const position = await canvas.getAttribute("data-position");
  for (const alpha of [0, 15, 30])
    await page.evaluate((alpha) => {
      const event = new Event("deviceorientation");
      Object.assign(event, { alpha, beta: 60, gamma: 10 });
      window.dispatchEvent(event);
    }, alpha);
  await expect(canvas).toHaveAttribute("data-gyro", "tracking");
  expect(await canvas.getAttribute("data-position")).toBe(position);
  await page.getByRole("button", { name: "Gyroscope", exact: true }).click();
  await page.getByRole("button", { name: "Gyroscope", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Pas de signal", {
    timeout: 7000,
  });
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        const canvas = document.querySelector("canvas"),
          extension = canvas
            .getContext("webgl2")
            .getExtension("WEBGL_lose_context");
        window.__restoreStudy = () => extension.restoreContext();
        canvas.addEventListener("webglcontextlost", () => resolve(), {
          once: true,
        });
        extension.loseContext();
      }),
  );
  await expect(page.getByRole("status")).toContainText("Restauration en cours");
  const frozen = await canvas.getAttribute("data-time");
  await page.waitForTimeout(100);
  expect(await canvas.getAttribute("data-time")).toBe(frozen);
  await page.evaluate(() => window.__restoreStudy());
  await expect
    .poll(async () => await canvas.getAttribute("data-time"))
    .not.toBe(frozen);
  await expect(canvas).toHaveAttribute("data-reaction", "active");
  await expect(canvas).toHaveAttribute("data-calls", "2");
  await page.getByRole("button", { name: "Revenir à l’accueil" }).click();
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  await expect(page.locator("canvas")).toHaveCount(1);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("cosmo-simple.v1")),
    ),
  ).toEqual(["night", "spark"]);
});
