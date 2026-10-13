const SCALE = [0, 2, 4, 7, 9];
const FAMILIES = {
  souffle: ["voiles", "filaments", "aurore", "dilution", "plumes", "lucioles"],
  marees: [
    "corolles",
    "brumes",
    "bulles",
    "lagons",
    "feuilles",
    "filamentslibres",
  ],
};
export function createEchoInstrument(
  ctx,
  destination,
  { autonomous = true, seedBrush = "voiles" } = {},
) {
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.3;
  const gain = ctx.createGain(),
    filter = ctx.createBiquadFilter(),
    limiter = ctx.createDynamicsCompressor();
  gain.gain.value = 0.45;
  filter.type = "lowpass";
  filter.frequency.value = 3800;
  limiter.threshold.value = -18;
  limiter.ratio.value = 4;
  limiter.attack.value = 0.02;
  filter.connect(gain);
  gain.connect(limiter);
  limiter.connect(analyser);
  analyser.connect(destination);
  const graph = {
    ctx,
    analyser,
    bins: new Uint8Array(analyser.frequencyBinCount),
    wave: new Uint8Array(analyser.fftSize),
    prev: new Float32Array(analyser.frequencyBinCount),
  };
  const voices = new Set(),
    recent = new Map(),
    motifs = new Map();
  let active = false,
    disposed = false,
    nextBreath = 0,
    serial = 0,
    total = 0,
    timer,
    lastListenerTime = -Infinity;
  const timbres = { souffle: 0, marees: 0, ramure: 0 };
  function note(
    brush,
    point = { x: 0, y: 0, z: 0 },
    strength = 0.35,
    recall = false,
    motifKey = null,
  ) {
    if (!active || disposed || ctx.state !== "running" || voices.size >= 10)
      return false;
    const now = ctx.currentTime;
    if (!recall && now - (recent.get(brush) ?? -Infinity) < 0.9) return false;
    recent.set(brush, now);
    const family = FAMILIES.souffle.includes(brush)
      ? "souffle"
      : FAMILIES.marees.includes(brush)
        ? "marees"
        : "ramure";
    const index =
      (((Math.round((point.y + 20) / 8) +
        (motifKey
          ? [...brush].reduce((sum, char) => sum + char.charCodeAt(0), 0)
          : serial++)) %
        SCALE.length) +
        SCALE.length) %
      SCALE.length;
    const octave = family === "ramure" ? 0 : 12;
    const frequency = 146.832 * 2 ** ((SCALE[index] + octave) / 12);
    const start = Math.ceil((now + 0.04) / 0.75) * 0.75,
      duration = family === "souffle" ? 4.5 : family === "marees" ? 3.6 : 2.7;
    const envelope = ctx.createGain(),
      panner = ctx.createPanner();
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = 18;
    panner.rolloffFactor = 0.35;
    panner.maxDistance = 180;
    panner.positionX.value = point.x;
    panner.positionY.value = point.y;
    panner.positionZ.value = point.z;
    const level = 0.05 + Math.min(1, strength) * 0.08;
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(
      level,
      start + (family === "souffle" ? 0.6 : 0.12),
    );
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    envelope.connect(panner);
    panner.connect(filter);
    const sources = [1, family === "marees" ? 3 : 2].map((partial, i) => {
      const oscillator = ctx.createOscillator(),
        partialGain = ctx.createGain();
      oscillator.type = family === "ramure" ? "triangle" : "sine";
      oscillator.frequency.value = frequency * partial;
      oscillator.detune.value = i ? Math.sin(serial * 1.3) * 3 : 0;
      partialGain.gain.value = i ? 0.13 : 1;
      oscillator.connect(partialGain);
      partialGain.connect(envelope);
      oscillator.start(start);
      oscillator.stop(start + duration);
      return { oscillator, partialGain };
    });
    const voice = { sources, envelope, panner };
    voices.add(voice);
    total++;
    timbres[family]++;
    sources[0].oscillator.onended = () => {
      for (const source of sources) {
        source.oscillator.disconnect();
        source.partialGain.disconnect();
      }
      envelope.disconnect();
      panner.disconnect();
      voices.delete(voice);
    };
    return true;
  }
  function pause() {
    active = false;
    clearInterval(timer);
    for (const voice of voices) {
      const now = ctx.currentTime;
      if (voice.envelope.gain.cancelAndHoldAtTime)
        voice.envelope.gain.cancelAndHoldAtTime(now);
      else {
        const value = voice.envelope.gain.value;
        voice.envelope.gain.cancelScheduledValues(now);
        voice.envelope.gain.setValueAtTime(value, now);
      }
      voice.envelope.gain.linearRampToValueAtTime(0, now + 0.06);
      for (const source of voice.sources) {
        try {
          source.oscillator.stop(now + 0.06);
        } catch {}
      }
    }
    voices.clear();
  }
  function resume() {
    if (disposed || active) return;
    active = true;
    if (!autonomous) return;
    nextBreath = ctx.currentTime;
    const schedule = () => {
      if (active && ctx.state === "running" && ctx.currentTime >= nextBreath) {
        const memories = [...motifs.values()];
        const motif = memories.length
          ? memories[serial++ % memories.length]
          : null;
        if (motif) note(motif.brush, motif.position, 0.3, true, motif.key);
        else note(seedBrush, { x: -8, y: 4, z: 12 }, 0.22, true);
        nextBreath = ctx.currentTime + 4.5;
      }
    };
    schedule();
    timer = setInterval(schedule, 120);
  }
  return {
    graph,
    resume,
    pause,
    deposit(brush, position, energy, key = brush) {
      let motif = motifs.get(key);
      if (!motif) {
        if (motifs.size >= 80) motifs.delete(motifs.keys().next().value);
        motif = { key, brush, position: { ...position }, count: 0 };
        motifs.set(key, motif);
      }
      motif.count++;
      for (const axis of ["x", "y", "z"])
        motif.position[axis] +=
          (position[axis] - motif.position[axis]) / motif.count;
      return note(brush, motif.position, energy, false, key);
    },
    forget(key) {
      motifs.delete(key);
    },
    recall(brush, position, key = brush) {
      return note(brush, motifs.get(key)?.position || position, 0.7, true, key);
    },
    listener(position, direction, up) {
      if (!active || ctx.currentTime - lastListenerTime < 0.033) return;
      lastListenerTime = ctx.currentTime;
      const listener = ctx.listener,
        now = ctx.currentTime;
      if (listener.positionX) {
        for (const [axis, value] of [
          ["X", position.x],
          ["Y", position.y],
          ["Z", position.z],
        ])
          listener[`position${axis}`].setTargetAtTime(value, now, 0.08);
        for (const [axis, value] of [
          ["X", direction.x],
          ["Y", direction.y],
          ["Z", direction.z],
        ])
          listener[`forward${axis}`].setTargetAtTime(value, now, 0.08);
        for (const [axis, value] of [
          ["X", up.x],
          ["Y", up.y],
          ["Z", up.z],
        ])
          listener[`up${axis}`].setTargetAtTime(value, now, 0.08);
      } else {
        listener.setPosition(position.x, position.y, position.z);
        listener.setOrientation(
          direction.x,
          direction.y,
          direction.z,
          up.x,
          up.y,
          up.z,
        );
      }
    },
    get stats() {
      return {
        active,
        voices: voices.size,
        total,
        motifs: motifs.size,
        timbres: { ...timbres },
      };
    },
    dispose() {
      disposed = true;
      pause();
      analyser.disconnect();
      limiter.disconnect();
      gain.disconnect();
      filter.disconnect();
      recent.clear();
      motifs.clear();
    },
  };
}
