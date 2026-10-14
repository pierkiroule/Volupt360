import { createEchoInstrument } from "./createEchoInstrument.js";
const IDS = ["souffle", "marees", "ramure"];

export async function createAmbientMixer(ctx, destination, initial) {
  const analyser = ctx.createAnalyser(),
    compressor = ctx.createDynamicsCompressor();
  analyser.fftSize = 2048;
  compressor.threshold.value = -14;
  compressor.ratio.value = 8;
  compressor.attack.value = 0.003;
  compressor.connect(analyser);
  analyser.connect(destination);
  const gains = IDS.map(() => {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(compressor);
    return gain;
  });
  const instruments = [];
  try {
    for (let i = 0; i < IDS.length; i++)
      instruments.push(
        await createEchoInstrument(ctx, gains[i], {
          universe: IDS[i],
          seedBrush: ["voiles", "corolles", "falaises"][i],
        }),
      );
  } catch (error) {
    instruments.forEach((item) => item.dispose());
    gains.forEach((gain) => gain.disconnect());
    compressor.disconnect();
    analyser.disconnect();
    throw error;
  }
  instruments.forEach((item) => item.pause());
  let weights = IDS.map((id) => (id === initial ? 1 : 0)),
    active = false,
    disposed = false;
  const timers = new Set();
  function apply() {
    timers.forEach(clearTimeout);
    timers.clear();
    gains.forEach((gain, i) => {
      if (gain.gain.cancelAndHoldAtTime)
        gain.gain.cancelAndHoldAtTime(ctx.currentTime);
      else {
        const level = gain.gain.value;
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(level, ctx.currentTime);
      }
      gain.gain.setTargetAtTime(
        active ? Math.sqrt(weights[i]) : 0,
        ctx.currentTime,
        0.35,
      );
      if (active && weights[i] > 0) instruments[i].resume();
      else {
        const timer = setTimeout(() => {
          timers.delete(timer);
          if (!active || weights[i] === 0) instruments[i].pause();
        }, 1600);
        timers.add(timer);
      }
    });
  }
  return {
    graph: {
      ctx,
      analyser,
      bins: new Uint8Array(analyser.frequencyBinCount),
      wave: new Uint8Array(analyser.fftSize),
      prev: new Float32Array(analyser.frequencyBinCount),
    },
    setMix(values) {
      if (disposed) return;
      const sum = values.reduce((a, b) => a + Math.max(0, b), 0);
      if (!sum) return;
      weights = IDS.map((_, i) => Math.max(0, values[i] || 0) / sum);
      apply();
    },
    setBrushImage(id, profile) {
      instruments.forEach((item) => item.setBrushImage?.(id, profile));
    },
    setAtmosphere(values) {
      instruments.forEach((item) => item.setAtmosphere?.(values));
    },
    resume() {
      if (disposed) return;
      active = true;
      apply();
    },
    pause() {
      active = false;
      timers.forEach(clearTimeout);
      timers.clear();
      gains.forEach((gain) =>
        gain.gain.setTargetAtTime(0, ctx.currentTime, 0.02),
      );
      instruments.forEach((item) => item.pause());
    },
    deposit(brush, position, energy, key) {
      instruments.forEach((item, i) => {
        if (weights[i] > 0)
          item.deposit(brush, position, energy * weights[i], key);
      });
    },
    recall(brush, position, key) {
      instruments.forEach((item, i) => {
        if (weights[i] > 0) item.recall(brush, position, key);
      });
    },
    forget(key) {
      instruments.forEach((item) => item.forget(key));
    },
    traceResonance(key) {
      return instruments.reduce(
        (sum, item, i) => sum + weights[i] * (item.traceResonance?.(key) || 0),
        0,
      );
    },
    listener(...args) {
      instruments.forEach((item) => item.listener(...args));
    },
    get stats() {
      const primary = weights.indexOf(Math.max(...weights));
      return {
        ...instruments[primary].stats,
        active,
        mix: [...weights],
        universe: IDS[primary],
      };
    },
    dispose() {
      disposed = true;
      this.pause();
      instruments.forEach((item) => item.dispose());
      gains.forEach((gain) => gain.disconnect());
      compressor.disconnect();
      analyser.disconnect();
    },
  };
}
