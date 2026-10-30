/** Artistic weather correspondences. These are not an analysis of a person. */
export interface Climate {
  cover: number;
  rain: number;
  snow: number;
  wind: number;
  haze: number;
  night: number;
  elevation: number;
}
export const CLIMATES: Record<string, Climate> = {
  warm: {
    cover: 0.36,
    rain: 0,
    snow: 0,
    wind: 0.2,
    haze: 0.12,
    night: 0,
    elevation: 0.65,
  },
  water: {
    cover: 0.8,
    rain: 0.9,
    snow: 0,
    wind: 0.3,
    haze: 0.4,
    night: 0,
    elevation: 0.24,
  },
  air: {
    cover: 0.72,
    rain: 0.18,
    snow: 0,
    wind: 0.9,
    haze: 0.3,
    night: 0.08,
    elevation: 0.18,
  },
  soft: {
    cover: 0.85,
    rain: 0.12,
    snow: 0,
    wind: 0.2,
    haze: 0.72,
    night: 0,
    elevation: 0.3,
  },
  night: {
    cover: 0.96,
    rain: 0.85,
    snow: 0,
    wind: 0.85,
    haze: 0.32,
    night: 0.14,
    elevation: 0.13,
  },
  spark: {
    cover: 0.45,
    rain: 0,
    snow: 0,
    wind: 0.15,
    haze: 0.24,
    night: 0,
    elevation: 0.18,
  },
  wonder: {
    cover: 0.4,
    rain: 0.08,
    snow: 0,
    wind: 0.35,
    haze: 0.14,
    night: 0.12,
    elevation: 0.12,
  },
  surprise: {
    cover: 0.55,
    rain: 0,
    snow: 0.9,
    wind: 0.35,
    haze: 0.2,
    night: 0,
    elevation: 0.3,
  },
  confused: {
    cover: 0.7,
    rain: 0.25,
    snow: 0,
    wind: 0.75,
    haze: 0.45,
    night: 0.05,
    elevation: 0.25,
  },
  tired: {
    cover: 0.68,
    rain: 0,
    snow: 0,
    wind: 0.12,
    haze: 0.65,
    night: 0.78,
    elevation: -0.12,
  },
  trust: {
    cover: 0.32,
    rain: 0,
    snow: 0,
    wind: 0.16,
    haze: 0.13,
    night: 0,
    elevation: 0.52,
  },
  longing: {
    cover: 0.56,
    rain: 0.3,
    snow: 0,
    wind: 0.23,
    haze: 0.3,
    night: 0.08,
    elevation: 0.08,
  },
};
export function weatherClimate(ids: string[]) {
  const sequence = [...new Set(ids)].filter((id) => CLIMATES[id]).slice(0, 3);
  if (!sequence.length) sequence.push("warm");
  const mean = (key: keyof Climate) =>
    sequence.reduce((s, id) => s + CLIMATES[id][key], 0) / sequence.length;
  const primary = CLIMATES[sequence[0]],
    mix = (key: keyof Climate) => primary[key] * 0.35 + mean(key) * 0.65;
  let seed = 2166136261;
  for (const c of sequence.join(">"))
    seed = Math.imul(seed ^ c.charCodeAt(0), 16777619) >>> 0;
  const rain =
    Math.max(...sequence.map((id) => CLIMATES[id].rain)) * 0.65 +
    mean("rain") * 0.35;
  const snow = Math.max(...sequence.map((id) => CLIMATES[id].snow)) * 0.75;
  return {
    cover: mix("cover"),
    rain,
    snow,
    wind: mix("wind"),
    haze: mix("haze"),
    night: mix("night"),
    elevation: mix("elevation"),
    warmth:
      sequence.includes("warm") ||
      sequence.includes("spark") ||
      sequence.includes("longing")
        ? 1
        : 0,
    rainbow: sequence.includes("warm") && rain > 0.2 ? Math.min(0.65, rain) : 0,
    seed,
    sequence,
  };
}
