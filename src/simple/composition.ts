import { NUANCES } from "./palette";
/** Artistic weather vocabulary; no inference about a person's emotional state. */
export const PHENOMENA: Record<
  string,
  {
    kind: number;
    motion: [number, number, number, number];
    veil: [number, number, number, number];
  }
> = {
  warm: { kind: 0, motion: [0.5, 0.7, 0.3, 0.1], veil: [0.5, 1.4, 0.5, -0.3] }, // sunlight
  water: { kind: 1, motion: [0.7, 0.45, 0.6, 0.1], veil: [0.6, 1.5, 0.5, 0] }, // rain
  air: {
    kind: 2,
    motion: [1.5, 0.4, 0.5, 0.4],
    veil: [1.4, 0.35, 0.55, -0.35],
  }, // wind
  soft: { kind: 3, motion: [0.25, 1, 0.2, 0.05], veil: [1.3, 1, 0.3, 0] }, // fog
  night: {
    kind: 4,
    motion: [0.7, 0.5, 0.8, 0.8],
    veil: [1.1, 0.8, 0.75, 0.12],
  }, // storm without flashes
  spark: { kind: 5, motion: [1, 0.35, 0.6, 0.4], veil: [0.45, 1.4, 0.7, 0.1] }, // embers
  wonder: {
    kind: 6,
    motion: [0.4, 0.6, 0.4, 0.1],
    veil: [1.3, 0.22, 0.4, 0.2],
  }, // iridescence
  surprise: {
    kind: 7,
    motion: [0.4, 0.5, 0.25, 0.1],
    veil: [0.8, 0.6, 0.28, -0.1],
  }, // snow
  confused: {
    kind: 8,
    motion: [0.5, 0.7, 0.8, 0.2],
    veil: [1.4, 0.65, 0.5, 0.2],
  }, // aurora
  tired: { kind: 9, motion: [0.2, 0.5, 0.2, 0.05], veil: [0.7, 0.35, 0.13, 0] }, // moonlight
  trust: {
    kind: 10,
    motion: [0.3, 0.85, 0.3, 0.1],
    veil: [1.1, 0.6, 0.4, 0.05],
  }, // clouds
  longing: {
    kind: 11,
    motion: [0.65, 0.5, 1, 0.15],
    veil: [1.4, 0.25, 0.65, -0.15],
  }, // waves
};
export function composeWeather(ids: string[]) {
  const entries = [...new Set(ids)]
    .filter((id) => PHENOMENA[id])
    .sort()
    .slice(0, 3);
  if (!entries.length) entries.push("warm");
  const palettes = entries.map((id) => NUANCES.find((n) => n.id === id)!);
  const has = (id: string) => (entries.includes(id) ? 1 : 0);
  return {
    entries,
    palettes,
    kinds: entries.map((id) => PHENOMENA[id].kind),
    weather: [has("warm"), has("water"), has("air"), has("soft")],
    climate: [has("night"), has("surprise"), has("tired"), has("spark")],
    magic: [has("wonder"), has("longing"), has("confused"), has("trust")],
    encounters: [
      has("warm") * has("water"),
      has("air") * has("surprise"),
      has("soft") * has("tired"),
    ],
    rainbow: has("warm") * has("water"),
    slant: has("water") * has("air"),
  };
}
