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
  major: boolean;
  rhythm: number;
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
  major = false,
  rhythm = 0.65,
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
  major,
  rhythm,
});
export const UNIVERSES: Record<string, Recipe> = {
  warm: recipe(
    "joie-en-corolles",
    0,
    ["#f7b43b", "#f27754", "#e68cb5"],
    ["#fff0ca", "#e9ad70"],
    [1.3, 1.1, 1.15],
    0.8,
    0.82,
    1.12,
    0.38,
    [0.8, 0.15, 0.05],
    [1, 0.9, 0.25, 0.65],
    1.2,
    4100,
    0,
    [1, 2, 5, 6, 1, 3, 2, 5],
    true,
    0.82,
  ),
  water: recipe(
    "tristesse-en-rivieres",
    1,
    ["#326db1", "#8279b7", "#568fab"],
    ["#1b3153", "#7a94b2"],
    [1.05, 1.6, 1.3],
    0.66,
    0.78,
    0.67,
    0.5,
    [0.05, 0.35, 0.6],
    [1, 0.25, 0.8, 1],
    0.75,
    2300,
    -5,
    [0, 7, 5, 4, 0, 5, 7, 2],
    false,
    0.3,
  ),
  air: recipe(
    "peur-en-lisieres",
    2,
    ["#728d93", "#a197b5", "#b3c3b9"],
    ["#1c293a", "#748a8c"],
    [0.85, 1.5, 1.65],
    0.48,
    0.6,
    0.87,
    0.78,
    [0.05, 0.65, 0.3],
    [0.35, 0.65, 0.9, 0.65],
    0.82,
    2400,
    -2,
    [0, 4, 7, 0, 5, 4, 7, 0],
    false,
    0.36,
  ),
  soft: recipe(
    "degout-en-replis",
    3,
    ["#6b8855", "#a49b52", "#69566f"],
    ["#b6baa1", "#797d68"],
    [1.45, 0.8, 1.15],
    0.92,
    0.83,
    0.62,
    0.53,
    [0.1, 0.7, 0.2],
    [0.25, 1, 0.75, 0.5],
    0.7,
    1900,
    -5,
    [7, 0, 3, 7, 4, 0, 5, 7],
    false,
    0.4,
  ),
  night: recipe(
    "colere-en-remous",
    4,
    ["#be3949", "#e77943", "#7c375a"],
    ["#321c35", "#a95f58"],
    [1.2, 1.4, 1.3],
    0.94,
    0.93,
    1.35,
    0.3,
    [0.3, 0.68, 0.02],
    [0.55, 1, 0.45, 1],
    1.4,
    3300,
    -2,
    [0, 3, 4, 0, 7, 3, 6, 4],
    false,
    0.95,
  ),
  spark: recipe(
    "tendresse-en-entrelacs",
    5,
    ["#d78fa8", "#edbba2", "#b29ac6"],
    ["#f4e3de", "#d9b8c5"],
    [1.1, 1.05, 1.25],
    0.6,
    0.68,
    0.64,
    0.65,
    [0.1, 0.15, 0.75],
    [1, 0.3, 0.5, 1],
    0.72,
    2600,
    0,
    [1, 5, 1, 2, 6, 5, 1, 4],
    true,
    0.22,
  ),
  wonder: recipe(
    "emerveillement-en-prismes",
    6,
    ["#49b9b0", "#c07bc8", "#efc56b"],
    ["#182b4c", "#8d91bc"],
    [1.4, 1.5, 1.4],
    0.68,
    0.82,
    1.02,
    0.54,
    [0.45, 0.25, 0.3],
    [0.8, 1, 0.9, 0.65],
    1.12,
    4200,
    7,
    [5, 2, 6, 1, 3, 5, 2, 4],
    true,
    0.62,
  ),
  surprise: recipe(
    "surprise-en-eclosions",
    7,
    ["#efad59", "#7fc9cd", "#cc7aaa"],
    ["#263c59", "#d2b4b2"],
    [1.45, 1.1, 1.3],
    0.62,
    0.83,
    1.18,
    0.66,
    [0.2, 0.7, 0.1],
    [0.75, 1, 0.4, 0.65],
    1.25,
    3700,
    5,
    [2, 5, 3, 1, 6, 4, 2, 7],
    true,
    0.75,
  ),
  confused: recipe(
    "confusion-en-meandres",
    8,
    ["#9c7bc2", "#5fa5ac", "#c8a36b"],
    ["#29314b", "#9894ad"],
    [1.5, 1.25, 1.5],
    0.68,
    0.76,
    0.92,
    0.56,
    [0.15, 0.7, 0.15],
    [0.5, 0.85, 0.8, 0.6],
    1,
    3100,
    0,
    [3, 7, 2, 5, 0, 6, 4, 1],
    false,
    0.55,
  ),
  tired: recipe(
    "fatigue-en-strates",
    9,
    ["#8c8caa", "#b5a4b9", "#a4b7bf"],
    ["#272d45", "#9c9eaf"],
    [1.6, 0.6, 1.5],
    0.58,
    0.6,
    0.46,
    0.82,
    [0.02, 0.08, 0.9],
    [0.75, 0.15, 0.8, 0.95],
    0.5,
    1700,
    -5,
    [0, 0, 5, 7, 0, 5, 0, 7],
    false,
    0.12,
  ),
  trust: recipe(
    "serenite-en-ondes",
    10,
    ["#6bada2", "#b6c9a1", "#d7bd95"],
    ["#d4e4db", "#a0bdb4"],
    [1.4, 0.95, 1.4],
    0.65,
    0.67,
    0.57,
    0.7,
    [0.08, 0.12, 0.8],
    [0.85, 0.4, 0.65, 1],
    0.65,
    2500,
    0,
    [1, 5, 2, 1, 6, 5, 1, 2],
    true,
    0.2,
  ),
  longing: recipe(
    "nostalgie-en-boucles",
    11,
    ["#b17b92", "#839bbb", "#d6ab86"],
    ["#4e4b69", "#bca2a3"],
    [1.3, 1.05, 1.5],
    0.7,
    0.76,
    0.72,
    0.63,
    [0.1, 0.3, 0.6],
    [1, 0.55, 0.6, 1],
    0.8,
    2500,
    -5,
    [0, 5, 7, 4, 0, 5, 7, 4],
    false,
    0.33,
  ),
};
const ENCOUNTERS: Record<string, Partial<Recipe>> = {
  "warm,water": {
    name: "sourire-entre-les-larmes",
    mode: 12,
    space: [1.35, 1.2, 1.25],
    transpose: 0,
    drums: [0.6, 0.35, 0.05],
  },
  "air,night": {
    name: "forces-en-tension",
    mode: 13,
    space: [1, 1.5, 1.5],
    speed: 1.4,
    drums: [0.15, 0.8, 0.05],
  },
  "soft,tired": {
    name: "replis-en-suspens",
    mode: 14,
    space: [1.5, 1.2, 1.65],
    mass: 0.45,
    void: 0.85,
    transpose: 0,
    drums: [0.05, 0.15, 0.8],
  },
  "air,surprise": {
    name: "seuils-inattendus",
    mode: 15,
    space: [1.6, 0.8, 1.25],
    mass: 0.5,
    drums: [0.15, 0.5, 0.35],
  },
  "tired,warm": {
    name: "elan-dans-le-repos",
    mode: 16,
    space: [1.25, 1.25, 1.25],
    void: 0.7,
    drums: [0.5, 0.1, 0.4],
  },
  "tired,water": {
    name: "lenteur-des-rives",
    mode: 17,
    space: [0.9, 1.6, 1.5],
    drums: [0.05, 0.6, 0.35],
  },
  "night,wonder": {
    name: "intensites-croisees",
    mode: 18,
    space: [1.2, 1.4, 1.3],
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
  const blendHex = (field: "sky", channel: number) => {
    const rgb = [16, 8, 0].map((shift) => {
      const value = (id: string) =>
        (parseInt(UNIVERSES[id][field][channel].slice(1), 16) >> shift) & 255;
      return Math.round(
        value(sequence[0]) * 0.6 +
          (sequence.reduce((sum, id) => sum + value(id), 0) / sequence.length) *
            0.4,
      );
    });
    return "#" + rgb.map((n) => n.toString(16).padStart(2, "0")).join("");
  };
  return {
    ...base,
    sky: [blendHex("sky", 0), blendHex("sky", 1)] as [string, string],
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
    rhythm:
      sequence.reduce((sum, id) => sum + UNIVERSES[id].rhythm, 0) /
      sequence.length,
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
