import { SONIC_UNIVERSES } from "./sonicUniverses.js";
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
  { autonomous = true, seedBrush = "voiles", universe = "souffle" } = {},
) {
  const profile = SONIC_UNIVERSES[universe] || SONIC_UNIVERSES.souffle;
  const beat = 60 / profile.bpm;
  const waves = profile.harmonics.map((harmonics) => {
    const real = new Float32Array(harmonics.length + 1),
      imag = new Float32Array(harmonics.length + 1);
    harmonics.forEach((value, i) => (imag[i + 1] = value));
    return ctx.createPeriodicWave(real, imag);
  });
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.3;
  const gain = ctx.createGain(),
    filter = ctx.createBiquadFilter(),
    limiter = ctx.createDynamicsCompressor();
  gain.gain.value = 0.85;
  filter.type = "lowpass";
  filter.frequency.value = profile.cutoff;
  limiter.threshold.value = -15;
  limiter.knee.value = 14;
  limiter.release.value = 0.18;
  limiter.ratio.value = 6;
  limiter.attack.value = 0.003;
  filter.connect(gain);
  gain.connect(limiter);
  limiter.connect(analyser);
  analyser.connect(destination);
  const delay = ctx.createDelay(2),
    echoFilter = ctx.createBiquadFilter(),
    feedback = ctx.createGain(),
    wet = ctx.createGain();
  delay.delayTime.value = beat * profile.delayBeats;
  feedback.gain.value = profile.feedback;
  echoFilter.type = "lowpass";
  echoFilter.frequency.value = 2800;
  wet.gain.value = profile.send;
  filter.connect(delay);
  delay.connect(echoFilter);
  echoFilter.connect(feedback);
  feedback.connect(delay);
  echoFilter.connect(wet);
  wet.connect(gain);
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
    phrase = 0,
    timer,
    lastListenerTime = -Infinity;
  const timbres = { souffle: 0, marees: 0, ramure: 0 };
  function note(
    brush,
    point = { x: 0, y: 0, z: 0 },
    strength = 0.35,
    recall = false,
    motifKey = null,
    scheduled = null,
    degreeOverride = null,
    bass = false,
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
    const familyIndex = family === "souffle" ? 0 : family === "marees" ? 1 : 2;
    const chord =
      profile.progression[
        Math.floor((scheduled ?? now) / (beat * 16)) %
          profile.progression.length
      ];
    const selection =
      Math.abs(
        Math.round((point.y + 20) / 8) +
          (motifKey
            ? [...brush].reduce((sum, char) => sum + char.charCodeAt(0), 0)
            : serial++),
      ) % 4;
    const degree = chord + (degreeOverride ?? [0, 2, 4, 6][selection]);
    const octave = bass ? -12 : family === "ramure" ? 0 : 12;
    const semitone =
      profile.scale[
        ((degree % profile.scale.length) + profile.scale.length) %
          profile.scale.length
      ] +
      Math.floor(degree / profile.scale.length) * 12;
    const frequency = profile.root * 2 ** ((semitone + octave) / 12);
    const start =
        scheduled ?? Math.ceil((now + 0.04) / (beat / 2)) * (beat / 2),
      duration = bass ? beat * 4 : profile.durations[familyIndex];
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
    const level = (0.075 + Math.min(1, strength) * 0.19) * (bass ? 0.8 : 1);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(
      level,
      start + (bass ? 0.1 : profile.attacks[familyIndex]),
    );
    envelope.gain.exponentialRampToValueAtTime(
      level * (universe === "ramure" ? 0.35 : 0.6),
      start + duration * 0.65,
    );
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    envelope.connect(panner);
    panner.connect(filter);
    const sources = [0, 1].map((i) => {
      const oscillator = ctx.createOscillator(),
        partialGain = ctx.createGain();
      oscillator.setPeriodicWave(waves[familyIndex]);
      oscillator.frequency.value = frequency;
      oscillator.detune.value = i
        ? familyIndex === 0
          ? 6
          : familyIndex === 1
            ? 3
            : 1.5
        : -1.5;
      partialGain.gain.value = i ? 0.27 : 0.85;
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
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setTargetAtTime(0, ctx.currentTime, 0.015);
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
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setTargetAtTime(0.85, ctx.currentTime, 0.03);
    if (!autonomous) return;
    nextBreath = ctx.currentTime;
    const schedule = () => {
      if (active && ctx.state === "running" && ctx.currentTime >= nextBreath) {
        const memories = [...motifs.values()];
        const motif = memories.length
          ? memories[phrase % memories.length]
          : null;
        const brush = motif?.brush || seedBrush,
          point = motif?.position || { x: -8, y: 4, z: 12 };
        const start = Math.ceil((ctx.currentTime + 0.05) / beat) * beat;
        const degree = profile.melody[phrase % profile.melody.length] * 2;
        note(
          brush,
          point,
          profile.dynamics[phrase % 4] * 0.5,
          true,
          motif?.key,
          start,
          degree,
        );
        // A low anchor and an answering note shape phrases rather than a drone.
        if (phrase % 2 === 0)
          note(
            "falaises",
            { x: 0, y: -8, z: 16 },
            0.32,
            true,
            null,
            start,
            0,
            true,
          );
        note(
          brush,
          { x: -point.x * 0.6, y: point.y + 3, z: point.z },
          0.22,
          true,
          motif?.key,
          start + beat * (universe === "ramure" ? 1.5 : 2),
          (degree + 2) % 7,
        );
        phrase++;
        nextBreath = start + beat * profile.phraseBeats;
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
        universe,
        bpm: profile.bpm,
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
      delay.disconnect();
      echoFilter.disconnect();
      feedback.disconnect();
      wet.disconnect();
      recent.clear();
      motifs.clear();
    },
  };
}
