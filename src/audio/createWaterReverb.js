// Seeded synthetic impulse response, calculated once, never fetched from a file.
export function createWaterReverb(ctx, destination, profile) {
  const seconds =
    profile.waterColor === 0 ? 5.8 : profile.waterColor === 2 ? 3.8 : 2.8;
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
        (profile.waterColor === 2 ? 0.12 : 0.15) *
        (seed / 2147483648 - 1 - filtered);
      data[i] = filtered * envelope * Math.min(1, i / (ctx.sampleRate * 0.025));
      envelope *= decay;
    }
  }
  const convolver = ctx.createConvolver(),
    wet = ctx.createGain(),
    predelay = ctx.createDelay(0.1),
    sendFilter = ctx.createBiquadFilter(),
    damping = ctx.createBiquadFilter();
  sendFilter.type = "highpass";
  sendFilter.frequency.value = 180;
  sendFilter.Q.value = 0.5;
  sendFilter.connect(predelay);
  predelay.delayTime.value = 0.028;
  damping.type = "lowpass";
  damping.frequency.value = 2200;
  damping.Q.value = 0.5;
  convolver.buffer = response;
  wet.gain.value = profile.waterColor === 2 ? 0.25 : 0.24;
  predelay.connect(convolver);
  convolver.connect(damping);
  damping.connect(wet);
  wet.connect(destination);
  return {
    input: sendFilter,
    dispose() {
      sendFilter.disconnect();
      predelay.disconnect();
      damping.disconnect();
      convolver.disconnect();
      wet.disconnect();
      convolver.buffer = null;
    },
  };
}
