export type SensoryVector = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];
export interface SensoryWord {
  id: string;
  label: string;
  vector: SensoryVector;
  custom?: boolean;
}
export interface WordChoice extends SensoryWord {
  intensity: number;
}
export interface SensoryComposition {
  version: 1;
  seed: number;
  words: WordChoice[];
}
export interface SensoryParameters {
  axes: SensoryVector;
  palette: [number, number, number][];
  speed: number;
  stretch: number;
  spread: number;
  softness: number;
  depth: number;
  density: number;
  fragmentation: number;
  coupling: number;
}
export const AXES = [
  "Légèreté ← → Gravité",
  "Contraction ← → Expansion",
  "Rigidité ← → Fluidité",
  "Calme ← → Agitation",
  "Diffusion ← → Clarté",
  "Fragmentation ← → Continuité",
  "Proximité ← → Profondeur",
  "Régularité ← → Imprévisibilité",
] as const;
