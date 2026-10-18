import { test, expect } from "@playwright/test";

test("phase interpolation is continuous at 60 and 180 seconds, with an audio-led paused clock", async ({
  page,
}) => {
  await page.goto("/?original=1");
  const r = await page.evaluate(async () => {
    const { sampleExperience, createExperienceTimeline } =
      await import("/src/chill/experienceTimeline.js");
    const boundaries = [60, 180].map((t) => {
      const a = sampleExperience(t - 0.001),
        b = sampleExperience(t + 0.001);
      return Math.max(
        ...[
          "night",
          "aurora",
          "dawn",
          "brushDensity",
          "brushDiffusion",
          "opening",
        ].map((k) => Math.abs(a[k] - b[k])),
      );
    });
    const clock = createExperienceTimeline();
    clock.update(10, { time: 0, playing: true });
    clock.update(10, { time: 1, playing: true });
    const synced = clock.elapsed;
    clock.setPaused(true);
    clock.update(20, { time: 8, playing: true });
    const paused = clock.elapsed;
    clock.setPaused(false);
    clock.update(20, { time: 8, playing: true });
    clock.update(20, { time: 9, playing: true });
    return {
      boundaries,
      synced,
      paused,
      resumed: clock.elapsed,
      night: sampleExperience(0),
      dawn: sampleExperience(360),
    };
  });
  for (const n of r.boundaries) expect(n).toBeLessThan(0.0001);
  expect(r.synced).toBe(1);
  expect(r.paused).toBe(1);
  expect(r.resumed).toBe(2);
  expect(r.night.night).toBe(1);
  expect(r.dawn.dawn).toBe(1);
  expect(r.dawn.departing).toBe(true);
});

test("24 bubbles appear as 4 night, 8 aurora, 12 dawn passages without regeneration", async ({
  page,
}) => {
  await page.goto("/?original=1");
  const r = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createVocalBubbles } =
      await import("/src/sonoizo/createVocalBubbles.js");
    const { CHILL_FRAGMENTS } = await import("/src/chill/chillConfig.js");
    const b = createVocalBubbles({
        fragments: CHILL_FRAGMENTS,
        staged: true,
        collide: async () => false,
      }),
      pose = { position: new THREE.Vector3(100, 100, 100) };
    const counts = [59, 179, 359].map((time) => {
      b.setElapsed(time);
      b.update(0.01, pose, false);
      return b.group.children.filter((x) => x.visible).length;
    });
    const total = b.count;
    b.dispose();
    return { counts, total };
  });
  expect(r).toEqual({ counts: [4, 12, 24], total: 24 });
});

test("six-minute drawing workload preserves all dry geometries with bounded batches", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/?original=1");
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const r = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createPigmentArchive } =
      await import("/src/chill/createPigmentArchive.js");
    const { createBrushStroke, disposeMark } =
      await import("/src/engine/brushes.js");
    const { CHILL_BRUSHES } = await import("/src/chill/chillConfig.js");
    const archive = createPigmentArchive(),
      scene = new THREE.Scene();
    scene.add(archive.group);
    const start = performance.now();
    for (let k = 0; k < 114; k++) {
      const profile = CHILL_BRUSHES[k % 6],
        stroke = createBrushStroke(profile.baseId, {
          seed: k + 1,
          color: new THREE.Color(profile.color),
          dynamics: profile,
        }),
        bounds = new THREE.Box3();
      scene.add(stroke.group);
      for (let i = 0; i < 96; i++) {
        const t = (k * 96 + i) / 300;
        const position = new THREE.Vector3(
          Math.sin(t) * 7,
          Math.cos(t * 0.6) * 3,
          Math.cos(t) * 7,
        );
        bounds.expandByPoint(position);
        stroke.append({
          position,
          direction: new THREE.Vector3(1, 0, 0),
          side: new THREE.Vector3(0, 1, 0),
          up: new THREE.Vector3(0, 0, 1),
          velocity: new THREE.Vector3(2, 0, 0),
          time: t,
          energy: 0.4,
          low: 0.3,
          high: 0.2,
          density: 1,
          motion: 0.5,
          wake: true,
          depositionTime: t,
        });
      }
      archive.add({ stroke, object: stroke.group, bounds, brush: profile.id });
      disposeMark(stroke.group);
    }
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(128, 128);
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
    camera.position.set(0, 8, 30);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    const sourceSeeds = archive.group.children.flatMap((mesh) =>
      Array.from(mesh.geometry.attributes.aPigmentSeed.array),
    );
    const earliest = sourceSeeds.includes(1),
      latest = sourceSeeds.includes(114);
    const geometryBytes = archive.group.children.reduce(
      (total, mesh) =>
        total +
        mesh.geometry.index.array.byteLength +
        Object.values(mesh.geometry.attributes).reduce(
          (n, a) => n + a.array.byteLength,
          0,
        ),
      0,
    );
    const stats = archive.stats,
      drawCalls = renderer.info.render.calls,
      geometries = renderer.info.memory.geometries,
      elapsedMs = performance.now() - start;
    archive.dispose();
    renderer.dispose();
    return {
      stats,
      drawCalls,
      geometries,
      elapsedMs,
      earliest,
      latest,
      geometryBytes,
    };
  });
  expect(r.stats.traces).toBe(114);
  expect(r.stats.batches).toBeLessThanOrEqual(40);
  expect(r.drawCalls).toBe(r.stats.batches);
  expect(r.geometries).toBe(r.stats.batches);
  expect(r.stats.vertices).toBeGreaterThan(10000);
  expect(r.earliest).toBe(true);
  expect(r.latest).toBe(true);
  expect(r.geometryBytes).toBeLessThan(96 * 1024 * 1024);
  console.log("Six-minute geometry workload", JSON.stringify(r));
  expect(errors).toEqual([]);
});

test("mobile audio interruption pauses the timeline and a gesture resumes it without a jump", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = AudioContext.prototype.createGain;
    AudioContext.prototype.createGain = function (...args) {
      window.__audioContext = this;
      return original.apply(this, args);
    };
  });
  await page.goto("/?original=1");
  await page.getByRole("button", { name: "Prendre son envol" }).click();
  const canvas = page.locator("#stage canvas");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-experience-time")))
    .toBeGreaterThan(0.2);
  await page.evaluate(() => window.__audioContext.suspend());
  await expect(
    page.getByRole("button", { name: "Reprendre", exact: true }),
  ).toBeVisible();
  const t = Number(await canvas.getAttribute("data-experience-time"));
  await page.waitForTimeout(300);
  expect(Number(await canvas.getAttribute("data-experience-time"))).toBeCloseTo(
    t,
    2,
  );
  await page.getByRole("button", { name: "Reprendre", exact: true }).click();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-experience-time")))
    .toBeGreaterThan(t + 0.1);
  const now = Number(await canvas.getAttribute("data-experience-time"));
  expect(now - t).toBeLessThan(1.5);
  await expect(page.getByLabel("Temps restant")).toHaveCount(0);
  await expect(page.locator(".bubble-score")).toHaveCount(0);
});

test("one watercolor sky interpolates night, auroras and dawn and remembers a flight passage", async ({
  page,
}) => {
  await page.goto("/?original=1");
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
    renderer.setSize(96, 96);
    const target = new THREE.WebGLRenderTarget(96, 96);
    renderer.setRenderTarget(target);
    const scene = new THREE.Scene();
    scene.add(sky.object);
    const camera = new THREE.PerspectiveCamera(80, 1, 0.1, 400);
    camera.position.set(0, 0, 0);
    const draw = (t) => {
      sky.update(t, {}, t / 360, sampleExperience(t));
      renderer.render(scene, camera);
      const bytes = new Uint8Array(96 * 96 * 4);
      renderer.readRenderTargetPixels(target, 0, 0, 96, 96, bytes);
      return bytes;
    };
    const night = draw(0),
      aurora = draw(120);
    for (let i = 0; i < 100; i++)
      sky.onTrace(new THREE.Vector3(0, 0, -28), 0.5);
    const remembered = draw(120),
      dawn = draw(360);
    const sum = (a) => a.reduce((s, x, i) => s + (i % 4 === 3 ? 0 : x), 0),
      difference = (a, b) => a.reduce((s, x, i) => s + Math.abs(x - b[i]), 0);
    const result = {
      night: sum(night),
      dawn: sum(dawn),
      aurora: difference(night, aurora),
      passage: difference(aurora, remembered),
    };
    sky.dispose();
    target.dispose();
    renderer.dispose();
    return result;
  });
  expect(r.dawn).toBeGreaterThan(r.night * 2);
  expect(r.aurora).toBeGreaterThan(0);
  expect(r.passage).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test("missing soundtrack permits the full silent timeline and exit returns to the single entry", async ({
  page,
}) => {
  await page.route("**/ambiances/*.mp3", (route) =>
    route.fulfill({ status: 404, body: "" }),
  );
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?original=1");
  await page.getByRole("button", { name: "Prendre son envol" }).click();
  const canvas = page.locator("#stage canvas");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-experience-time")))
    .toBeGreaterThan(0.2);
  await expect(
    page.getByRole("button", { name: "Faire une pause" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sortir", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Prendre son envol" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("paint archive survives phase changes inside one continuous live scene", async ({
  page,
}) => {
  test.setTimeout(45000);
  await page.route("**/src/chill/experienceTimeline.js", async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    await route.fulfill({
      response,
      body: source.replace(
        "sampleExperience(state.elapsed + delta, state);",
        "sampleExperience(state.elapsed + delta * 20, state);",
      ),
    });
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?original=1");
  await page.getByRole("button", { name: "Prendre son envol" }).click();
  const canvas = page.locator("#stage canvas");
  await page.evaluate(() => {
    window.__originalCanvas = document.querySelector("#stage canvas");
  });
  await page.screenshot({ path: "/tmp/journey-night.png" });
  for (let i = 0; i < 12; i++) {
    await page
      .getByRole("button", {
        name: i % 2 ? "Impulsions graphiques" : "Ondulations de pigments",
        exact: true,
      })
      .click();
    await page.mouse.move(140, 350);
    await page.mouse.down();
    await page.waitForTimeout(110);
    await page.mouse.up();
  }
  await expect
    .poll(
      async () =>
        JSON.parse(await canvas.getAttribute("data-pigment-archive")).traces,
    )
    .toBeGreaterThan(0);
  const before = JSON.parse(
    await canvas.getAttribute("data-pigment-archive"),
  ).traces;
  await expect(canvas).toHaveAttribute("data-experience-phase", "aurora", {
    timeout: 12000,
  });
  await page.screenshot({ path: "/tmp/journey-aurora.png" });
  await expect
    .poll(
      async () => {
        // Contemplations now pause active time: explicitly resume this journey.
        const resume = page.getByRole("button", {
          name: "Reprendre le vol",
          exact: true,
        });
        if (await resume.isVisible()) await resume.click();
        return Number(await canvas.getAttribute("data-experience-time"));
      },
      { timeout: 22000 },
    )
    .toBeGreaterThan(235);
  await expect(canvas).toHaveAttribute("data-experience-phase", "dawn");
  await page.screenshot({ path: "/tmp/journey-dawn.png" });
  expect(
    JSON.parse(await canvas.getAttribute("data-pigment-archive")).traces,
  ).toBeGreaterThanOrEqual(before);
  expect(
    await page.evaluate(
      () => window.__originalCanvas === document.querySelector("#stage canvas"),
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
