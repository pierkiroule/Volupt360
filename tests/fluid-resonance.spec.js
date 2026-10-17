import { test, expect } from "@playwright/test";

test("native spectrum separates bass and treble, and materials respond independently with smooth release", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createAudioGraph, readAudioFeatures } =
      await import("/src/audio/audioGraph.js");
    const { createMaterialResponse } =
      await import("/src/engine/createMaterialResponse.js");
    const graph = createAudioGraph();
    await graph.ctx.resume();
    const oscillator = graph.ctx.createOscillator(),
      mute = graph.ctx.createGain();
    mute.gain.value = 0;
    oscillator.connect(graph.analyser);
    graph.analyser.connect(mute);
    mute.connect(graph.ctx.destination);
    oscillator.frequency.value = 150;
    oscillator.start();
    await new Promise((resolve) => setTimeout(resolve, 250));
    const bass = [...readAudioFeatures(graph).bands];
    oscillator.frequency.setValueAtTime(4200, graph.ctx.currentTime);
    for (let i = 0; i < 20; i++) {
      await new Promise((resolve) => setTimeout(resolve, 16));
      readAudioFeatures(graph);
    }
    const treble = [...readAudioFeatures(graph).bands];
    oscillator.stop();
    await graph.ctx.close();
    const wash = createMaterialResponse("voiles", 2),
      ink = createMaterialResponse("filaments", 4),
      splash = createMaterialResponse("lagons", 8);
    const bands = new Float32Array([0.9, 0.1, 0.05, 0.03, 0.02, 0.01]);
    let a,
      b,
      c,
      step = 0,
      previous = 0;
    for (let i = 0; i < 120; i++) {
      a = wash({ bands, energy: 0.3 }, 1 / 60);
      b = ink({ bands, energy: 0.3 }, 1 / 60);
      c = splash({ bands, energy: 0.3 }, 1 / 60);
      step = Math.max(step, Math.abs(a.energy - previous));
      previous = a.energy;
    }
    const loud = { wash: a.energy, ink: b.energy, splash: c.energy };
    for (let i = 0; i < 240; i++) a = wash({}, 1 / 60);
    return { bass, treble, loud, quiet: a.energy, step };
  });
  expect(result.bass.indexOf(Math.max(...result.bass))).toBe(0);
  expect(result.treble.indexOf(Math.max(...result.treble))).toBe(4);
  expect(result.loud.wash - result.loud.ink).toBeGreaterThan(0.4);
  expect(result.loud.wash - result.loud.splash).toBeGreaterThan(0.4);
  expect(result.step).toBeLessThan(0.2);
  expect(result.quiet).toBeLessThan(0.01);
});

test("orbital flight covers the sanctuary, stays bounded and responds promptly without discontinuities", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createSonoizoDance } = await import("/src/sonoizo/SonoizoDance.js");
    function simulate(hz) {
      const dance = createSonoizoDance(),
        quadrants = new Set();
      let min = Infinity,
        max = 0,
        maxStep = 0,
        maxTurn = 0,
        previousPosition = null,
        previousDirection = null,
        last;
      for (let i = 0; i < 90 * hz; i++) {
        const pose = dance.update(1 / hz, [], {
          energy: 0.5,
          low: 0.3,
          high: 0.2,
        });
        const r = Math.hypot(pose.position.x, pose.position.z);
        min = Math.min(min, r);
        max = Math.max(max, r);
        quadrants.add(
          `${Math.sign(pose.position.x)},${Math.sign(pose.position.z)}`,
        );
        if (previousPosition) {
          maxStep = Math.max(
            maxStep,
            previousPosition.distanceTo(pose.position),
          );
          maxTurn = Math.max(
            maxTurn,
            previousDirection.angleTo(pose.direction),
          );
        }
        previousPosition = pose.position.clone();
        previousDirection = pose.direction.clone();
        last = pose.position.toArray();
      }
      return { min, max, maxStep, maxTurn, quadrants: quadrants.size, last };
    }
    const a = createSonoizoDance(),
      b = createSonoizoDance();
    let dx = 0,
      dy = 0;
    for (let i = 0; i < 60; i++) {
      a.update(1 / 60, []);
      b.update(1 / 60, []);
    }
    b.steer(0.5, 0.25, {
      right: new THREE.Vector3(1, 0, 0),
      up: new THREE.Vector3(0, 1, 0),
    });
    for (let i = 0; i < 30; i++) {
      const p = a.update(1 / 60, []),
        q = b.update(1 / 60, []);
      dx = q.position.x - p.position.x;
      dy = q.position.y - p.position.y;
    }
    return { slow: simulate(30), fast: simulate(60), dx, dy };
  });
  for (const run of [result.slow, result.fast]) {
    expect(run.min).toBeGreaterThan(12);
    expect(run.max).toBeLessThan(34);
    expect(run.quadrants).toBe(4);
    expect(run.maxStep).toBeLessThan(0.3);
    expect(run.maxTurn).toBeLessThan(0.08);
  }
  expect(
    Math.hypot(...result.slow.last.map((v, i) => v - result.fast.last[i])),
  ).toBeLessThan(0.5);
  expect(result.dx).toBeGreaterThan(0.15);
  expect(result.dy).toBeGreaterThan(0.1);
});

test("six musical materials build a living orbital landscape without WebGL errors", async ({
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
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  await page
    .getByLabel("Importer un MP3", { exact: true })
    .setInputFiles("public/ambiances/ambiance01.mp3");
  const canvas = page.locator("#stage canvas");
  for (const name of [
    "Lavis",
    "Brosse sèche",
    "Encre fine",
    "Éclaboussures",
    "Diffusion",
    "Tampons",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    await page.mouse.move(180, 350);
    await page.mouse.down();
    await expect(canvas).toHaveAttribute("data-nozzle-paint", "true");
    await page.waitForTimeout(2200);
    await page.mouse.up();
  }
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-matter-drift")))
    .toBeGreaterThan(0.2);
  expect(
    (await canvas.getAttribute("data-painted-brushes")).split(","),
  ).toHaveLength(6);
  expect(
    Number(await canvas.getAttribute("data-mark-count")),
  ).toBeLessThanOrEqual(56);
  await page
    .getByRole("button", { name: "Vue globale 360°", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-camera-mode", "global");
  await page.screenshot({ path: "/tmp/resonant-orbit-global.png" });
  await page
    .getByRole("button", { name: "FPV 360° gyro", exact: true })
    .click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "/tmp/resonant-orbit-gyro.png" });
  expect(errors).toEqual([]);
});
