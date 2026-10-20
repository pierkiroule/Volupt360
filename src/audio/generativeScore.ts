import { seededRandom } from "../transduction/engine.ts";
export type MusicalEvent = {
  kind: "pad" | "bass" | "melody" | "pulse";
  midi: number;
  duration: number;
  gain: number;
  pan: number;
  offset?: number;
  timbre?: "felt" | "string";
};
/** Slow four-bar harmony and transformed two-bar phrases, one reproducible musical clock. */
export class GenerativeScore {
  private random: () => number;
  private step = 0;
  private lastMelody = 66;
  private harmony = [50, 57, 61, 66, 69];
  private motif = [0, 2, 1, 4, 2, 1, 3, 0];
  readonly beat: number;
  constructor(seed: number) {
    this.random = seededRandom(seed);
    this.beat = 60 / (66 + this.random() * 10);
  }
  response(position: number, pan: number): MusicalEvent {
    const index = Math.min(
      this.harmony.length - 1,
      Math.floor(Math.max(0, Math.min(1, position)) * this.harmony.length),
    );
    let midi = this.harmony[index] + 12;
    if (midi > 76) midi -= 12;
    return {
      kind: "melody",
      midi,
      duration: this.beat * 2,
      gain: 0.08,
      pan,
      timbre: "string",
    };
  }
  next(energy: number): MusicalEvent[] {
    const step = this.step++,
      bar = Math.floor(step / 4),
      beat = step % 4,
      section = Math.floor(bar / 8),
      chordIndex = [0, 2, 1, 3, 0, 1, 2, 3][Math.floor(bar / 2) % 8];
    // Dmaj9, Bm9, Gmaj9, Asus2: shared tones keep the changing landscape coherent.
    const chords = [
        [50, 57, 61, 66, 69],
        [47, 54, 57, 61, 66],
        [43, 50, 54, 57, 62],
        [45, 52, 57, 59, 64],
      ],
      chord = chords[chordIndex],
      notes: MusicalEvent[] = [];
    this.harmony = chord;
    if (beat === 0) {
      if (bar % 2 === 0)
        notes.push(
          ...chord.slice(1).map((midi, i) => ({
            kind: "pad" as const,
            midi,
            duration: this.beat * 8.2,
            gain: 0.045,
            pan: (i - 1.5) * 0.26,
            offset: i * 0.035,
          })),
        );
      notes.push({
        kind: "bass",
        midi: chord[0] - 12,
        duration: this.beat * 3.7,
        gain: 0.12,
        pan: 0,
      });
    }
    if (
      step % 2 === 0 &&
      bar % 8 !== 7 &&
      this.random() > 0.2 - energy * 0.12
    ) {
      const index =
        (this.motif[Math.floor(step / 2) % 8] + section) % chord.length;
      let midi = chord[index] + 12;
      if (midi > 76) midi -= 12;
      while (midi - this.lastMelody > 7) midi -= 12;
      while (this.lastMelody - midi > 7) midi += 12;
      midi = Math.max(50, Math.min(76, midi));
      this.lastMelody = midi;
      notes.push({
        kind: "melody",
        midi,
        duration: this.beat * (2.2 + this.random()),
        gain: 0.085 + this.random() * 0.025,
        pan: (this.random() - 0.5) * 0.65,
        offset: 0.015 + this.random() * 0.027,
        timbre: section % 3 === 2 ? "string" : "felt",
      });
    }
    if (
      bar % 4 !== 3 &&
      (beat === 0 || (beat === 2 && this.random() < 0.25 + energy * 0.3))
    )
      notes.push({
        kind: "pulse",
        midi: 38,
        duration: 0.4,
        gain: 0.035,
        pan: 0,
      });
    if (step % 32 === 31) {
      const index = 1 + Math.floor(this.random() * 6);
      this.motif[index] = Math.max(
        0,
        Math.min(4, this.motif[index] + (this.random() < 0.5 ? -1 : 1)),
      );
    }
    return notes;
  }
}
