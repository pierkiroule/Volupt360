/** Original, open-ended fragments: artistic associations, never interpretations. */
export const WEATHER_FRAGMENTS: Record<string, readonly string[]> = {
  warm: [
    "une lumière entre les plis",
    "le jour effleure les contours",
    "de l’or dans les intervalles",
    "une chaleur au bord du papier",
    "l’horizon garde une éclaircie",
    "le ciel laisse passer le jour",
  ],
  water: [
    "ce qui ruisselle cherche un passage",
    "la pluie écrit entre les lignes",
    "une goutte agrandit le paysage",
    "des chemins d’eau sur le papier",
    "le bleu se souvient de l’eau",
    "les contours deviennent rivières",
  ],
  air: [
    "le vent déplace les contours",
    "une courbe emporte la suivante",
    "le papier imagine un souffle",
    "des chemins sans ligne droite",
    "quelque chose passe entre les formes",
    "l’espace garde un mouvement",
  ],
  soft: [
    "des formes attendent un nom",
    "le lointain se dessine à peine",
    "un paysage entre deux contours",
    "la brume laisse des possibles",
    "ce qui apparaît reste ouvert",
    "le visible a des marges",
  ],
  night: [
    "quelque chose remue au loin",
    "l’encre rassemble ses courants",
    "des chemins au creux du sombre",
    "le ciel a plusieurs profondeurs",
    "un pli traverse les nuages",
    "l’horizon change de texture",
  ],
  spark: [
    "une trouée entre les nuages",
    "le jour revient par un détail",
    "un éclat au bord du lavis",
    "les ombres dessinent la lumière",
    "le ciel entrouvre une fenêtre",
    "une couleur trouve un passage",
  ],
  wonder: [
    "les couleurs se rencontrent sans se confondre",
    "un passage entre deux couleurs",
    "l’eau déplie ses nuances",
    "plusieurs lumières dans une goutte",
    "les teintes inventent un chemin",
    "un arc relie les différences",
  ],
  surprise: [
    "le silence a du grain",
    "le blanc garde des nuances",
    "une poussière de ciel en suspens",
    "des empreintes entre les flocons",
    "la lumière repose sur les bords",
    "le papier accueille la neige",
  ],
  confused: [
    "des couleurs au seuil de la nuit",
    "le ciel déplie ses rubans",
    "une lueur suit une autre lueur",
    "des voiles sans couture",
    "le lointain prend une nuance",
    "la nuit laisse courir ses encres",
  ],
  tired: [
    "une clarté veille entre les ombres",
    "le ciel garde un fil d’argent",
    "un reflet au creux du bleu",
    "la nuit dessine en réserve",
    "une lumière sans bruit",
    "le papier recueille la lune",
  ],
  trust: [
    "un nuage en contient un autre",
    "des formes se prêtent leurs contours",
    "l’espace entre les masses",
    "le ciel compose avec le vide",
    "un paysage à plusieurs lectures",
    "les nuages gardent leurs passages",
  ],
  longing: [
    "le jour et l’eau se croisent",
    "une éclaircie parmi les gouttes",
    "des reflets entre deux averses",
    "le ciel mêle ses écritures",
    "une lumière sur l’eau mouvante",
    "chaque goutte garde un horizon",
  ],
};
export const PAIR_FRAGMENTS: Record<string, readonly string[]> = {
  "warm,water": [
    "la lumière traverse ce qui ruisselle",
    "un peu d’or dans les chemins d’eau",
    "la pluie prête ses reflets au jour",
  ],
  "air,surprise": [
    "le blanc apprend à voyager",
    "le vent déplie les flocons",
    "la neige dessine des détours",
  ],
  "soft,tired": [
    "une lueur sans contour",
    "la brume garde un fil d’argent",
    "la lune se devine entre les voiles",
  ],
};
export function fragmentsFor(ids: string[]): string[] {
  const entries = [...new Set(ids)]
    .filter((id) => WEATHER_FRAGMENTS[id])
    .sort();
  if (!entries.length) entries.push("warm");
  const pairs = Object.entries(PAIR_FRAGMENTS)
    .filter(([key]) => key.split(",").every((id) => entries.includes(id)))
    .flatMap(([, texts]) => texts);
  const singles = Array.from({ length: 6 }, (_, i) =>
    entries.map((id) => WEATHER_FRAGMENTS[id][i]),
  ).flat();
  return [...new Set([...pairs, ...singles])];
}
