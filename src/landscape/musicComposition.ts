import { rng, type LandscapeSettings, type Biome } from "./types";
import type { Pattern } from "@strudel/web";
const PALETTES: Record<
  Biome,
  { bpm: number; chords: number[][]; pulse: string; room: number }
> = {
  forest: {
    bpm: 66,
    chords: [
      [50, 57, 64, 66],
      [43, 50, 57, 59],
      [47, 54, 57, 62],
      [45, 52, 59, 61],
    ],
    pulse: "brown ~ ~ ~ brown ~ ~ ~",
    room: 0.32,
  },
  mountain: {
    bpm: 56,
    chords: [
      [50, 57, 60, 65],
      [46, 53, 57, 62],
      [53, 60, 64, 69],
      [48, 55, 62, 64],
    ],
    pulse: "brown ~ ~ ~ ~ ~ ~ ~",
    room: 0.48,
  },
  desert: {
    bpm: 64,
    chords: [
      [45, 52, 59, 60],
      [41, 48, 55, 57],
      [50, 57, 60, 65],
      [52, 59, 62, 67],
    ],
    pulse: "brown ~ ~ brown ~ ~ brown ~",
    room: 0.25,
  },
  coast: {
    bpm: 70,
    chords: [
      [48, 55, 59, 62],
      [45, 52, 55, 60],
      [41, 48, 52, 55],
      [43, 50, 57, 60],
    ],
    pulse: "brown ~ brown ~ ~ ~ brown ~",
    room: 0.36,
  },
  dream: {
    bpm: 58,
    chords: [
      [51, 58, 62, 65],
      [44, 51, 55, 58],
      [48, 55, 58, 63],
      [46, 53, 60, 62],
    ],
    pulse: "brown ~ ~ ~ ~ brown ~ ~",
    room: 0.5,
  },
};
export function musicScore(settings: LandscapeSettings) {
  const p = PALETTES[settings.biome],
    r = rng(settings.seed ^ 61938),
    variants: string[] = [];
  for (let v = 0; v < 4; v++) {
    const notes: string[] = [];
    let previous = 1;
    for (const chord of p.chords) {
      for (let i = 0; i < 16; i++) {
        previous = Math.max(0, Math.min(3, previous + (r() < 0.55 ? -1 : 1)));
        let pitch = chord[previous] + 12;
        if (pitch > 76) pitch -= 12;
        notes.push(
          i > 0 && r() < 0.36 - settings.density * 0.17 ? "~" : String(pitch),
        );
      }
    }
    variants.push("[" + notes.join(" ") + "]");
  }
  const night = settings.atmosphere === "night",
    bright = settings.atmosphere === "day";
  return {
    bpm: p.bpm + (bright ? 2 : night ? -4 : 0),
    pad: "<" + p.chords.map((c) => "[" + c.join(",") + "]").join(" ") + ">",
    bass: "<" + p.chords.map((c) => c[0] - 12).join(" ") + ">",
    melody: "<" + variants.join(" ") + ">",
    pulse: p.pulse,
    room: p.room,
    cutoff: night ? 1600 : bright ? 3000 : 2400,
    seed: settings.seed,
    gentle: night ? 1.2 : 1,
  };
}
export function composeMusic(
  runtime: typeof import("@strudel/web"),
  settings: LandscapeSettings,
): Pattern {
  const score = musicScore(settings);
  const pad = runtime
    .note(score.pad)
    .s("triangle")
    .slow(8)
    .attack(1.8)
    .decay(0.7)
    .sustain(0.6)
    .release(2.2)
    .lpf(1300)
    .gain(0.12)
    .pan(0.38)
    .room(score.room)
    .roomsize(3)
    .roomlp(2400);
  const melody = runtime
    .note(score.melody)
    .s("sine")
    .slow(32)
    .attack(0.035)
    .decay(0.5)
    .sustain(0.23)
    .release(1.3)
    .lpf(score.cutoff)
    .gain(0.3)
    .pan(0.64)
    .delay(0.16)
    .delaytime(0.43)
    .delayfeedback(0.23)
    .room(score.room * 0.6)
    .degradeBy(0.12)
    .seed(settings.seed);
  const bass = runtime
    .note(score.bass)
    .s("sine")
    .slow(8)
    .attack(0.45)
    .release(1.6)
    .lpf(200)
    .gain(0.25)
    .pan(0.5);
  const pulse = runtime
    .s(score.pulse)
    .slow(2 * score.gentle)
    .attack(0.008)
    .decay(0.13)
    .sustain(0)
    .release(0.06)
    .lpf(700)
    .hpf(180)
    .gain(0.09)
    .pan(0.48)
    .degradeBy(0.23)
    .seed(settings.seed + 17);
  return runtime.stack(pad, melody, bass, pulse);
}
