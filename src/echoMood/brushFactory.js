import { BRUSHES } from "../engine/brushes.js";
const families = [
  ["voiles", "Souffle", "≈", "wash", 1.1],
  ["filaments", "Plume", "⌁", "fiber", 0.6],
  ["dilution", "Battement", "◍", "wash", 0.85],
  ["network", "Éclosion", "⋎", "dry", 0.6],
  ["lagons", "Envol", "⋰", "splatter", 0.7],
];
export function brushFactory(mood) {
  return families.map(([id, name, glyph, textureKind, width], i) => ({
    ...BRUSHES.find((b) => b.id === id),
    id,
    baseId: id,
    name,
    glyph,
    textureKind,
    color: mood.palette[i],
    width: width * (0.65 + mood.fluidity * 0.8),
    opacity: 0.45 + mood.density * 0.4,
    speed: mood.speed * (0.7 + i * 0.16),
    dispersion: mood.dispersion * (0.65 + i * 0.13),
    responseGain: mood.response * (0.8 + i * 0.09),
    particleCount: 2,
    sampleStride: 6,
    life: i === 0 ? "Suspendue" : i === 2 ? "Vibrante" : "Fluide",
    seed: (mood.seed + i * 953) >>> 0,
    detail: `${name} · matière vivante de votre ÉchoMood`,
  }));
}
