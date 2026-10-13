import { test, expect } from "@playwright/test";

test("visual geometry distinguishes height, curvature and spread and keeps its memory bounded", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createVisualSoundDialogue } =
      await import("/src/audio/VisualSoundDialogue.js");
    const straight = createVisualSoundDialogue(),
      curved = createVisualSoundDialogue();
    for (let i = 0; i < 60; i++) {
      straight.record("line", { x: i * 0.3, y: -20, z: 0 }, i * 0.1);
      curved.record(
        "curve",
        { x: 30 + Math.cos(i) * 2, y: 20, z: Math.sin(i) * 2 },
        i * 0.1,
      );
    }
    const a = straight.state,
      b = curved.state;
    for (let i = 0; i < 200; i++)
      straight.record(`trace-${i}`, { x: 0, y: 0, z: 0 }, 8);
    const bounded = straight.state.traces;
    curved.forget("curve");
    return { a, b, bounded, forgotten: curved.state };
  });
  expect(result.b.brightness).toBeGreaterThan(result.a.brightness + 0.5);
  expect(result.b.curvature).toBeGreaterThan(result.a.curvature + 0.4);
  expect(result.b.spread).toBeGreaterThan(result.a.spread);
  expect(result.bounded).toBe(80);
  expect(result.forgotten.traces).toBe(0);
});

test("deep bass has a sustained body and pads continue beyond transient durations", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { WaterDSP } = await import("/src/audio/WaterDSP.js");
    const bass = new WaterDSP({
      type: "bass",
      sampleRate: 48000,
      frequency: 55,
      duration: 2,
      velocity: 0.8,
    });
    const pad = new WaterDSP({
      type: "pad",
      sampleRate: 48000,
      frequency: 110,
      duration: 0.1,
      scale: [0, 3, 7, 10],
    });
    let bassBody = 0,
      bassEnd = 0,
      padBody = 0;
    for (let i = 0; i < 120000; i++) {
      const b = bass.render(),
        p = pad.render();
      if (!Number.isFinite(b + p)) throw new Error("Non-finite DSP");
      if (i >= 48000 && i < 72000) bassBody += b * b;
      if (i > 100000) bassEnd = Math.max(bassEnd, Math.abs(b));
      if (i > 96000) padBody += p * p;
    }
    return {
      bassBody: Math.sqrt(bassBody / 24000),
      bassEnd,
      padBody: Math.sqrt(padBody / 24000),
    };
  });
  expect(result.bassBody).toBeGreaterThan(0.1);
  expect(result.bassEnd).toBe(0);
  expect(result.padBody).toBeGreaterThan(0.02);
});

test("a sounding remembered trace resonates locally, forget and pause stop its response", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createTwigBank } = await import("/src/sonoizo/createTwigBank.js");
    const bank = createTwigBank({ ids: ["voiles"] });
    await bank.preparePlayback();
    await bank.startInstrument("souffle");
    for (let i = 0; i < 12; i++) {
      bank.depositSound("voiles", { x: i, y: 15, z: 20 }, 0.6, "painted");
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    const sounding = bank.getTraceResonance("painted"),
      other = bank.getTraceResonance("other");
    const stats = bank.getInstrumentStats();
    bank.forgetSound("painted");
    const forgotten = bank.getTraceResonance("painted");
    bank.pauseAmbience();
    const paused = bank.getInstrumentStats();
    bank.dispose();
    return { sounding, other, stats, forgotten, paused };
  });
  expect(result.sounding).toBeGreaterThan(0.05);
  expect(result.other).toBe(0);
  expect(result.stats.dialogue.brightness).toBeGreaterThan(0.6);
  expect(result.stats.padActive).toBe(true);
  expect(result.forgotten).toBe(0);
  expect(result.paused.padActive).toBe(false);
});
