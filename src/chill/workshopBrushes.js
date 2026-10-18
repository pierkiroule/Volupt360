import { OIZO_BULLE_BRUSHES } from "./moodBrushes.js";

// Keep the palette identities, but deposit thin pigment surfaces rather than mist volumes.
export const WORKSHOP_BRUSHES = OIZO_BULLE_BRUSHES.map((brush) => ({
  ...brush,
  baseId: ["brumes", "lagons"].includes(brush.baseId) ? "voiles" : brush.baseId,
  name: brush.id === "dilution" ? "Lavis humide" : brush.name,
  textureKind: brush.id === "dilution" ? "wash" : brush.textureKind,
  materialMode: 2,
  planarWash: true,
  style: brush.id === "dilution" ? 20 : brush.id === "falaises" ? 3 : 0,
  width: brush.width * (brush.id === "dilution" ? 0.72 : 0.9),
  opacity: Math.min(0.9, brush.opacity * 1.15),
  dispersion: Math.min(0.35, brush.dispersion ?? 0.3),
  moodDiffusion: brush.id === "dilution" ? 0.65 : 0.35,
  moodGranulation: brush.id === "falaises" ? 1.8 : 1.35,
}));
