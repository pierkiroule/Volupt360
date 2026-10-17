import { test, expect } from "@playwright/test";

test("mobile budget adapts gradually, recovers and ignores background stalls", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createRenderBudget } =
      await import("/src/engine/createRenderBudget.js");
    const b = createRenderBudget({
      mobile: true,
      dpr: 3,
      width: 390,
      height: 844,
    });
    const initial = b.ratio,
      changes = [];
    for (let i = 0; i < 400; i++) if (b.update(40, 0.04)) changes.push(b.ratio);
    const slow = b.ratio;
    for (let i = 0; i < 200; i++) b.update(2000, 0.1);
    const stalled = b.ratio;
    for (let i = 0; i < 3000; i++) b.update(16, 0.016);
    return {
      initial,
      changes,
      slow,
      stalled,
      recovered: b.ratio,
      limit: b.maxMarks,
    };
  });
  expect(result.initial).toBeLessThanOrEqual(1.25);
  expect(result.changes.length).toBeGreaterThan(0);
  expect(result.slow).toBeGreaterThanOrEqual(0.75);
  expect(result.slow).toBeLessThan(result.initial);
  expect(result.stalled).toBe(result.slow);
  expect(result.recovered).toBeGreaterThan(result.slow);
  expect(result.recovered).toBeLessThanOrEqual(result.initial);
  expect(result.limit).toBe(56);
});

test("audio envelopes respond strongly and release smoothly at different frame rates", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createVisualAudioResponse } =
      await import("/src/audio/createVisualAudioResponse.js");
    function measure(fps) {
      const respond = createVisualAudioResponse();
      let value;
      for (let i = 0; i < fps; i++)
        value = respond(
          { rms: 0.12, low: 0.65, high: 0.45, flux: 0.2 },
          {},
          1 / fps,
        );
      const loud = { ...value };
      const first = respond({}, {}, 1 / fps);
      for (let i = 0; i < fps * 3; i++) value = respond({}, {}, 1 / fps);
      return { loud, first, quiet: value };
    }
    return { slow: measure(30), fast: measure(60) };
  });
  expect(result.fast.loud.energy).toBeGreaterThan(0.6);
  expect(result.fast.loud.low).toBeGreaterThan(0.7);
  expect(result.fast.loud.pulse).toBeGreaterThan(0.5);
  expect(result.fast.first.low).toBeGreaterThan(0);
  expect(result.fast.first.low).toBeLessThan(result.fast.loud.low);
  expect(result.fast.quiet.energy).toBeLessThan(0.01);
  expect(result.fast.quiet.low).toBeLessThan(0.01);
  expect(result.slow.loud.low).toBeCloseTo(result.fast.loud.low, 2);
});
