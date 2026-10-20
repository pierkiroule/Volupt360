import { createPigmentPlate } from "./createPigmentPlate.js";

/** Bounded, seeded material vocabulary shared by paper and GPU atlas. */
export const WATERCOLOR_FAMILIES = [
  "wash",
  "dry",
  "bloom",
  "mineral",
  "fiber",
  "splatter",
];
export const TEXTURE_SLOTS = WATERCOLOR_FAMILIES.length * 2;
export const TEXTURE_SIZE = 256;
const preferences = {
  water: [0, 2, 3],
  warm: [2, 5, 0],
  stone: [3, 1, 5],
  thread: [4, 1, 2],
};
export function selectWatercolorTexture(id, phase = 0) {
  const choices = preferences[id] || [0, 1, 2, 3, 4, 5];
  const hash = Math.sin(phase * 127.1 + id.length * 311.7) * 43758.5453;
  const random = hash - Math.floor(hash);
  const family =
    choices[Math.min(choices.length - 1, Math.floor(random * choices.length))];
  return family * 2 + (Math.floor(random * 997) % 2);
}
export function createWatercolorTextureLibrary({ continuous = false } = {}) {
  const cache = new Map();
  return {
    get(slot, dry = false) {
      slot = Math.max(0, Math.min(TEXTURE_SLOTS - 1, Math.floor(slot)));
      const key = `${slot}:${dry}`;
      if (cache.has(key)) return cache.get(key);
      const canvas = createPigmentPlate(
        WATERCOLOR_FAMILIES[Math.floor(slot / 2)],
        7193 + slot * 953,
        TEXTURE_SIZE,
        continuous,
        dry,
      );
      cache.set(key, canvas);
      return canvas;
    },
    get count() {
      return cache.size;
    },
    dispose() {
      for (const canvas of cache.values()) canvas.width = canvas.height = 1;
      cache.clear();
    },
  };
}
/** Two atlases, twelve tiles each. No extra draw calls or per-frame generation. */
export function createWatercolorAtlas(dry = false) {
  const library = createWatercolorTextureLibrary({ continuous: true });
  const atlas = document.createElement("canvas");
  atlas.width = TEXTURE_SIZE;
  atlas.height = TEXTURE_SIZE * TEXTURE_SLOTS;
  const ctx = atlas.getContext("2d");
  for (let slot = 0; slot < TEXTURE_SLOTS; slot++)
    ctx.drawImage(library.get(slot, dry), 0, slot * TEXTURE_SIZE);
  library.dispose();
  return atlas;
}
