import { createWaterSource } from "./createWaterAudio.js";

export function createWaterPercussion(ctx, destination, profile) {
  const voices = new Set(),
    retiring = new Set();
  const counts = { kick: 0, wood: 0, shaker: 0 };
  let disposed = false,
    serial = 0;
  function hit(kind, time, velocity) {
    if (disposed || ctx.state !== "running" || voices.size + retiring.size >= 8)
      return;
    const type =
      kind === "kick" ? "bubble" : kind === "wood" ? "drop" : "spray";
    const duration = kind === "kick" ? 0.48 : kind === "wood" ? 0.3 : 0.12;
    const source = createWaterSource(ctx, {
      type,
      duration,
      startAt: time,
      frequency:
        kind === "kick" ? profile.kickFrequency : profile.woodFrequency,
      seed: profile.seed + serial++ * 101,
      color: profile.waterColor,
      velocity,
    });
    const pan = ctx.createStereoPanner();
    pan.pan.value = kind === "shaker" ? (counts.shaker % 2 ? 0.3 : -0.3) : 0;
    source.node.connect(pan);
    pan.connect(destination);
    voices.add(source);
    counts[kind]++;
    source.onended = () => {
      source.disconnect();
      pan.disconnect();
      voices.delete(source);
      retiring.delete(source);
    };
    source.pan = pan;
  }
  function pause() {
    for (const source of voices) {
      retiring.add(source);
      source.stop(ctx.currentTime);
    }
    voices.clear();
  }
  return {
    hit,
    pause,
    get stats() {
      return { voices: voices.size, counts: { ...counts } };
    },
    dispose() {
      disposed = true;
      for (const source of [...voices, ...retiring]) {
        source.disconnect();
        source.pan.disconnect();
      }
      voices.clear();
      retiring.clear();
    },
  };
}
