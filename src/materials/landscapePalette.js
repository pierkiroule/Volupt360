import { BRUSHES } from "../engine/brushes.js";

const gestures = [
  ["voiles", "Lavis", "≈", "#728f9c", "wash", 0.8],
  ["falaises", "Brosse sèche", "▥", "#ac8066", "dry", 0.6],
  ["filaments", "Encre fine", "〰", "#343f46", "fiber", 0.65],
  ["brumes", "Taches", "∴", "#3a343b", "ink", 0.7],
  ["lagons", "Éclaboussures", "⋰", "#353239", "splatter", 0.7],
  ["calligraphie", "Calligraphie", "⌁", "#665477", "dry", 0.65],
  ["dilution", "Diffusion", "◍", "#52888d", "wash", 0.75],
  ["echo", "Tampons", "▧", "#ad6870", "stamp", 0.7],
];
export const LANDSCAPE_BRUSHES = gestures.map(
  ([id, name, glyph, color, textureKind, width], index) => ({
    ...BRUSHES.find((brush) => brush.id === id),
    id,
    name,
    glyph,
    color,
    textureKind,
    width,
    detail: `${name} · pigment abstrait, grain de papier et réserves`,
    baseId: id === "echo" ? "brumes" : id,
    style: id === "echo" ? 0 : undefined,
    life: "Fluide",
    seed: 731 + index * 953,
  }),
);
