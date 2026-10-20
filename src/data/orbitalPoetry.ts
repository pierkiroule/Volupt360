/** Open artistic associations, never interpretations of the visitor's state. */
export const COMMON_POETRY = [
  "lisière",
  "passage",
  "nuance",
  "entre-deux",
  "un espace entre les plis",
  "plusieurs courants, un même espace",
  "une lumière cherche son contour",
  "le silence a des courants",
];
export const EMOTION_POETRY: Record<string, string[]> = {
  joie: [
    "élan",
    "foisonnement",
    "une couleur déborde du cadre",
    "le possible prend de l’espace",
  ],
  confiance: [
    "appui",
    "présence",
    "un fil rejoint une autre rive",
    "la trame garde un passage",
  ],
  peur: [
    "seuil",
    "frémissement",
    "la lisière garde ses nuances",
    "un abri parmi les formes",
  ],
  surprise: [
    "éclaircie",
    "inattendu",
    "une fenêtre dans le pigment",
    "le détail devient paysage",
  ],
  tristesse: [
    "profondeur",
    "écho",
    "une encre aux reflets multiples",
    "le bleu connaît plusieurs chemins",
  ],
  degout: [
    "distance",
    "contour",
    "un bord peut devenir passage",
    "le paysage a ses intervalles",
  ],
  colere: [
    "force",
    "mouvement",
    "un courant cherche sa forme",
    "la matière garde son élan",
  ],
  anticipation: [
    "horizon",
    "germe",
    "un chemin encore à peindre",
    "le possible entre les lignes",
  ],
};
export function poetryFor(ids: string[]) {
  const pool = [...COMMON_POETRY];
  for (const id of [...ids].sort()) pool.push(...(EMOTION_POETRY[id] ?? []));
  if (ids.length > 1)
    pool.push(
      "deux couleurs peuvent cohabiter",
      "des courants différents se rencontrent",
    );
  return [...new Set(pool)];
}
