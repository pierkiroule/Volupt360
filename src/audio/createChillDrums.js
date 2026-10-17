/** Soft electronic drums, native Web Audio, with one shared seeded noise buffer. */
export function createChillDrums(ctx, destination) {
  const noise = ctx.createBuffer(
    1,
    Math.ceil(ctx.sampleRate * 0.22),
    ctx.sampleRate,
  );
  let seed = 731;
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    data[i] = seed / 2147483648 - 1;
  }
  const voices = new Set(),
    counts = { kick: 0, wood: 0, shaker: 0 };
  let disposed = false;
  function hit(kind, time, velocity) {
    if (disposed || ctx.state !== "running" || voices.size >= 12) return;
    const start = Math.max(ctx.currentTime, time),
      kick = kind === "kick";
    const duration = kick ? 0.38 : kind === "wood" ? 0.17 : 0.065;
    const source = kick ? ctx.createOscillator() : ctx.createBufferSource();
    const envelope = ctx.createGain(),
      tone = ctx.createBiquadFilter(),
      pan = ctx.createStereoPanner();
    if (kick) {
      source.type = "sine";
      source.frequency.setValueAtTime(110, start);
      source.frequency.exponentialRampToValueAtTime(46, start + 0.12);
      tone.type = "lowpass";
      tone.frequency.value = 350;
    } else {
      source.buffer = noise;
      tone.type = kind === "wood" ? "bandpass" : "highpass";
      tone.frequency.value = kind === "wood" ? 1500 : 2200;
      tone.Q.value = 0.55;
    }
    pan.pan.value = kind === "shaker" ? (counts.shaker % 2 ? 0.22 : -0.22) : 0;
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(
      Math.min(1, velocity) * (kick ? 0.65 : 0.22),
      start + 0.006,
    );
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(tone);
    tone.connect(envelope);
    envelope.connect(pan);
    pan.connect(destination);
    const voice = { source, tone, envelope, pan };
    voices.add(voice);
    counts[kind]++;
    source.onended = () => {
      source.disconnect();
      tone.disconnect();
      envelope.disconnect();
      pan.disconnect();
      voices.delete(voice);
    };
    source.start(start);
    source.stop(start + duration + 0.02);
  }
  return {
    hit,
    pause() {
      for (const voice of voices) {
        voice.envelope.gain.cancelScheduledValues(ctx.currentTime);
        voice.envelope.gain.setTargetAtTime(0, ctx.currentTime, 0.015);
        try {
          voice.source.stop(ctx.currentTime + 0.06);
        } catch {}
      }
    },
    get stats() {
      return { voices: voices.size, counts: { ...counts } };
    },
    dispose() {
      disposed = true;
      for (const voice of voices) {
        voice.source.onended = null;
        try {
          voice.source.stop();
        } catch {}
        voice.source.disconnect();
        voice.tone.disconnect();
        voice.envelope.disconnect();
        voice.pan.disconnect();
      }
      voices.clear();
    },
  };
}
