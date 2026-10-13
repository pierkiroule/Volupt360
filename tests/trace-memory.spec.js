import { test, expect } from "@playwright/test";

test("the scene starts empty, records artistic deposits and resets its memory with the universe", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?traceDebug=1&instrument=off");
  const canvas = page.locator("#stage canvas");
  await expect(canvas).toHaveAttribute("data-trace-memory", "true");
  await expect(canvas).toHaveAttribute("data-trace-points", "0");
  await page
    .getByRole("button", { name: "Le Souffle Entrer", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-vocal-fireflies", "0");
  await expect(canvas).toHaveAttribute("data-mark-count", "0");
  await expect(canvas).toHaveAttribute("data-trace-debug", "true");
  await page.mouse.move(450, 300);
  await page.mouse.down();
  await expect(canvas).toHaveAttribute("data-nozzle-paint", "true");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-trace-segments")))
    .toBeGreaterThan(2);
  await page.mouse.up();
  await expect(canvas).toHaveAttribute("data-painted-brushes", "voiles");
  await page
    .getByRole("button", { name: "Changer d’univers", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Les Marées Entrer", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-trace-points", "0");
  await expect(canvas).toHaveAttribute("data-trace-encounters", "0");
  expect(errors).toEqual([]);
});

test("finite 3D segment encounters reject young traces and apparent screen intersections and throttle repeats", async ({
  page,
}) => {
  await page.goto("/?instrument=off");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createTraceMemory } = await import("/src/sonoizo/TraceMemory.js");
    const { createTraceEncounter } =
      await import("/src/sonoizo/TraceEncounter.js");
    const p = (x, y, z) => new THREE.Vector3(x, y, z);
    const memory = createTraceMemory();
    memory.record("a", "voiles", p(-2, 0, 0), 0);
    memory.record("a", "voiles", p(2, 0, 0), 0);
    const encounter = createTraceEncounter(memory, {
      radius: 0.5,
      minAge: 6,
      cooldown: 9,
      segmentCooldown: 30,
    });
    const crossing = (time, z = 0) => {
      const arrival = encounter.update(p(0, -2, z), time);
      return encounter.update(p(0, 2, z), time + 0.01) || arrival;
    };
    const young = crossing(2);
    encounter.reset();
    const projected = crossing(8, 3);
    encounter.reset();
    const first = crossing(8);
    const throttled = crossing(10);
    const sameSegment = crossing(20);
    const repeat = crossing(40);
    const resonance = memory.traces.get("a").resonance;
    // A long discontinuity must not create an encounter with an imaginary swept path.
    const jump = createTraceEncounter(memory, { radius: 0.5, minAge: 6 });
    jump.update(p(0, -30, 0), 80);
    const teleport = jump.update(p(0, 30, 0), 81);
    const finite = createTraceEncounter(memory, { radius: 0.5, minAge: 6 });
    finite.update(p(0, -4, 0), 80);
    const beyondEnd = finite.update(p(0, -2, 0), 81);
    return {
      young,
      projected,
      first,
      throttled,
      sameSegment,
      repeat,
      resonance,
      teleport,
      beyondEnd,
    };
  });
  expect(result.young).toBeNull();
  expect(result.projected).toBeNull();
  expect(result.first.traceId).toBe("a");
  expect(result.first.brushId).toBe("voiles");
  expect(result.first.distance).toBeLessThan(0.0001);
  expect(result.first.position).toEqual({ x: 0, y: 0, z: 0 });
  expect(result.throttled).toBeNull();
  expect(result.sameSegment).toBeNull();
  expect(result.teleport).toBeNull();
  expect(result.beyondEnd).toBeNull();
  expect(result.repeat.traceId).toBe("a");
  expect(result.resonance.count).toBe(2);
});

test("memory is bounded and removing traces clears their spatial references", async ({
  page,
}) => {
  await page.goto("/?instrument=off");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createTraceMemory } = await import("/src/sonoizo/TraceMemory.js");
    const memory = createTraceMemory({ maxTraces: 3, maxPointsPerTrace: 5 });
    for (let trace = 0; trace < 20; trace++)
      for (let point = 0; point < 20; point++)
        memory.record(
          `t${trace}`,
          "plumes",
          new THREE.Vector3(point, trace * 20, 0),
          point,
        );
    const bounded = memory.stats;
    const far = memory.query(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 0, 0),
      1,
    ).length;
    for (const id of [...memory.traces.keys()]) memory.remove(id);
    return { bounded, far, empty: memory.stats };
  });
  expect(result.bounded.traces).toBe(3);
  expect(result.bounded.points).toBe(15);
  expect(result.bounded.segments).toBe(12);
  expect(result.far).toBe(0);
  expect(result.empty).toEqual({ traces: 0, points: 0, segments: 0, cells: 0 });
});

test("a natural recorded orbit has a first old-trace encounter without moving the bird to it", async ({
  page,
}) => {
  await page.goto("/?instrument=off");
  const result = await page.evaluate(async () => {
    const { createSonoizoDance } = await import("/src/sonoizo/SonoizoDance.js");
    const { createTraceMemory } = await import("/src/sonoizo/TraceMemory.js");
    const { createTraceEncounter } =
      await import("/src/sonoizo/TraceEncounter.js");
    const memory = createTraceMemory(),
      encounter = createTraceEncounter(memory),
      dance = createSonoizoDance();
    let first = null,
      steps = 0;
    for (let i = 0; i < 60 * 240; i++) {
      const time = i / 60,
        pose = dance.update(1 / 60, []);
      if (i % 8 === 0)
        memory.record(
          `trace-${Math.floor(i / 416)}`,
          "voiles",
          pose.position,
          time,
        );
      const hit = encounter.update(pose.position, time);
      steps++;
      if (hit) {
        first = hit;
        break;
      }
    }
    return { first, steps, stats: memory.stats };
  });
  expect(result.first).not.toBeNull();
  expect(result.first.time).toBeGreaterThan(6);
  expect(result.first.distance).toBeLessThanOrEqual(1.6);
  expect(result.steps).toBeLessThan(14400);
  expect(result.stats.traces).toBeLessThanOrEqual(80);
});
