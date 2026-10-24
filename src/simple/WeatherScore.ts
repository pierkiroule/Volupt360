import { composeWeather } from "./composition";
// Artistic orchestration, never an inference about the visitor.
// piano, wooden mallet, bowed glass; spacing, brightness, harmonic pace.
export const MUSIC_WEATHER: Record<string, readonly number[]> = {
  warm: [0.85, 0.35, 0.35, 2.8, 3600, 26],
  water: [0.4, 1, 0.35, 1.65, 2500, 32],
  air: [0.35, 0.65, 0.75, 2.6, 3200, 38],
  soft: [0.2, 0.15, 1, 5.2, 1700, 55],
  night: [0.65, 0.3, 0.85, 3.8, 1900, 34],
  spark: [1, 0.45, 0.3, 2.8, 3400, 28],
  wonder: [0.65, 0.8, 0.65, 2.4, 3300, 30],
  surprise: [0.45, 0.65, 0.35, 4.5, 2300, 48],
  confused: [0.3, 0.4, 1, 3.8, 2800, 45],
  tired: [0.8, 0.25, 0.75, 5, 2000, 52],
  trust: [0.45, 0.3, 0.95, 4.2, 2400, 42],
  longing: [0.65, 0.85, 0.45, 2.3, 2800, 35],
};
export function musicProfile(ids: string[]) {
  const score = composeWeather(ids),
    rows = score.entries.map((id) => MUSIC_WEATHER[id]);
  const mean = (i: number) =>
    rows.reduce((sum, row) => sum + row[i], 0) / rows.length;
  return {
    key: score.entries.join(","),
    weights: [
      Math.min(1, mean(0) + score.encounters[0] * 0.1),
      mean(1),
      Math.min(1, mean(2) + score.encounters[2] * 0.15),
    ],
    gap: mean(3) * (1 - score.encounters[0] * 0.1),
    cutoff: mean(4),
    harmony: mean(5) * (1 + score.encounters[2] * 0.15),
    drift: score.weather[2],
    silver: score.encounters[2],
    gold: score.encounters[0],
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
  private next = [0, 1.2, 0];
  private chordAt = 0;
  private chord = 0;
  private motif = [0, 2, 1, 3, 2];
  private cursor = [0, 0, 0];
  private progression = [0, 3, 1, 4, 0, 1, 3, 4];
  private previous = [62, 65, 57];
  events = 0;
  constructor(ids: string[], seed = 9173) {
    this.randomState = seed >>> 0 || 1;
    this.setPalette(ids);
  }
  setPalette(ids: string[]) {
    this.profile = musicProfile(ids);
  }
  private random() {
    let s = this.randomState;
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    this.randomState = s >>> 0;
    return this.randomState / 4294967296;
  }
  advance(time: number): MusicNote[] {
    const result: MusicNote[] = [];
    if (time >= this.chordAt) {
      this.chord = (this.chord + 1) % this.progression.length;
      this.chordAt = time + this.profile.harmony * (0.85 + this.random() * 0.3);
      // Preserve a motif, change just one interval between harmonic chapters.
      this.motif[Math.floor(this.random() * 5)] = Math.floor(this.random() * 4);
    }
    const scale = [0, 3, 5, 7, 10],
      root = this.progression[this.chord];
    for (let lane = 0; lane < 3; lane++) {
      if (time < this.next[lane]) continue;
      const weight = this.profile.weights[lane],
        r = this.random();
      this.next[lane] =
        time +
        (lane === 2 ? 9 : this.profile.gap) *
          (lane === 0 ? 1.6 : 1) *
          (0.8 + this.random() * 0.6);
      if (r > weight * 0.92) continue;
      const degree =
        root + (lane === 2 ? 0 : this.motif[this.cursor[lane]++ % 5]);
      const chordTone =
        this.random() < 0.72 ? [0, 2, 4][degree % 3] : degree % 5;
      let note = 50 + scale[(root + chordTone) % 5] + (lane === 1 ? 12 : 0);
      // Voice leading avoids arbitrary leaps and keeps the upper register restrained.
      while (note - this.previous[lane] > 7) note -= 12;
      while (this.previous[lane] - note > 7) note += 12;
      note = Math.max(lane === 2 ? 45 : 50, Math.min(74, note));
      this.previous[lane] = note;
      const at = time + 0.025 + this.random() * 0.07;
      result.push({
        instrument: lane,
        note,
        duration: lane === 2 ? 7.5 : lane === 0 ? 3.8 : 2.4,
        velocity: lane === 2 ? 42 : 42 + Math.floor(this.random() * 16),
        pan:
          Math.sin(time * 0.08 + lane * 2) * (0.2 + this.profile.drift * 0.3),
        at,
      });
      if (lane === 2)
        result.push({
          instrument: lane,
          note: [50, 53, 55, 57, 60, 62, 65, 67, 69, 72, 74, 77, 79, 81].reduce(
            (a, b) => (Math.abs(b - note - 7) < Math.abs(a - note - 7) ? b : a),
          ),
          duration: 8,
          velocity: 32,
          pan: -0.25,
          at: at + 0.35,
        });
    }
    this.events += result.length;
    return result;
  }
}
