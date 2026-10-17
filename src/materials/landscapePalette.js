import { BRUSHES } from "../engine/brushes.js";
export const LANDSCAPE_BRUSHES = [
  "voiles",
  "falaises",
  "corolles",
  "filaments",
  "dilution",
  "calligraphie",
  "plumes",
  "feuilles",
].map((id, index) => {
  const brush = BRUSHES.find((item) => item.id === id);
  return {
    ...brush,
    baseId: id,
    width: 1,
    life: "Fluide",
    seed: 731 + index * 953,
  };
});
