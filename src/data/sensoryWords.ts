import type { SensoryWord, SensoryVector } from "../transduction/types.ts";
// Positive axes: weight, expansion, fluidity, agitation, clarity, continuity, depth, unpredictability.
const rows: [string, string, SensoryVector][] = [
  ["flottement", "Flottement", [-0.9, 0.25, 0.7, -0.45, -0.1, 0.65, 0.4, 0.15]],
  ["vertige", "Vertige", [-0.25, 0.35, 0.15, 0.25, -0.15, -0.1, 0.95, 0.55]],
  ["douceur", "Douceur", [-0.3, 0.1, 0.85, -0.75, -0.65, 0.8, 0.1, -0.5]],
  ["chaleur", "Chaleur", [-0.1, 0.5, 0.65, -0.1, -0.25, 0.6, -0.25, 0.1]],
  ["froid", "Froid", [0.15, -0.15, -0.65, -0.3, 0.75, -0.1, 0.45, -0.3]],
  ["tension", "Tension", [0.1, -0.5, -0.95, 0.2, 0.6, 0.7, 0.1, 0.2]],
  ["legerete", "Légèreté", [-1, 0.6, 0.55, -0.5, 0.3, 0.3, 0.55, 0.1]],
  ["lourdeur", "Lourdeur", [1, -0.65, -0.4, -0.8, -0.15, 0.85, -0.65, -0.65]],
  ["vide", "Vide", [-0.3, 0.65, 0.1, -0.85, 0.4, -0.9, 0.85, -0.2]],
  ["plein", "Plein", [0.7, -0.15, 0.2, -0.2, -0.25, 1, -0.65, -0.2]],
  ["frisson", "Frisson", [-0.05, 0.1, -0.2, 0.65, 0.55, -0.55, 0.2, 0.6]],
  ["elan", "Élan", [-0.6, 0.85, 0.6, 0.65, 0.4, 0.5, 0.4, 0.2]],
  ["repli", "Repli", [0.3, -0.95, -0.2, -0.6, -0.4, 0.8, -0.6, -0.3]],
  ["ouverture", "Ouverture", [-0.4, 1, 0.6, -0.3, 0.65, 0.5, 0.8, -0.1]],
  ["agitation", "Agitation", [-0.1, 0.5, -0.1, 1, -0.1, -0.6, 0.3, 0.9]],
  ["calme", "Calme", [0.15, 0.1, 0.6, -1, 0.25, 0.9, 0.2, -0.85]],
  ["vibration", "Vibration", [0, 0.05, -0.5, 0.7, 0.5, 0.2, 0.2, 0.25]],
  ["pression", "Pression", [0.85, -0.85, -0.6, 0.1, 0.15, 0.9, -0.85, -0.2]],
  ["expansion", "Expansion", [-0.45, 1, 0.6, 0.25, 0.25, 0.5, 0.75, 0.2]],
  ["contraction", "Contraction", [0.5, -1, -0.45, -0.25, 0.4, 0.6, -0.5, -0.2]],
  ["brouillard", "Brouillard", [-0.2, 0.25, 0.8, -0.55, -1, 0.5, 0.6, 0.3]],
  ["clarte", "Clarté", [-0.25, 0.4, 0.2, -0.5, 1, 0.6, 0.6, -0.5]],
  ["suspension", "Suspension", [-1, 0.1, 0.4, -0.9, 0.1, 0.75, 0.5, -0.4]],
  ["profondeur", "Profondeur", [0.15, 0.4, 0.5, -0.65, -0.3, 0.7, 1, -0.2]],
  ["eclatement", "Éclatement", [-0.2, 0.95, -0.3, 0.8, 0.5, -1, 0.6, 0.85]],
  ["fluidite", "Fluidité", [-0.15, 0.5, 1, 0.1, -0.2, 0.95, 0.45, 0.2]],
  [
    "fragilite",
    "Fragilité",
    [-0.55, 0.15, -0.15, -0.15, 0.55, -0.75, 0.35, 0.55],
  ],
  ["ancrage", "Ancrage", [0.85, -0.2, 0.05, -0.9, 0.4, 0.95, -0.75, -0.9]],
  ["debordement", "Débordement", [0.2, 0.95, 0.8, 0.75, -0.4, 0.8, -0.1, 0.7]],
  ["silence", "Silence", [-0.2, 0.3, 0.3, -1, -0.2, -0.55, 0.8, -0.7]],
];
export const SENSORY_WORDS: SensoryWord[] = rows.map(([id, label, vector]) => ({
  id,
  label,
  vector,
}));
export const normalizeWord = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
