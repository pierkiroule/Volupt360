// Shared seeded noise buffer; sources and envelopes are short lived and bounded.
export function createOrganicPercussion(ctx, destination, profile) {
  const noise = ctx.createBuffer(
    1,
    Math.ceil(ctx.sampleRate * 0.35),
    ctx.sampleRate,
  );
  const data = noise.getChannelData(0);
  let seed = 731;
  for (let i = 0; i < data.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    data[i] = seed / 2147483648 - 1;
  }
  const voices = new Set();
  const counts = { kick: 0, wood: 0, shaker: 0 };
  let disposed = false;
  function hit(kind, time, velocity) {
    if (disposed || ctx.state !== "running" || voices.size >= 8) return;
    const envelope = ctx.createGain(),
      filter = ctx.createBiquadFilter(),
      pan = ctx.createStereoPanner();
    const source =
      kind === "shaker" ? ctx.createBufferSource() : ctx.createOscillator();
    const duration = kind === "kick" ? 0.32 : kind === "wood" ? 0.18 : 0.065;
    const level =
      velocity * (kind === "kick" ? 0.32 : kind === "wood" ? 0.2 : 0.075);
    if (kind === "shaker") {
      source.buffer = noise;
      filter.type = "highpass";
      filter.frequency.value = profile.shakerFrequency;
      pan.pan.value = counts.shaker % 2 ? 0.35 : -0.35;
    } else {
      source.type = kind === "kick" ? "sine" : "triangle";
      const frequency =
        kind === "kick" ? profile.kickFrequency : profile.woodFrequency;
      source.frequency.setValueAtTime(
        frequency * (kind === "kick" ? 2.2 : 1.4),
        time,
      );
      source.frequency.exponentialRampToValueAtTime(
        frequency,
        time + duration * 0.5,
      );
      filter.type = "lowpass";
      filter.frequency.value = kind === "kick" ? 900 : 3200;
    }
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(level, time + 0.003);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(pan);
    pan.connect(destination);
    const voice = { source, envelope };
    voices.add(voice);
    counts[kind]++;
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      envelope.disconnect();
      pan.disconnect();
      voices.delete(voice);
    };
    source.start(time);
    source.stop(time + duration + 0.01);
  }
  function pause() {
    for (const { source, envelope } of voices) {
      envelope.gain.cancelScheduledValues(ctx.currentTime);
      envelope.gain.setTargetAtTime(0, ctx.currentTime, 0.008);
      source.stop(ctx.currentTime + 0.04);
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
      pause();
    },
  };
}
