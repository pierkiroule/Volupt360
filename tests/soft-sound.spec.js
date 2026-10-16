import { test, expect } from "@playwright/test";

test("warm full-mix filters retain fundamentals while attenuating harsh high frequencies", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createSoftTone } = await import("/src/audio/createSoftTone.js");
    const ctx = new OfflineAudioContext(2, 24000, 24000);
    const tone = createSoftTone(ctx, ctx.destination);
    await ctx.startRendering();
    const frequency = new Float32Array([100, 1000, 3500, 10000]),
      combined = [1, 1, 1, 1];
    for (const filter of tone.filters) {
      const magnitude = new Float32Array(4),
        phase = new Float32Array(4);
      filter.getFrequencyResponse(frequency, magnitude, phase);
      magnitude.forEach((value, i) => (combined[i] *= value));
    }
    tone.dispose();
    return combined.map((value) => 20 * Math.log10(value));
  });
  expect(result[0]).toBeGreaterThan(-2);
  expect(result[1]).toBeGreaterThan(-5);
  expect(result[2]).toBeLessThan(-6);
  expect(result[3]).toBeLessThan(-25);
});

test("procedural reverb renders a diffuse decaying tail and releases its nodes", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createWaterReverb } =
      await import("/src/audio/createWaterReverb.js");
    const { SONIC_UNIVERSES } = await import("/src/audio/sonicUniverses.js");
    const rate = 24000,
      ctx = new OfflineAudioContext(2, rate * 7, rate);
    const reverb = createWaterReverb(
      ctx,
      ctx.destination,
      SONIC_UNIVERSES.souffle,
    );
    const impulse = ctx.createBuffer(1, 1, rate);
    impulse.getChannelData(0)[0] = 1;
    const source = ctx.createBufferSource();
    source.buffer = impulse;
    source.connect(reverb.input);
    source.start();
    const buffer = await ctx.startRendering(),
      samples = buffer.getChannelData(0);
    function rms(start, end) {
      let sum = 0;
      for (let i = Math.floor(start * rate); i < Math.floor(end * rate); i++)
        sum += samples[i] ** 2;
      return Math.sqrt(sum / ((end - start) * rate));
    }
    const result = {
      early: rms(0.05, 0.8),
      tail: rms(2, 3),
      ending: rms(5, 6),
      finite: samples.every(Number.isFinite),
    };
    source.disconnect();
    reverb.dispose();
    return result;
  });
  expect(result.finite).toBe(true);
  expect(result.early).toBeGreaterThan(0.000001);
  expect(result.tail).toBeGreaterThan(0.00000001);
  expect(result.tail).toBeLessThan(result.early);
  expect(result.ending).toBeLessThan(result.tail);
});
