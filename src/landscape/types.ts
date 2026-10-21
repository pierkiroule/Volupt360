export type Biome = "forest" | "mountain" | "desert" | "coast" | "dream";
export type Atmosphere = "dawn" | "day" | "dusk" | "night";
export interface LandscapeSettings {
  version: 1;
  assetIds?: { model: string | null; environment: string | null };
  seed: number;
  biome: Biome;
  density: number;
  relief: number;
  atmosphere: Atmosphere;
}
export const BIOMES: Record<Biome, string> = {
  forest: "Forêt",
  mountain: "Montagne",
  desert: "Désert",
  coast: "Littoral",
  dream: "Monde onirique",
};
export const ATMOSPHERES: Record<Atmosphere, string> = {
  dawn: "Aube",
  day: "Jour",
  dusk: "Crépuscule",
  night: "Nuit",
};
export const DEFAULT_SETTINGS: LandscapeSettings = {
  version: 1,
  seed: 74291,
  biome: "forest",
  density: 0.55,
  relief: 0.5,
  atmosphere: "dawn",
};
export type ObjectKind = "tree" | "rock" | "plant";
export interface Placement {
  kind: ObjectKind;
  x: number;
  y: number;
  z: number;
  scale: number;
  yaw: number;
  slope: number;
  distance: number;
  cluster: number;
}
export function rng(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
export function validSettings(value: unknown): value is LandscapeSettings {
  if (!value || typeof value !== "object") return false;
  const v = value as LandscapeSettings;
  if (
    v.assetIds !== undefined &&
    (!v.assetIds ||
      typeof v.assetIds !== "object" ||
      ![v.assetIds.model, v.assetIds.environment].every(
        (id) =>
          id === null ||
          (typeof id === "string" && /^[a-z0-9_-]{1,120}$/i.test(id)),
      ))
  )
    return false;
  return (
    v.version === 1 &&
    Object.hasOwn(BIOMES, v.biome) &&
    Object.hasOwn(ATMOSPHERES, v.atmosphere) &&
    Number.isInteger(v.seed) &&
    v.seed >= 0 &&
    v.seed <= 0xffffffff &&
    Number.isFinite(v.density) &&
    v.density >= 0 &&
    v.density <= 1 &&
    Number.isFinite(v.relief) &&
    v.relief >= 0 &&
    v.relief <= 1
  );
}
