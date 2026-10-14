import { createWaterSource, prepareWaterAudio } from "./createWaterAudio.js";
import { createWaterPercussion } from "./createWaterPercussion.js";
import { createWaterReverb } from "./createWaterReverb.js";
import { createVisualSoundDialogue } from "./VisualSoundDialogue.js";
import { createAmbientComposer, AMBIENT_WORLDS } from "./AmbientComposer.js";
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
  const world = AMBIENT_WORLDS[universe] || AMBIENT_WORLDS.souffle;
  const composer = createAmbientComposer(universe, profile.seed);
  let echoControl = 0.5,
    hypnosControl = 0.3;
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
  const delay = ctx.createDelay(12),
    echoFilter = ctx.createBiquadFilter(),
    feedback = ctx.createGain(),
    wet = ctx.createGain();
  delay.delayTime.value =
    universe === "ramure" ? 3.7 : universe === "marees" ? 2.9 : 4.3;
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
  const extraEchoes =
    universe === "ramure"
      ? [6.11, 10.3].map((seconds) => {
          const tap = ctx.createDelay(12),
            tone = ctx.createBiquadFilter(),
            level = ctx.createGain();
          tap.delayTime.value = seconds;
          tone.frequency.value = 1800;
          level.gain.value = seconds > 8 ? 0.08 : 0.12;
          filter.connect(tap);
          tap.connect(tone);
          tone.connect(level);
          level.connect(gain);
          return { tap, tone, level };
        })
      : [];
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
  [0, 2, 4, 6].forEach((degree, i) =>
    pad.node.parameters
      .get(`tone${i + 1}`)
      .setValueAtTime(2 ** (profile.scale[degree] / 12), ctx.currentTime),
  );
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
    voiceType = null,
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
          Math.floor(
            ((scheduled ?? now) - transportOrigin) / world.chordPeriod,
          ),
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
      type: bass ? "bass" : voiceType || world.type,
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
    bedGain.gain.setTargetAtTime(autonomous ? 0.18 : 0, ctx.currentTime, 0.2);
    pad.node.parameters.get("gate").cancelScheduledValues(ctx.currentTime);
    pad.node.parameters
      .get("gate")
      .setValueAtTime(autonomous ? 1 : 0, ctx.currentTime);
    padGain.gain.setTargetAtTime(autonomous ? 0.7 : 0, ctx.currentTime, 0.6);
    if (!autonomous) return;
    transportOrigin = ctx.currentTime + 0.06;
    sequenceStep = 0;
    const schedule = () => {
      if (!active || ctx.state !== "running") return;
      const form = dialogue.state;
      const chordIndex =
        Math.floor(
          Math.max(0, ctx.currentTime - transportOrigin) / world.chordPeriod,
        ) % profile.progression.length;
      const rootDegree = profile.progression[chordIndex];
      const chordShape =
        universe === "souffle"
          ? [
              [0, 2, 4, 6],
              [0, 2, 4, 8],
              [0, 1, 4, 8],
            ][chordIndex % 3]
          : [0, 2, 4, 6];
      chordShape.forEach((offset, i) => {
        const degree = rootDegree + offset;
        const semitone =
          profile.scale[degree % profile.scale.length] +
          Math.floor(degree / profile.scale.length) * 12;
        pad.node.parameters
          .get(`tone${i + 1}`)
          .setTargetAtTime(
            2 ** (semitone / 12),
            ctx.currentTime,
            12 + hypnosControl * 18,
          );
      });
      extraEchoes.forEach(({ level }, i) =>
        level.gain.setTargetAtTime(
          echoControl * (i ? 0.16 : 0.24),
          ctx.currentTime,
          3,
        ),
      );
      pad.node.parameters
        .get("shape")
        .setTargetAtTime(
          form.brightness * (1 - hypnosControl * 0.4),
          ctx.currentTime,
          3,
        );
      filter.frequency.setTargetAtTime(
        profile.cutoff *
          (0.65 + form.brightness * 0.55) *
          (1 - hypnosControl * 0.35),
        ctx.currentTime,
        5,
      );
      feedback.gain.setTargetAtTime(
        0.12 + echoControl * 0.32,
        ctx.currentTime,
        2,
      );
      wet.gain.setTargetAtTime(
        profile.send * (0.3 + echoControl),
        ctx.currentTime,
        2,
      );
      const events = composer.next(ctx.currentTime - transportOrigin, {
        echo: echoControl,
        hypnos: hypnosControl,
        brightness: form.brightness,
      });
      for (const event of events) {
        const memories = [...motifs.values()];
        const motif = memories.length
          ? memories[sequenceStep % memories.length]
          : null;
        const angle = sequenceStep * 2.39996 + event.layer;
        const position = motif?.position || {
          x: Math.cos(angle) * world.space,
          y: event.layer * 3,
          z: Math.sin(angle) * world.space,
        };
        if (
          note(
            motif?.brush || seedBrush,
            position,
            event.velocity,
            true,
            motif?.key,
            transportOrigin + event.time,
            event.degree,
            false,
            event.duration,
          )
        )
          leadNotes++;
        if (event.layer === 0 && sequenceStep % 3 === 0)
          note(
            "falaises",
            { x: 0, y: -8, z: 12 },
            0.3,
            true,
            null,
            transportOrigin + event.time,
            0,
            true,
            7 + hypnosControl * 5,
          );
        sequenceStep++;
      }
    };
    schedule();
    timer = setInterval(schedule, 40);
  }
  return {
    graph,
    setAtmosphere({ echo = echoControl, hypnos = hypnosControl }) {
      echoControl = Math.max(0, Math.min(1, echo));
      hypnosControl = Math.max(0, Math.min(1, hypnos));
    },
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
        (0.25 + echoControl * 0.75) *
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
        soundWorld: world.name,
        composition: composer.stats,
        echo: echoControl,
        hypnos: hypnosControl,
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
      extraEchoes.forEach(({ tap, tone, level }) => {
        tap.disconnect();
        tone.disconnect();
        level.disconnect();
      });
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
