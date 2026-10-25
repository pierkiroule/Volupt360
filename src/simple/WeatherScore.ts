import { universeIdentity } from "./UniverseIdentity";
import { composeWeather } from "./composition";
// Artistic orchestration, never an inference about the visitor.
// piano, wooden mallet, bowed glass; spacing, brightness, harmonic pace.
// Compatibility export: stable weather IDs now carry the expressive emotion scores.
export const MUSIC_WEATHER: Record<string, readonly number[]> = {
  warm: [1, 0.9, 0.25, 2.6, 4100, 23],
  water: [1, 0.25, 0.8, 3.4, 2300, 42],
  air: [0.35, 0.65, 0.9, 3.8, 2400, 38],
  soft: [0.25, 1, 0.75, 4.7, 1900, 47],
  night: [0.55, 1, 0.45, 2.7, 3300, 25],
  spark: [1, 0.3, 0.5, 4.1, 2600, 44],
  wonder: [0.8, 1, 0.9, 2.9, 4200, 31],
  surprise: [0.75, 1, 0.4, 2.8, 3700, 29],
  confused: [0.5, 0.85, 0.8, 3.1, 3100, 33],
  tired: [0.75, 0.15, 0.8, 5.8, 1700, 64],
  trust: [0.85, 0.4, 0.65, 4.9, 2500, 53],
  longing: [1, 0.55, 0.6, 3.9, 2500, 40],
};
const EMOTION_MOTIFS: Record<string, number[]> = {
  warm: [0, 1, 2, 3, 2, 1, 3, 2],
  water: [3, 2, 1, 0, 1, 0, -1, 0],
  air: [0, 1, 0, -1, 0, 0, 1, 0],
  soft: [0, -1, -2, 0, -1, 0, -2, -1],
  night: [0, 2, 3, 1, 3, 2, 0, 2],
  spark: [0, 1, 2, 1, 0, 1, 2, 0],
  wonder: [0, 1, 3, 2, 4, 3, 1, 2],
  surprise: [0, 0, 3, 2, 2, 1, 3, 0],
  confused: [0, 2, -1, 1, -2, 2, 0, 1],
  tired: [1, 1, 0, 0, -1, 0, 0, 0],
  trust: [0, 1, 1, 2, 2, 1, 1, 0],
  longing: [0, 1, 2, 1, 0, 1, 2, 1],
};
export function musicProfile(ids: string[]) {
  const identity = universeIdentity(ids);
  const score = composeWeather(ids),
    rows = score.entries.map((id) => MUSIC_WEATHER[id]);
  const mean = (i: number) =>
    rows.reduce((sum, row) => sum + row[i], 0) / rows.length;
  return {
    key: score.entries.join(","),
    weights: identity.instruments,
    major: identity.major,
    motif: EMOTION_MOTIFS[identity.sequence[0]],
    gap: mean(3) / identity.density,
    cutoff: identity.cutoff,
    harmony: mean(5) / Math.sqrt(identity.density),
    transpose: identity.transpose,
    progression: identity.progression,
    sequence: identity.key,
    drift: Math.min(1, identity.speed * 0.5),
    silver: ids.includes("trust") ? 1 : 0,
    gold: ids.includes("warm") && ids.includes("spark") ? 1 : 0,
  };
}
export interface MusicNote {
  instrument: number;
  note: number;
  duration: number;
  velocity: number;
  pan: number;
  at: number;
}
/** Bounded, seeded phrase memory shared by real-time playback and tests. */
export class WeatherScore {
  profile = musicProfile(["warm", "water"]);
  private randomState = 9173;
  private next = [0, 1.7, 2.4, 0];
  private chordAt = 0;
  private chord = -1;
  private motif = [0, 1, 2, 1, 3, 2, 0, -1];
  private cursor = 0;
  private previous = 62;
  private phrase = 0;
  private voicings = [
    [50, 57, 60, 65],
    [53, 60, 65, 69],
    [48, 55, 60, 67],
    [55, 62, 65, 69],
    [50, 57, 62, 65],
    [48, 55, 62, 67],
    [53, 60, 65, 69],
    [50, 57, 60, 65],
  ];
  private stringVoices = [50, 57, 65];
  events = 0;
  constructor(ids: string[], seed = 9173) {
    this.randomState = seed >>> 0 || 1;
    this.setPalette(ids);
    this.motif = [...this.profile.motif];
  }
  setPalette(ids: string[]) {
    const next = musicProfile(ids);
    if (next.sequence !== this.profile.sequence) {
      this.motif = [...next.motif];
      this.cursor = 0;
      this.previous = 62 + next.transpose;
    }
    this.profile = next;
  }
  private random() {
    let s = this.randomState;
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    this.randomState = s >>> 0;
    return this.randomState / 4294967296;
  }
  private tonal(note: number) {
    return note - (this.profile.major && ((note % 12) + 12) % 12 === 5 ? 1 : 0);
  }
  get harmonyNotes(): readonly number[] {
    const index =
      this.profile.progression[
        Math.max(0, this.chord) % this.profile.progression.length
      ];
    return this.voicings[index].map(
      (note) => this.tonal(note) + this.profile.transpose,
    );
  }
  advance(time: number): MusicNote[] {
    const result: MusicNote[] = [];
    if (time >= this.chordAt) {
      this.chord = (this.chord + 1) % this.voicings.length;
      this.chordAt = time + this.profile.harmony * (0.9 + this.random() * 0.2);
    }
    const chord = this.harmonyNotes;
    const scale = [50, 53, 55, 57, 60, 62, 65, 67, 69, 72, 74]
      .map((note) => this.tonal(note) + this.profile.transpose)
      .sort((a, b) => a - b);
    const add = (
      instrument: number,
      note: number,
      duration: number,
      velocity: number,
      delay = 0,
    ) => {
      result.push({
        instrument,
        note,
        duration,
        velocity,
        pan:
          Math.sin(time * 0.055 + instrument * 1.7) *
          (0.2 + this.profile.drift * 0.22),
        at: time + 0.05 + delay + this.random() * 0.045,
      });
    };
    for (let lane = 0; lane < 4; lane++) {
      if (time < this.next[lane]) continue;
      const gap =
        lane === 0
          ? this.profile.gap * 0.82
          : lane === 1
            ? this.profile.gap * 1.38
            : lane === 2
              ? 13
              : 12;
      this.next[lane] = time + gap * (0.92 + this.random() * 0.16);
      // Shared silence between phrases lets the ensemble's tails remain audible.
      const breath =
        (time % (this.profile.harmony * 2)) / (this.profile.harmony * 2);
      if (breath > 0.84 && breath < 0.96) continue;
      if (lane === 0) {
        const step = this.cursor % this.motif.length;
        const center = scale.indexOf(this.previous);
        let index = Math.max(
          0,
          Math.min(
            scale.length - 1,
            center +
              Math.max(
                -2,
                Math.min(
                  2,
                  this.motif[step] - this.motif[Math.max(0, step - 1)],
                ),
              ),
          ),
        );
        if (step === 0 || step === 7) {
          const target = chord[step === 0 ? 2 : 1];
          index = scale.reduce(
            (best, n, i) =>
              Math.abs(n - target) < Math.abs(scale[best] - target) ? i : best,
            0,
          );
        }
        if (this.random() < 0.7 + this.profile.weights[0] * 0.28) {
          this.previous = scale[index];
          add(
            0,
            this.previous,
            3.4 + this.random(),
            44 + Math.floor(this.random() * 12),
          );
        }
        this.cursor++;
        if (step === 7) {
          this.next[0] += 3.8 + this.random() * 3;
          this.phrase++;
          if (this.phrase % 2 === 0)
            this.motif[3] = this.random() < 0.5 ? 1 : 3;
        }
      } else if (lane === 1) {
        if (this.random() > this.profile.weights[1] * 0.8) continue;
        const note = chord[(this.cursor + 1) % 4];
        add(1, note, 2.7, 36 + Math.floor(this.random() * 12));
        if (this.profile.gold && this.random() < 0.35)
          add(1, chord[3], 2.4, 32, 0.7);
      } else if (lane === 2) {
        if (this.random() > this.profile.weights[2] * 0.8) continue;
        add(2, chord[1], 7.5, 36);
        add(2, chord[2], 7.5, 30, 0.45);
      } else {
        // Three restrained string voices follow the same harmony with gentle entrances.
        const targets = [chord[0], chord[1], chord[3]];
        targets.forEach((target, i) => {
          const alternatives = [target - 12, target, target + 12].filter(
            (n) => n >= 45 && n <= 74,
          );
          const note = alternatives.reduce(
            (best, n) =>
              Math.abs(n - this.stringVoices[i]) <
              Math.abs(best - this.stringVoices[i])
                ? n
                : best,
            alternatives[0],
          );
          this.stringVoices[i] = note;
          add(
            3,
            note,
            8.7,
            38 + Math.floor(this.profile.weights[3] * 10),
            i * 0.22,
          );
        });
      }
    }
    this.events += result.length;
    return result;
  }
}
