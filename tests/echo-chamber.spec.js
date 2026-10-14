import { test, expect } from "@playwright/test";

test("spherical memory wraps the seam, rejects the origin, remains bounded and retains expired traces", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createEchoMemory, projectEchoPoint } =
      await import("/src/engine/EchoChamber.js");
    const memory = createEchoMemory(32);
    const left = projectEchoPoint({ x: -10, y: 0, z: 0.001 }),
      right = projectEchoPoint({ x: -10, y: 0, z: -0.001 });
    for (let i = 0; i < 100; i++)
      for (let p = 0; p < 30; p++)
        memory.record({
          id: `trace-${i}`,
          brush: "voiles",
          color: "#806090",
          position: { x: 10, y: p, z: p * 2 },
        });
    memory.expire("trace-99");
    memory.advance(40, 180);
    const expired = memory.entries.get("trace-99");
    memory.encounter("trace-99");
    memory.advance(1, 180);
    const count = memory.entries.size,
      points = expired.points.length,
      resonance = expired.resonance,
      expiredAt = expired.expiredAt;
    memory.advance(181, 180);
    return {
      left,
      right,
      origin: projectEchoPoint({ x: 0, y: 0, z: 0 }),
      count,
      points,
      resonance,
      expiredAt,
      final: memory.entries.size,
    };
  });
  expect(result.origin).toBeNull();
  expect(result.left.u + 1 - result.right.u).toBeLessThan(0.001);
  expect(result.count).toBe(32);
  expect(result.points).toBeLessThanOrEqual(6);
  expect(result.resonance).toBeGreaterThan(0.3);
  expect(result.expiredAt).toBe(0);
  expect(result.final).toBe(0);
});

test("real WebGL sky is empty before deposits, renders diffuse pigment and releases GPU resources", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createEchoChamber } = await import("/src/engine/EchoChamber.js");
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(96, 96);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("white");
    const camera = new THREE.PerspectiveCamera(90, 1, 0.1, 1000);
    const chamber = createEchoChamber({ mobile: true });
    scene.add(chamber.mesh);
    const target = new THREE.WebGLRenderTarget(96, 96);
    const pixels = new Uint8Array(96 * 96 * 4);
    const sample = () => {
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.readRenderTargetPixels(target, 0, 0, 96, 96, pixels);
      return [...pixels];
    };
    const blank = sample();
    for (let i = 0; i < 10; i++) chamber.update(0.1);
    const idle = chamber.stats.uploads;
    chamber.onTraceCreated({
      id: "a",
      brush: "voiles",
      color: "#604b86",
      position: { x: 0, y: 0, z: -10 },
    });
    chamber.configure({ presence: 1 });
    for (let i = 0; i < 80; i++) chamber.update(0.1);
    const pigment = sample();
    let changed = 0,
      total = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pigment[i] < blank[i] - 1) changed++;
      total += pigment[i];
    }
    for (let i = 0; i < 600; i++) chamber.update(0.1);
    chamber.onTraceExpired("a");
    const darkness = () =>
      sample().reduce(
        (sum, value, i) => sum + (i % 4 < 3 ? 255 - value : 0),
        0,
      );
    const beforeRecall = darkness();
    chamber.onTraceEncounter("a");
    for (let i = 0; i < 100; i++) chamber.update(0.1);
    const afterRecall = darkness();
    chamber.configure({ enabled: false });
    const before = chamber.stats;
    chamber.update(5);
    const after = chamber.stats;
    const disabled = sample();
    chamber.configure({ enabled: true });
    chamber.suspend(true);
    const suspended = chamber.mesh.visible;
    chamber.suspend(false);
    const restored = chamber.mesh.visible;
    chamber.dispose();
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
    const texturesAfter = renderer.info.memory.textures;
    target.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    return {
      beforeRecall,
      afterRecall,
      changed,
      mean: total / (96 * 96),
      idle,
      before,
      after,
      disabledSame: JSON.stringify(blank) === JSON.stringify(disabled),
      suspended,
      restored,
      texturesAfter,
    };
  });
  expect(result.idle).toBe(0);
  expect(result.changed).toBeGreaterThan(5);
  expect(result.afterRecall).toBeGreaterThan(result.beforeRecall);
  expect(result.mean).toBeGreaterThan(235);
  expect(result.after.uploads).toBe(result.before.uploads);
  expect(result.after.time).toBe(result.before.time);
  expect(result.disabledSame).toBe(true);
  expect(result.suspended).toBe(false);
  expect(result.restored).toBe(true);
  expect(result.texturesAfter).toBe(1); // Only the test render target remains.
});

test("all existing brushes feed the sky, photo freezes it and settings fully disable it", async ({
  page,
}) => {
  test.setTimeout(45000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?instrument=off");
  for (const name of ["ÉTHER", "ABYSSE", "MÉMOIRE"]) {
    await page.getByRole("button", { name: `Choisir ${name}` }).click();
    await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
    const canvas = page.locator("#stage canvas");
    const pads = page.locator(".twig-pad");
    for (let i = 0; i < 6; i++) {
      await pads.nth(i).click();
      await page.mouse.move(170, 350);
      await page.mouse.down();
      await expect(canvas).toHaveAttribute("data-nozzle-paint", "true");
      await page.waitForTimeout(150);
      await page.mouse.up();
    }
    await expect
      .poll(
        async () =>
          JSON.parse(await canvas.getAttribute("data-echo-chamber")).count,
      )
      .toBeGreaterThan(0);
    await page.getByRole("button", { name: "Vue photo", exact: true }).click();
    const state = JSON.parse(await canvas.getAttribute("data-echo-chamber"));
    await page.waitForTimeout(300);
    expect(
      JSON.parse(await canvas.getAttribute("data-echo-chamber")).time,
    ).toBe(state.time);
    await page.getByRole("button", { name: "FPV drone", exact: true }).click();
    await page.locator(".echo-chamber-controls summary").click();
    await page.getByLabel("Le ciel se souvient").uncheck();
    await expect
      .poll(
        async () =>
          JSON.parse(await canvas.getAttribute("data-echo-chamber")).enabled,
      )
      .toBe(false);
    await page.getByLabel("Le ciel se souvient").check();
    await page.getByRole("button", { name: "Changer d’univers" }).click();
  }
  expect(errors).toEqual([]);
});
