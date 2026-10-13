import { createWaterSource, prepareWaterAudio } from "./createWaterAudio.js";
import { createWaterPercussion } from "./createWaterPercussion.js";
import { createWaterReverb } from "./createWaterReverb.js";
import { createVisualSoundDialogue } from "./VisualSoundDialogue.js";
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
export async function createEchoInstrument(
  ctx,
  destination,
  { autonomous = true, seedBrush = "voiles", universe = "souffle" } = {},
) {
  if (
    import.meta.env.VITE_ENABLE_WATER_SYNTHESIS === "false" ||
    new URLSearchParams(location.search).get("sound") === "legacy"
  )
    return (
      await import("./createLegacyEchoInstrument.js")
    ).createLegacyEchoInstrument(ctx, destination, {
      autonomous,
      seedBrush,
      universe,
    });
  const profile = SONIC_UNIVERSES[universe] || SONIC_UNIVERSES.souffle;
  const beat = 60 / profile.bpm;
  await prepareWaterAudio(ctx);
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
  const reverb = createWaterReverb(ctx, gain, profile);
  filter.connect(reverb.input);
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
  const percussion = createWaterPercussion(ctx, gain, profile);
  const waterBed = createWaterSource(ctx, {
    type: "flow",
    startAt: ctx.currentTime,
    duration: 1,
    frequency: profile.root,
    scale: profile.scale,
    color: profile.waterColor,
    seed: profile.seed,
    velocity: profile.flowLevel,
  });
  const bedGain = ctx.createGain();
  bedGain.gain.value = 0;
  waterBed.node.connect(bedGain);
  bedGain.connect(filter);
  const dialogue = createVisualSoundDialogue();
  const resonances = new Map();
  const pad = createWaterSource(ctx, {
    type: "pad",
    startAt: ctx.currentTime,
    duration: 1,
    frequency: profile.root,
    scale: profile.waterColor === 0 ? [0, 4, 7, 11] : [0, 3, 7, 10],
    color: profile.waterColor,
    seed: profile.seed + 71,
    velocity: profile.padLevel,
  });
  const padGain = ctx.createGain();
  padGain.gain.value = 0;
  pad.node.connect(padGain);
  padGain.connect(filter);
  const graph = {
    ctx,
    analyser,
    bins: new Uint8Array(analyser.frequencyBinCount),
    wave: new Uint8Array(analyser.fftSize),
    prev: new Float32Array(analyser.frequencyBinCount),
  };
  const retiring = new Set();
  const voices = new Set(),
    recent = new Map(),
    motifs = new Map();
  let active = false,
    disposed = false,
    transportOrigin = 0,
    sequenceStep = 0,
    leadNotes = 0,
    activity = 0,
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
    scheduled = null,
    degreeOverride = null,
    bass = false,
    melodicDuration = null,
  ) {
    if (
      !active ||
      disposed ||
      ctx.state !== "running" ||
      voices.size + retiring.size >= 10
    )
      return false;
    const now = ctx.currentTime;
    if (!recall && now - (recent.get(brush) ?? -Infinity) < 0.9) return false;
    if (!recall) recent.set(brush, now);
    const family = FAMILIES.souffle.includes(brush)
      ? "souffle"
      : FAMILIES.marees.includes(brush)
        ? "marees"
        : "ramure";
    const familyIndex = family === "souffle" ? 0 : family === "marees" ? 1 : 2;
    const chord =
      profile.progression[
        Math.max(
          0,
          Math.floor(((scheduled ?? now) - transportOrigin) / (beat * 8)),
        ) % profile.progression.length
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
      duration =
        melodicDuration ?? (bass ? beat * 3 : profile.durations[familyIndex]);
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
    const level = (0.24 + Math.min(1, strength) * 0.55) * (bass ? 0.85 : 1);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(
      level,
      start +
        (melodicDuration ? 0.018 : bass ? 0.1 : profile.attacks[familyIndex]),
    );
    envelope.gain.exponentialRampToValueAtTime(
      level * (universe === "ramure" ? 0.35 : 0.6),
      start + duration * 0.65,
    );
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    envelope.connect(panner);
    panner.connect(filter);
    const waterSource = createWaterSource(ctx, {
      type: bass ? "bass" : profile.materials[familyIndex],
      startAt: start,
      duration,
      frequency,
      color: profile.waterColor,
      seed: profile.seed + total * 17 + familyIndex,
      velocity: bass
        ? Math.min(1, profile.bassLevel * (0.8 + dialogue.state.spread * 0.2))
        : 0.9,
    });
    waterSource.node.parameters
      .get("shape")
      .setValueAtTime(dialogue.state.curvature, start);
    waterSource.node.connect(envelope);
    const sources = [{ oscillator: waterSource }];
    const voice = { sources, envelope, panner };
    voices.add(voice);
    if (motifKey && motifs.has(motifKey)) {
      if (resonances.size >= 80)
        resonances.delete(resonances.keys().next().value);
      resonances.set(motifKey, {
        start,
        duration,
        strength: Math.min(1, strength),
      });
    }
    total++;
    timbres[family]++;
    voice.release = () => {
      for (const source of sources) {
        source.oscillator.disconnect();
      }
      envelope.disconnect();
      panner.disconnect();
      voices.delete(voice);
      retiring.delete(voice);
    };
    waterSource.onended = voice.release;
    return true;
  }
  function pause() {
    active = false;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setTargetAtTime(0, ctx.currentTime, 0.015);
    bedGain.gain.setTargetAtTime(0, ctx.currentTime, 0.015);
    waterBed.node.parameters
      .get("gate")
      .setValueAtTime(0, ctx.currentTime + 0.1);
    clearInterval(timer);
    percussion.pause();
    padGain.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
    pad.node.parameters.get("gate").setValueAtTime(0, ctx.currentTime + 0.15);
    for (const voice of voices) {
      retiring.add(voice);
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
    waterBed.node.parameters.get("gate").cancelScheduledValues(ctx.currentTime);
    waterBed.node.parameters
      .get("gate")
      .setValueAtTime(autonomous ? 1 : 0, ctx.currentTime);
    bedGain.gain.setTargetAtTime(autonomous ? 0.85 : 0, ctx.currentTime, 0.2);
    pad.node.parameters.get("gate").cancelScheduledValues(ctx.currentTime);
    pad.node.parameters
      .get("gate")
      .setValueAtTime(autonomous ? 1 : 0, ctx.currentTime);
    padGain.gain.setTargetAtTime(autonomous ? 0.7 : 0, ctx.currentTime, 0.6);
    if (!autonomous) return;
    transportOrigin = ctx.currentTime + 0.06;
    sequenceStep = 0;
    const tickDuration = beat / 2;
    const schedule = () => {
      if (!active || ctx.state !== "running") return;
      // Schedule with AudioContext time, never with timer jitter; skip missed ticks.
      if (
        transportOrigin + sequenceStep * tickDuration <
        ctx.currentTime - 0.02
      )
        sequenceStep = Math.ceil(
          (ctx.currentTime - transportOrigin) / tickDuration,
        );
      while (
        transportOrigin + sequenceStep * tickDuration <
        ctx.currentTime + 0.16
      ) {
        const form = dialogue.state;
        pad.node.parameters
          .get("shape")
          .setTargetAtTime(form.brightness, ctx.currentTime, 0.4);
        padGain.gain.setTargetAtTime(
          0.7 + form.density * 0.25,
          ctx.currentTime,
          0.8,
        );
        filter.frequency.setTargetAtTime(
          profile.cutoff * (0.65 + form.brightness * 0.55),
          ctx.currentTime,
          0.5,
        );
        const step = sequenceStep % 16,
          bar = Math.floor(sequenceStep / 16);
        const start =
          transportOrigin +
          sequenceStep * tickDuration +
          (step % 2 ? profile.swing * tickDuration : 0);
        for (const kind of ["kick", "wood", "shaker"]) {
          const velocity = profile.rhythm[kind][step];
          if (velocity)
            percussion.hit(kind, start, velocity * (0.8 + activity * 0.2));
        }
        const memories = [...motifs.values()];
        const motif = memories.length ? memories[bar % memories.length] : null;
        const brush = motif?.brush || seedBrush;
        const point = motif?.position || { x: -8, y: 4, z: 12 };
        const melody = profile.lead.find((event) => event[0] === step);
        if (melody) {
          const [, degree, length, velocity] = melody;
          // Alternate a composed question with its softer, descending answer.
          const pitch = Math.max(
            0,
            degree +
              Math.round((form.brightness - 0.45) * 3) -
              (bar % 4 === 3 ? 1 : 0),
          );
          if (
            note(
              brush,
              point,
              velocity * (0.65 + activity * 0.2),
              true,
              motif?.key,
              start,
              pitch,
              false,
              beat * length * (1.2 - form.speed * 0.4),
            )
          )
            leadNotes++;
        }
        if (step === 0 || step === 8)
          note(
            "falaises",
            { x: 0, y: -8, z: 16 },
            step === 0 ? 0.42 : 0.3,
            true,
            null,
            start,
            step === 0 ? 0 : 4,
            true,
          );
        activity *= 0.94;
        sequenceStep++;
      }
    };
    schedule();
    timer = setInterval(schedule, 40);
  }
  return {
    graph,
    resume,
    pause,
    deposit(brush, position, energy, key = brush) {
      dialogue.record(key, position, ctx.currentTime);
      waterBed.node.parameters
        .get("energy")
        .setTargetAtTime(
          Math.min(1, Math.max(0, energy || 0)),
          ctx.currentTime,
          0.2,
        );
      activity = Math.min(1, activity + Math.max(0, energy || 0) * 0.15);
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
      dialogue.forget(key);
      resonances.delete(key);
    },
    recall(brush, position, key = brush) {
      return note(brush, motifs.get(key)?.position || position, 0.7, true, key);
    },
    traceResonance(key) {
      if (!active) return 0;
      const resonance = resonances.get(key);
      if (!resonance) return 0;
      const age = ctx.currentTime - resonance.start;
      if (age < 0 || age > resonance.duration) return 0;
      return (
        resonance.strength *
        Math.min(1, age / 0.08) *
        Math.exp(-age / (resonance.duration * 0.4))
      );
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
        retiringVoices: retiring.size,
        universe,
        bpm: profile.bpm,
        soundWorld: profile.name,
        synthesis: "procedural-water",
        dialogue: dialogue.state,
        padActive: active && autonomous,
        resonantTraces: resonances.size,
        leadNotes,
        sequenceStep,
        percussion: percussion.stats,
        total,
        motifs: motifs.size,
        timbres: { ...timbres },
      };
    },
    dispose() {
      disposed = true;
      pause();
      for (const voice of retiring) voice.release();
      percussion.dispose();
      reverb.dispose();
      pad.disconnect();
      padGain.disconnect();
      dialogue.clear();
      resonances.clear();
      waterBed.disconnect();
      bedGain.disconnect();
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
