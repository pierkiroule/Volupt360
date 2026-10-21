import type { Biome, ObjectKind } from "./types";
export interface BiomeRules {
  treeChance: number;
  plantChance: number;
  rockChance: number;
  treeSlope: number;
  words: string[];
  ground: string;
  water: string;
}
export const BIOME_RULES: Record<Biome, BiomeRules> = {
  forest: {
    treeChance: 0.58,
    plantChance: 0.28,
    rockChance: 0.14,
    treeSlope: 0.5,
    words: ["tree", "rock", "stump", "log"],
    ground: "#80916e",
    water: "#789f9d",
  },
  mountain: {
    treeChance: 0.14,
    plantChance: 0.16,
    rockChance: 0.7,
    treeSlope: 0.42,
    words: ["rock", "boulder", "stone"],
    ground: "#93988c",
    water: "#8aa6b3",
  },
  desert: {
    treeChance: 0,
    plantChance: 0.12,
    rockChance: 0.88,
    treeSlope: 0.45,
    words: ["rock", "stone", "boulder"],
    ground: "#c7aa77",
    water: "#b4af8c",
  },
  coast: {
    treeChance: 0.08,
    plantChance: 0.3,
    rockChance: 0.62,
    treeSlope: 0.4,
    words: ["rock", "driftwood", "stone"],
    ground: "#b6ba91",
    water: "#6caaa8",
  },
  dream: {
    treeChance: 0.38,
    plantChance: 0.32,
    rockChance: 0.3,
    treeSlope: 0.6,
    words: ["rock", "tree", "stone"],
    ground: "#aaa2b7",
    water: "#a5b1c4",
  },
};
export function chooseKind(biome: Biome, value: number): ObjectKind {
  const r = BIOME_RULES[biome];
  return value < r.treeChance
    ? "tree"
    : value < r.treeChance + r.plantChance
      ? "plant"
      : "rock";
}
