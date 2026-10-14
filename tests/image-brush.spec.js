import { test, expect } from "@playwright/test";

test("image analysis changes photographic alpha, palette and real synthesized sound", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createImageBrush } = await import("/src/engine/ImageBrush.js");
    const { createEchoInstrument } =
      await import("/src/audio/createEchoInstrument.js");
    const create = async (dark) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 64;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = dark ? "#163824" : "#f2c9bf";
      ctx.fillRect(0, 0, 64, 64);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve));
      return createImageBrush(
        new File([blob], "image.png", { type: "image/png" }),
      );
    };
    const profiles = await Promise.all([create(false), create(true)]);
    const ctx = new AudioContext();
    await ctx.resume();
    const mute = ctx.createGain();
    mute.gain.value = 0;
    mute.connect(ctx.destination);
    const instruments = [];
    for (const profile of profiles) {
      const instrument = await createEchoInstrument(ctx, mute, {
        autonomous: false,
      });
      instrument.setBrushImage("voiles", profile);
      instrument.resume();
      instrument.deposit("voiles", { x: 10, y: 0, z: -10 }, 0.7, "a");
      instruments.push(instrument);
    }
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const levels = instruments.map((instrument) => {
      const spectrum = new Uint8Array(1024),
        wave = new Float32Array(2048);
      instrument.graph.analyser.getByteFrequencyData(spectrum);
      instrument.graph.analyser.getFloatTimeDomainData(wave);
      return {
        rms: Math.sqrt(wave.reduce((sum, x) => sum + x * x, 0) / wave.length),
        centroid:
          spectrum.reduce((sum, x, i) => sum + x * i, 0) /
          spectrum.reduce((sum, x) => sum + x, 0),
      };
    });
    const data = profiles.map((profile) => ({
      light: profile.stats.light,
      color: profile.sample({ x: 1, y: 0, z: 0 }).color.getHexString(),
      alpha: profile.binding.texture.image
        .getContext("2d")
        .getImageData(0, 0, 1, 1).data[3],
    }));
    instruments.forEach((i) => i.dispose());
    profiles.forEach((p) => p.binding.texture.dispose());
    mute.disconnect();
    await ctx.close();
    return { data, levels };
  });
  expect(result.data[0].light).toBeGreaterThan(result.data[1].light + 0.4);
  expect(result.data[0].color).not.toBe(result.data[1].color);
  expect(result.data[1].alpha).toBeGreaterThan(result.data[0].alpha + 10);
  for (const level of result.levels) expect(level.rms).toBeGreaterThan(0.001);
  expect(
    Math.abs(result.levels[0].centroid - result.levels[1].centroid),
  ).toBeGreaterThan(2);
});
