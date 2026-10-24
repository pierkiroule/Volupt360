import { composeWeather } from "./composition";

/** Authored spatial scores. Numbers describe composition, never a person's psychology. */
interface Recipe {
  name: string;
  mode: number;
  colors: [string, string, string];
  sky: [string, string];
  space: [number, number, number];
  mass: number;
  opacity: number;
  speed: number;
  void: number;
  drums: [number, number, number];
  instruments: [number, number, number, number];
  density: number;
  cutoff: number;
  transpose: number;
  progression: number[];
}
const recipe = (
  name: string,
  mode: number,
  colors: [string, string, string],
  sky: [string, string],
  space: [number, number, number],
  mass: number,
  opacity: number,
  speed: number,
  empty: number,
  drums: [number, number, number],
  instruments: [number, number, number, number],
  density: number,
  cutoff: number,
  transpose: number,
  progression: number[],
): Recipe => ({
  name,
  mode,
  colors,
  sky,
  space,
  mass,
  opacity,
  speed,
  void: empty,
  drums,
  instruments,
  density,
  cutoff,
  transpose,
  progression,
});
export const UNIVERSES: Record<string, Recipe> = {
  warm: recipe(
    "corolles-solaires",
    0,
    ["#e7a92f", "#ed633e", "#b83669"],
    ["#fff0c3", "#deaa65"],
    [1.25, 0.8, 0.8],
    0.85,
    0.8,
    1.1,
    0.25,
    [0.85, 0.1, 0.05],
    [1, 0.6, 0.25, 0.55],
    1.1,
    4200,
    0,
    [1, 2, 3, 4, 1, 5, 6, 4],
  ),
  water: recipe(
    "cathedrale-des-pluies",
    1,
    ["#176a9d", "#36b6c7", "#363076"],
    ["#102d4d", "#426e90"],
    [0.75, 1.75, 1.25],
    0.7,
    0.9,
    0.95,
    0.3,
    [0.1, 0.8, 0.1],
    [0.5, 1, 0.65, 0.65],
    1.15,
    2700,
    -5,
    [4, 2, 7, 3, 4, 5, 0, 7],
  ),
  air: recipe(
    "tresses-du-vent",
    2,
    ["#258778", "#b1d586", "#d4ad55"],
    ["#d6ead8", "#809d93"],
    [1.6, 0.65, 1.1],
    0.55,
    0.8,
    1.4,
    0.55,
    [0.2, 0.65, 0.15],
    [0.5, 0.85, 0.35, 0.45],
    1.3,
    3900,
    5,
    [2, 3, 5, 1, 2, 6, 3, 4],
  ),
  soft: recipe(
    "archipel-incertain",
    3,
    ["#a593bb", "#d7bdd7", "#778eae"],
    ["#d9d4dc", "#b1afc4"],
    [1.4, 0.9, 1.65],
    0.52,
    0.45,
    0.65,
    0.8,
    [0.05, 0.15, 0.8],
    [0.25, 0.25, 1, 0.9],
    0.65,
    1900,
    0,
    [0, 5, 7, 0, 5, 0, 7, 4],
  ),
  night: recipe(
    "spirale-des-encres",
    4,
    ["#3d266f", "#a33b87", "#4069ab"],
    ["#090c25", "#3e285b"],
    [0.9, 1.3, 1.3],
    0.9,
    0.95,
    1.3,
    0.32,
    [0.35, 0.6, 0.05],
    [0.6, 0.7, 0.7, 1],
    1.25,
    3000,
    -2,
    [0, 3, 7, 5, 0, 6, 3, 7],
  ),
  spark: recipe(
    "portes-du-jour",
    5,
    ["#e59c66", "#e8ce6e", "#c76483"],
    ["#fff0d5", "#e7be9d"],
    [1.1, 1.4, 1.1],
    0.55,
    0.72,
    1.05,
    0.6,
    [0.65, 0.2, 0.15],
    [1, 0.65, 0.4, 0.7],
    1,
    3800,
    0,
    [1, 5, 6, 4, 1, 2, 6, 7],
  ),
  wonder: recipe(
    "ponts-prismatiques",
    6,
    ["#c8458f", "#25acbd", "#edc94f"],
    ["#242844", "#84719e"],
    [1.3, 1.2, 1],
    0.65,
    0.85,
    1.2,
    0.4,
    [0.55, 0.4, 0.05],
    [0.75, 1, 0.55, 0.7],
    1.2,
    4400,
    7,
    [1, 3, 2, 6, 5, 1, 3, 4],
  ),
  surprise: recipe(
    "strates-de-cristal",
    7,
    ["#c4e4ec", "#85b6cf", "#f6f0dc"],
    ["#46657b", "#bfdae2"],
    [1.35, 0.75, 1.35],
    0.55,
    0.6,
    0.75,
    0.68,
    [0.1, 0.25, 0.65],
    [0.6, 0.45, 0.7, 0.7],
    0.8,
    2400,
    0,
    [5, 0, 4, 7, 5, 2, 0, 7],
  ),
  confused: recipe(
    "foret-d-aurores",
    8,
    ["#29b7a1", "#ac5ec6", "#547cd7"],
    ["#081c38", "#304a67"],
    [1.2, 1.8, 1.1],
    0.75,
    0.8,
    1.15,
    0.45,
    [0.25, 0.5, 0.25],
    [0.35, 0.7, 1, 0.9],
    1,
    3400,
    7,
    [3, 1, 6, 2, 4, 3, 5, 7],
  ),
  tired: recipe(
    "chambres-lunaires",
    9,
    ["#688ed2", "#c0a8da", "#bbc9da"],
    ["#050a21", "#27395b"],
    [1.15, 1.1, 1.5],
    0.62,
    0.65,
    0.7,
    0.75,
    [0.1, 0.1, 0.8],
    [0.85, 0.25, 0.85, 0.75],
    0.7,
    2200,
    0,
    [0, 7, 5, 0, 7, 2, 5, 4],
  ),
  trust: recipe(
    "alveoles-du-ciel",
    10,
    ["#64a994", "#c0cfa5", "#d9b085"],
    ["#e1e6d6", "#9cb6b0"],
    [1.3, 0.8, 1.1],
    0.85,
    0.65,
    0.85,
    0.45,
    [0.4, 0.2, 0.4],
    [0.5, 0.5, 0.7, 1],
    0.9,
    2900,
    0,
    [1, 0, 5, 6, 1, 2, 4, 7],
  ),
  longing: recipe(
    "courants-croises",
    11,
    ["#477fb5", "#dc8a8e", "#e4ba65"],
    ["#687694", "#c5b8bc"],
    [1.1, 1, 1.4],
    0.7,
    0.8,
    1.15,
    0.4,
    [0.3, 0.6, 0.1],
    [0.8, 0.9, 0.4, 0.7],
    1.15,
    3400,
    -5,
    [4, 1, 5, 2, 6, 4, 3, 7],
  ),
};
const ENCOUNTERS: Record<string, Partial<Recipe>> = {
  "warm,water": {
    name: "pluie-d-or",
    mode: 12,
    sky: ["#273754", "#e7b471"],
    colors: ["#e6ac48", "#247fa8", "#c75b87"],
    space: [1.35, 1.2, 1.25],
    transpose: 0,
    drums: [0.6, 0.35, 0.05],
  },
  "air,night": {
    name: "vortex-traverse",
    mode: 13,
    sky: ["#0c1530", "#38566c"],
    space: [1, 1.5, 1.5],
    colors: ["#287f99", "#9854aa", "#82bfc0"],
    speed: 1.4,
    drums: [0.15, 0.8, 0.05],
  },
  "soft,tired": {
    name: "archipel-de-lune",
    mode: 14,
    sky: ["#10152c", "#7b7e9d"],
    space: [1.5, 1.2, 1.65],
    mass: 0.45,
    void: 0.85,
    colors: ["#9eacd0", "#c2a8d2", "#627b9c"],
    transpose: 0,
    drums: [0.05, 0.15, 0.8],
  },
  "air,surprise": {
    name: "spirales-blanches",
    mode: 15,
    sky: ["#376275", "#afcfda"],
    space: [1.6, 0.8, 1.25],
    mass: 0.5,
    colors: ["#d8e9df", "#7ac4c7", "#b1b6dc"],
    drums: [0.15, 0.5, 0.35],
  },
  "tired,warm": {
    name: "eclipse-ouverte",
    mode: 16,
    sky: ["#131b39", "#b78272"],
    colors: ["#e6ac51", "#7b7ac4", "#c86a91"],
    space: [1.25, 1.25, 1.25],
    void: 0.7,
    drums: [0.5, 0.1, 0.4],
  },
  "tired,water": {
    name: "rivieres-de-nuit",
    mode: 17,
    sky: ["#07162b", "#33577e"],
    space: [0.9, 1.6, 1.5],
    colors: ["#3988bc", "#8598d3", "#aab8d5"],
    drums: [0.05, 0.6, 0.35],
  },
  "night,wonder": {
    name: "prisme-dans-l-encre",
    mode: 18,
    sky: ["#0a0c22", "#55365e"],
    space: [1.2, 1.4, 1.3],
    colors: ["#d54b9d", "#32b9bc", "#daab45"],
    drums: [0.5, 0.45, 0.05],
  },
};
export function universeIdentity(ids: string[]) {
  const canonical = composeWeather(ids),
    sequence = [...new Set(ids)].filter((id) => UNIVERSES[id]).slice(0, 3);
  if (!sequence.length) sequence.push("warm");
  const primary = UNIVERSES[sequence[0]];
  const found = Object.entries(ENCOUNTERS).filter(([key]) =>
    key.split(",").every((id) => sequence.includes(id)),
  );
  // The first selected gesture anchors a world; its partners alter its composition.
  const chosen = found[0]?.[1] ?? {};
  let hash = 2166136261;
  for (const c of sequence.join(">"))
    hash = Math.imul(hash ^ c.charCodeAt(0), 16777619) >>> 0;
  const base = { ...primary, ...chosen };
  const colors: [string, string, string] =
    sequence.length === 1
      ? [...base.colors]
      : chosen.colors
        ? [...chosen.colors]
        : [
            UNIVERSES[sequence[0]].colors[0],
            UNIVERSES[sequence[1]].colors[0],
            UNIVERSES[sequence[2] ?? sequence[0]].colors[1],
          ];
  if (sequence.length === 3) colors[2] = UNIVERSES[sequence[2]].colors[0];
  const drumMean = [0, 1, 2].map(
    (i) =>
      sequence.reduce((sum, id) => sum + UNIVERSES[id].drums[i], 0) /
      sequence.length,
  );
  const instrumentMean = [0, 1, 2, 3].map(
    (i) =>
      sequence.reduce((sum, id) => sum + UNIVERSES[id].instruments[i], 0) /
      sequence.length,
  );
  const mean = (field: "density" | "cutoff" | "speed") =>
    sequence.reduce((sum, id) => sum + UNIVERSES[id][field], 0) /
    sequence.length;
  return {
    ...base,
    colors,
    sequence,
    modes: sequence.map((id) => UNIVERSES[id].mode),
    key: sequence.join(">"),
    canonical: canonical.entries.join(","),
    seed: hash,
    rotation: (hash % 6283) / 1000,
    hand: sequence[0] === canonical.entries[0] ? 1 : -1,
    drums: base.drums.map((v, i) => v * 0.65 + drumMean[i] * 0.35) as [
      number,
      number,
      number,
    ],
    instruments: base.instruments.map(
      (v, i) => v * 0.6 + instrumentMean[i] * 0.4,
    ) as [number, number, number, number],
    density: mean("density"),
    cutoff: mean("cutoff"),
    speed: chosen.speed ?? mean("speed"),
    mass:
      chosen.mass ??
      primary.mass * 0.65 +
        (sequence.reduce((sum, id) => sum + UNIVERSES[id].mass, 0) /
          sequence.length) *
          0.35,
    opacity:
      chosen.opacity ??
      primary.opacity * 0.65 +
        (sequence.reduce((sum, id) => sum + UNIVERSES[id].opacity, 0) /
          sequence.length) *
          0.35,
    void:
      chosen.void ??
      primary.void * 0.65 +
        (sequence.reduce((sum, id) => sum + UNIVERSES[id].void, 0) /
          sequence.length) *
          0.35,
    space: base.space.map(
      (n, i) =>
        (chosen.space
          ? n
          : n * 0.65 +
            (sequence.reduce((sum, id) => sum + UNIVERSES[id].space[i], 0) /
              sequence.length) *
              0.35) * (sequence.length === 3 ? 1.12 : 1),
    ) as [number, number, number],
  };
}
