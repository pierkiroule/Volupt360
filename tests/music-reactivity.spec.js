import { test, expect } from "@playwright/test";

test("the real ambience audio graph responds to musical level changes without activating brush pads", async ({
  page,
}) => {
  await page.goto("/?instrument=off");
  const result = await page.evaluate(async () => {
    const { createTwigBank } = await import("/src/sonoizo/createTwigBank.js");
    const bank = createTwigBank({ ids: ["voiles"] });
    bank.enableFireflies();
    const rate = 24000,
      frames = rate * 2.4;
    const bytes = new ArrayBuffer(44 + frames * 2),
      view = new DataView(bytes);
    const text = (offset, value) =>
      [...value].forEach((char, i) =>
        view.setUint8(offset + i, char.charCodeAt(0)),
      );
    text(0, "RIFF");
    view.setUint32(4, bytes.byteLength - 8, true);
    text(8, "WAVE");
    text(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, rate, true);
    view.setUint32(28, rate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    text(36, "data");
    view.setUint32(40, frames * 2, true);
    for (let i = 0; i < frames; i++) {
      const time = i / rate,
        amplitude = time < 0.7 ? 0.018 : time < 1.4 ? 0.14 : 0.001;
      view.setInt16(
        44 + i * 2,
        Math.sin(time * Math.PI * 440) * amplitude * 32767,
        true,
      );
    }
    await bank.preparePlayback();
    await bank.importAmbience(
      new File([bytes], "dynamics.wav", { type: "audio/wav" }),
    );
    await bank.toggleAmbience();
    const samples = [];
    for (let i = 0; i < 57; i++) {
      await new Promise((resolve) => setTimeout(resolve, 40));
      samples.push(bank.getVisualFeatures().energy);
    }
    const mean = (a, b) =>
      samples.slice(a, b).reduce((sum, x) => sum + x, 0) / (b - a);
    const result = {
      quiet: mean(5, 12),
      loud: mean(23, 30),
      silence: mean(46, 55),
      voices: bank.getVoices().length,
    };
    bank.dispose();
    return result;
  });
  expect(result.loud).toBeGreaterThan(result.quiet + 0.15);
  expect(result.silence).toBeLessThan(result.loud - 0.25);
  expect(result.voices).toBe(0);
});

test("quiet music gets legible visual energy with restrained decay in silence", async ({
  page,
}) => {
  await page.goto("/?instrument=off");
  const response = await page.evaluate(async () => {
    const { createVisualAudioResponse } =
      await import("/src/audio/createVisualAudioResponse.js");
    const respond = createVisualAudioResponse();
    let quiet, silent;
    for (let i = 0; i < 25; i++)
      quiet = respond({
        rms: 0.012,
        low: 0.2,
        high: 0.1,
        flux: 0.03,
        freq: 600,
      });
    const accent = respond({
      rms: 0.06,
      low: 0.4,
      high: 0.2,
      flux: 0.3,
      freq: 900,
    });
    for (let i = 0; i < 50; i++) silent = respond({});
    return { quiet, accent, silent };
  });
  expect(response.quiet.energy).toBeGreaterThan(0.3);
  expect(response.accent.energy).toBeGreaterThan(response.quiet.energy);
  expect(response.accent.pulse).toBeGreaterThan(0.5);
  expect(response.silent.energy).toBeLessThan(0.01);
});
