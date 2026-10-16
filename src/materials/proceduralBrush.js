import { Color } from "three";
import { BRUSHES } from "../engine/brushes.js";
export const PALETTE_KEY = "echohypnos-procedural-palette-v1";
export const LIFE_STYLES = ["Suspendue", "Fluide", "Vibrante"];
export const EFFECTS = ["Lavis", "Granulation", "Nervures", "Marbrures"];
export function randomBrush() {
  const values = crypto.getRandomValues(new Uint32Array(3));
  return {
    name: "Matière libre",
    baseId: BRUSHES[values[0] % BRUSHES.length].id,
    color: [
      "#216f86",
      "#aa435d",
      "#286d58",
      "#bb7138",
      "#61578d",
      "#3b8290",
      "#9b4f39",
      "#486e47",
    ][values[1] % 8],
    life: "Fluide",
    effect: EFFECTS[values[2] % EFFECTS.length],
    width: 1,
    opacity: 0.8,
    seed: values[0],
  };
}
export function normalizeBrush(value) {
  if (
    !value ||
    !BRUSHES.some((brush) => brush.id === value.baseId) ||
    !/^#[0-9a-f]{6}$/i.test(value.color) ||
    !EFFECTS.includes(value.effect)
  )
    throw new Error("Brosse invalide.");
  return {
    name:
      String(value.name || "Matière libre")
        .trim()
        .slice(0, 32) || "Matière libre",
    life: LIFE_STYLES.includes(value.life) ? value.life : "Fluide",
    baseId: value.baseId,
    color: value.color,
    effect: value.effect,
    width: Math.min(2.5, Math.max(0.3, Number(value.width) || 1)),
    opacity: Math.min(1, Math.max(0.2, Number(value.opacity) || 0.8)),
    seed: Number(value.seed) >>> 0,
  };
}
export function createProceduralBrush(value) {
  const config = normalizeBrush(value),
    size = 64,
    field = new Uint8Array(size * size * 2);
  let state = config.seed || 37;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = x / size,
        v = y / size,
        grain = random();
      const wave =
        0.5 +
        0.5 * Math.sin(u * 16 + Math.sin(v * 11 + (config.seed % 17)) * 3);
      const pigment =
        config.effect === "Granulation"
          ? 0.25 + grain * 0.55 + wave * 0.2
          : config.effect === "Nervures"
            ? Math.pow(wave, 5)
            : config.effect === "Marbrures"
              ? wave * 0.8 + grain * 0.2
              : 0.52 + 0.18 * Math.sin(u * 5 + v * 8 + wave * 2) + grain * 0.1;
      const i = (y * size + x) * 2;
      field[i] = Math.round(pigment * 255);
      field[i + 1] = Math.round(
        (config.effect === "Nervures" ? wave ** 8 : grain * 0.4) * 255,
      );
    }
  const color = new Color(config.color).convertLinearToSRGB();
  const rgb = [color.r, color.g, color.b];
  return {
    ...config,
    config,
    visual: {
      width: size,
      height: size,
      field,
      palette: [
        rgb.map((c) => c * 0.62),
        rgb,
        rgb.map((c) => Math.min(1, c * 0.8 + 0.2)),
      ],
    },
    acoustic: {
      contrast: config.effect === "Granulation" ? 0.95 : 0.35,
      envelope: Array(32).fill(1),
    },
  };
}
export function loadPalette() {
  try {
    const saved = JSON.parse(localStorage.getItem(PALETTE_KEY));
    if (saved?.version !== 1 || !Array.isArray(saved.brushes)) return [];
    return saved.brushes.slice(0, BRUSHES.length).flatMap((value) => {
      try {
        return [normalizeBrush(value)];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}
export function savePalette(brushes) {
  localStorage.setItem(
    PALETTE_KEY,
    JSON.stringify({
      version: 1,
      brushes: brushes.slice(0, BRUSHES.length).map(normalizeBrush),
    }),
  );
}
