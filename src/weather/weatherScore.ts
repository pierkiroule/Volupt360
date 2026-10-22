import type { LandscapeSettings, Biome, Atmosphere } from "../landscape/types";
import type { Zone, WeatherId } from "./weatherModel";
// Artistic correspondences only. Area and opacity give each deposited zone a voice.
const voices: Record<WeatherId, [Biome, Atmosphere, number, number]> = {
  sun: ["coast", "day", .42, .3], cloud: ["forest", "dawn", .5, .35],
  rain: ["forest", "dusk", .62, .45], storm: ["mountain", "night", .72, .8],
  wind: ["coast", "dawn", .5, .5], fog: ["dream", "dawn", .22, .2],
  snow: ["mountain", "day", .25, .4], dusk: ["coast", "dusk", .35, .25],
  aurora: ["dream", "night", .46, .6], dream: ["dream", "dusk", .3, .35],
  prism: ["forest", "day", .55, .5],
  fire: ["desert", "dusk", .65, .55], stone: ["mountain", "dusk", .28, .65],
  spark: ["coast", "day", .6, .35], wave: ["coast", "dawn", .5, .45],
  space: ["dream", "night", .24, .4],
};
export function weatherScore(zones: Zone[]): LandscapeSettings {
  const biomes = new Map<Biome, number>(), atmospheres = new Map<Atmosphere, number>();
  let total = 0, density = 0, relief = 0, seed = 2166136261;
  for (const z of [...zones].sort((a, b) => a.seed - b.seed)) {
    const [biome, atmosphere, d, r] = voices[z.kind];
    const weight = z.size * z.size * z.opacity;
    biomes.set(biome, (biomes.get(biome) || 0) + weight);
    atmospheres.set(atmosphere, (atmospheres.get(atmosphere) || 0) + weight);
    total += weight; density += d * weight; relief += r * weight;
    for (const char of `${z.kind}:${z.seed}:${z.x.toFixed(2)}:${z.y.toFixed(2)}:${z.size}:${z.opacity}`)
      seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  }
  const dominant = <T extends string>(map: Map<T, number>, fallback: T): T =>
    [...map].sort((a, b) => b[1] - a[1])[0]?.[0] || fallback;
  return { version: 1, seed, biome: dominant(biomes, "dream"),
    atmosphere: dominant(atmospheres, "dawn"), density: total ? density / total : .3,
    relief: total ? relief / total : .3 };
}
