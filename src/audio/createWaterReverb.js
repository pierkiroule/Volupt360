// Seeded synthetic impulse response, calculated once, never fetched from a file.
export function createWaterReverb(ctx, destination, profile) {
  const seconds =
    profile.waterColor === 2 ? 2.8 : profile.waterColor === 1 ? 1.6 : 1.1;
  const response = ctx.createBuffer(
    2,
    Math.ceil(ctx.sampleRate * seconds),
    ctx.sampleRate,
  );
  let seed = profile.seed;
  for (let channel = 0; channel < 2; channel++) {
    const data = response.getChannelData(channel);
    let filtered = 0;
    const decay = Math.exp(-7 / (seconds * ctx.sampleRate));
    let envelope = 1;
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      filtered +=
        (profile.waterColor === 2 ? 0.12 : 0.3) *
        (seed / 2147483648 - 1 - filtered);
      data[i] = filtered * envelope * Math.min(1, i / (ctx.sampleRate * 0.025));
      envelope *= decay;
    }
  }
  const convolver = ctx.createConvolver(),
    wet = ctx.createGain();
  convolver.buffer = response;
  wet.gain.value = profile.waterColor === 2 ? 0.25 : 0.14;
  convolver.connect(wet);
  wet.connect(destination);
  return {
    input: convolver,
    dispose() {
      convolver.disconnect();
      wet.disconnect();
      convolver.buffer = null;
    },
  };
}
