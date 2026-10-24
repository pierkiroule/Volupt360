import { test, expect } from "@playwright/test";

test("local drumloops decode, share an exact four-bar period, and schedule bounded bass and arpeggios", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { ElectroRhythm } = await import("/src/simple/ElectroRhythm.ts");
    const context = new AudioContext();
    await context.resume();
    const target = context.createGain();
    target.gain.value = 0.5;
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    target.connect(analyser);
    analyser.connect(context.destination);
    const ducks = [],
      notes = [];
    const engine = new ElectroRhythm(
      context,
      target,
      (t) => ducks.push(t),
      (note, time, velocity) => notes.push({ note, time, velocity }),
    );
    await engine.load(new AbortController().signal);
    engine.setPalette(["warm", "water"]);
    engine.start();
    const periods = engine.sources.map(
      (source) => source.buffer.duration / source.playbackRate.value,
    );
    const data = new Float32Array(2048);
    let peak = 0,
      maxVoices = 0;
    for (let i = 0; i < 20; i++) {
      engine.tick([50, 57, 60, 65]);
      await new Promise((r) => setTimeout(r, 80));
      analyser.getFloatTimeDomainData(data);
      for (const sample of data) peak = Math.max(peak, Math.abs(sample));
      maxVoices = Math.max(maxVoices, engine.inspect().voices);
    }
    const before = engine.inspect(),
      phase = engine.phase();
    const q = engine.quantize(context.currentTime + 0.03);
    const grid = (q - engine.origin) / (ElectroRhythm.beat * 0.5);
    engine.stop();
    await new Promise((r) => setTimeout(r, 250));
    const stopped = engine.inspect();
    const result = {
      periods,
      peak,
      maxVoices,
      before,
      phase,
      grid,
      notes,
      ducks,
      stopped,
    };
    target.disconnect();
    analyser.disconnect();
    await context.close();
    return result;
  });
  expect(result.peak).toBeGreaterThan(0.01);
  expect(result.peak).toBeLessThan(1);
  result.periods.forEach((p) => expect(p).toBeCloseTo((60 / 104) * 16, 5));
  expect(result.before.loops).toBe(3);
  expect(result.maxVoices).toBeLessThanOrEqual(3);
  expect(result.phase).toBeGreaterThan(1);
  expect(result.grid).toBeCloseTo(Math.round(result.grid), 5);
  expect(result.notes.length).toBeGreaterThan(2);
  expect(result.notes.every((e) => [50, 57, 60, 65].includes(e.note))).toBe(
    true,
  );
  expect(result.ducks.length).toBeGreaterThan(2);
  expect(result.stopped.running).toBe(false);
  expect(result.stopped.voices).toBe(0);
  expect(result.stopped.loops).toBe(0);
});
