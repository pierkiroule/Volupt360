import { Chord, Note, Scale } from "@tonaljs/tonal";
export const PARAMETERS = {
  density: { label: "Densité", value: 0.42 },
  energy: { label: "Énergie", value: 0.32 },
  tension: { label: "Tension", value: 0.2 },
  brightness: { label: "Luminosité", value: 0.4 },
  fluidity: { label: "Fluidité", value: 0.75 },
  depth: { label: "Profondeur", value: 0.7 },
  complexity: { label: "Complexité", value: 0.42 },
  stability: { label: "Stabilité", value: 0.8 },
};
export const MUSIC_MODES = {
  piano: {
    label: "Piano minimaliste",
    bpm: 66,
    scale: "major",
    progression: [0, 5, 3, 4],
    piano: 1,
    pad: 0.18,
    strings: 0.25,
    bell: 0.12,
    texture: 0.1,
    drum: 0.13,
  },
  ambient: {
    label: "Ambient contemplatif",
    bpm: 54,
    scale: "major",
    progression: [0, 3, 5, 0],
    piano: 0.28,
    pad: 1,
    strings: 0.55,
    bell: 0.25,
    texture: 0.5,
    drum: 0.03,
  },
  organic: {
    label: "Organique génératif",
    bpm: 78,
    scale: "dorian",
    progression: [0, 3, 1, 4],
    piano: 0.65,
    pad: 0.4,
    strings: 0.3,
    bell: 0.35,
    texture: 0.6,
    drum: 0.75,
  },
  ethereal: {
    label: "Paysage éthéré",
    bpm: 58,
    scale: "major",
    progression: [0, 4, 3, 0],
    piano: 0.2,
    pad: 0.7,
    strings: 1,
    bell: 0.6,
    texture: 0.55,
    drum: 0.05,
  },
  experimental: {
    label: "Évolutif expérimental",
    bpm: 72,
    scale: "dorian",
    progression: [0, 2, 5, 3],
    piano: 0.5,
    pad: 0.5,
    strings: 0.5,
    bell: 0.4,
    texture: 0.85,
    drum: 0.4,
  },
};
export function normalizeParameters(input = {}) {
  return Object.fromEntries(
    Object.entries(PARAMETERS).map(([key, config]) => [
      key,
      Number.isFinite(Number(input[key]))
        ? Math.max(0, Math.min(1, Number(input[key])))
        : config.value,
    ]),
  );
}
export function seedNumber(seed) {
  let state = 2166136261;
  for (const c of String(seed))
    state = Math.imul(state ^ c.codePointAt(0), 16777619) >>> 0;
  return state || 1;
}
export function musicForChoices(choices) {
  const flow = choices.length
    ? choices.reduce((n, c) => n + c.flow, 0) / choices.length
    : 0.5;
  const seed =
    choices
      .map((c) => c.emoji)
      .sort()
      .join("") || "squibble";
  const mode =
    flow > 0.8
      ? "organic"
      : flow < 0.4
        ? "ethereal"
        : choices.some((c) => c.emoji === "🌙")
          ? "piano"
          : "ambient";
  return {
    seed,
    mode,
    parameters: normalizeParameters({
      energy: 0.18 + flow * 0.35,
      density: 0.22 + choices.length * 0.07,
      fluidity: 0.9 - flow * 0.25,
      brightness: 0.25 + flow * 0.25,
      depth: 0.8,
      complexity: 0.25 + choices.length * 0.09,
      stability: 0.85,
      tension: 0.12 + flow * 0.15,
    }),
  };
}
/** A deterministic score, independent of AudioContext and wall-clock time. */
export class GenerativeScore {
  constructor({ seed = "squibble", mode = "ambient", parameters = {} } = {}) {
    this.seed = String(seed);
    this.state = seedNumber(seed);
    this.mode = MUSIC_MODES[mode] ? mode : "ambient";
    this.parameters = normalizeParameters(parameters);
    this.step = 0;
    this.chordIndex = -1;
    this.motif = [0, 2, 1, 4];
    this.memory = [];
    this.lastMelody = 60;
    this.chord = [50, 57, 61];
    this.root = [48, 50, 53, 55][this.state % 4];
  }
  random() {
    return (
      (this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0) /
      4294967296
    );
  }
  configure(mode, parameters) {
    if (MUSIC_MODES[mode]) this.mode = mode;
    this.parameters = normalizeParameters(parameters);
  }
  get bpm() {
    return (
      MUSIC_MODES[this.mode].bpm *
      (0.88 + this.parameters.energy * 0.25) *
      (1 - this.parameters.fluidity * 0.07)
    );
  }
  next() {
    const step = this.step++,
      p = this.parameters,
      world = MUSIC_MODES[this.mode],
      events = [];
    const beat = 0.5,
      offset = () => 0.015 + (this.random() - 0.5) * 0.025 * p.fluidity;
    const emit = (instrument, notes, duration, velocity = 0.5) =>
      events.push({
        instrument,
        notes: notes.map((n) => Math.max(33, Math.min(81, Math.round(n)))),
        duration,
        velocity: Math.min(
          0.82,
          velocity * (0.65 + p.energy * 0.55) * (0.9 + this.random() * 0.2),
        ),
        offset: offset(),
      });
    const chordSpan = p.stability > 0.6 ? 32 : 16;
    const scale = Scale.get(
      Note.fromMidi(this.root) + " " + world.scale,
    ).notes.map((n) => Note.midi(n));
    if (step % chordSpan === 0) {
      this.chordIndex++;
      const degree =
        world.progression[this.chordIndex % world.progression.length];
      const root = scale[degree % scale.length] || this.root;
      const minor =
        world.scale === "dorian"
          ? [0, 1, 4].includes(degree)
          : [1, 2, 5].includes(degree);
      const dominant = world.scale === "dorian" ? degree === 3 : degree === 4;
      const quality = minor
        ? p.tension > 0.5
          ? "m9"
          : "m7"
        : dominant
          ? p.tension > 0.5
            ? "9"
            : "7"
          : p.tension > 0.55
            ? "maj9"
            : "maj7";
      const raw = Chord.getChord(quality, Note.fromMidi(root))
        .notes.map((n) => Note.midi(n))
        .filter(Number.isFinite);
      this.chord = raw.length ? raw : [root, root + 7, root + 12];
      // Common-register voice leading prevents abrupt jumps in harmony.
      this.chord = this.chord
        .map((n) => {
          while (n > 67) n -= 12;
          while (n < 45) n += 12;
          return n;
        })
        .sort((a, b) => a - b);
      if (this.random() < world.pad)
        emit(
          "pad",
          this.chord,
          Math.min(chordSpan * 0.35, 12 + p.fluidity * 8),
          0.32,
        );
      if (this.random() < world.strings)
        emit(
          "strings",
          [this.chord[1], this.chord.at(-1)],
          Math.min(chordSpan * 0.3, 9 + p.fluidity * 10),
          0.26,
        );
      const candidate = [...this.motif];
      const index = Math.floor(this.random() * candidate.length);
      candidate[index] = (candidate[index] + (this.random() < 0.5 ? 1 : 2)) % 5;
      if (p.complexity > 0.6 && candidate.length < 6)
        candidate.push((candidate.at(-1) + 2) % 5);
      const signature = candidate.join(",");
      if (this.memory.includes(signature))
        candidate[index] = (candidate[index] + 1) % 5;
      this.memory.push(candidate.join(","));
      if (this.memory.length > 12) this.memory.shift();
      this.motif = candidate;
    }
    const breathing = step % 128 >= 112;
    const melodicStep =
      this.mode === "piano"
        ? step % 4 === 0
        : this.mode === "organic"
          ? step % 3 === 0
          : step % 5 === 0;
    if (
      !breathing &&
      melodicStep &&
      this.random() < (0.22 + p.density * 0.75) * world.piano
    ) {
      const degree =
        this.motif[
          Math.floor(step / (this.mode === "piano" ? 4 : 3)) % this.motif.length
        ];
      let note =
        this.chord[degree % this.chord.length] + (degree >= 3 ? 12 : 0);
      while (note - this.lastMelody > 6 + (1 - p.stability) * 5) note -= 12;
      while (this.lastMelody - note > 6 + (1 - p.stability) * 5) note += 12;
      while (note < 48) note += 12;
      while (note > 76) note -= 12;
      this.lastMelody = note;
      emit("piano", [note], 1.1 + p.fluidity * 2.3, 0.45);
      if (p.complexity > 0.55 && this.random() < p.density * 0.45)
        emit(
          "piano",
          [this.chord[(degree + 1) % this.chord.length]],
          0.7,
          0.23,
        );
    }
    // Independent 5- and 7-step lanes, deliberately quiet and sparse.
    if (
      !breathing &&
      step % 7 === 0 &&
      this.random() < world.bell * p.density * (0.4 + p.brightness * 0.6)
    )
      emit(
        "bell",
        [this.chord[(step / 7) % this.chord.length] + 12],
        3 + p.depth * 3,
        0.25,
      );
    if (
      step % 13 === 0 &&
      this.random() < world.texture * (0.2 + p.density * 0.6)
    )
      emit("texture", [this.chord[0]], 5 + p.fluidity * 5, 0.2);
    if (
      !breathing &&
      step % 5 === 0 &&
      this.random() < world.drum * p.energy * (0.4 + p.density * 0.6)
    )
      emit("drum", [this.chord[0] - 12], 0.22 + p.fluidity * 0.15, 0.28);
    return { step, beat, events, chord: [...this.chord], bpm: this.bpm };
  }
}
