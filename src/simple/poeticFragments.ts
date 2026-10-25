/** Original poetic associations, never an interpretation of the visitor. */
export const WEATHER_FRAGMENTS: Record<string, readonly string[]> = {
  warm: [
    "un éclat trouve son chemin",
    "les couleurs ouvrent leurs bras",
    "de l’or entre deux gestes",
    "un rythme fait lever les courbes",
    "le papier garde une lumière",
    "une ronde autour du possible",
    "le jour déborde des contours",
    "un élan traverse les pigments",
  ],
  water: [
    "le bleu prend le temps de couler",
    "une rive pour chaque nuance",
    "les couleurs parlent à voix basse",
    "un pli garde la mémoire de l’eau",
    "des profondeurs sans mesure",
    "une goutte agrandit le silence",
    "l’encre dessine des rivières",
    "un reflet demeure entre les lignes",
  ],
  air: [
    "au bord du visible, un passage",
    "les contours écoutent le lointain",
    "un fil entre deux espaces",
    "une forme approche puis hésite",
    "le papier garde ses lisières",
    "un abri entre les courbes",
    "le souffle dessine un seuil",
    "un intervalle reste ouvert",
  ],
  soft: [
    "les matières gardent leur distance",
    "une frontière se dessine",
    "l’encre invente un autre bord",
    "les plis ont leur géographie",
    "une courbe s’écarte de l’autre",
    "le papier réserve un espace",
    "deux matières sans mélange",
    "un contour peut dire la distance",
  ],
  night: [
    "une force cherche ses courbes",
    "l’encre a ses tourbillons",
    "des braises au creux du pigment",
    "le mouvement déborde la ligne",
    "un élan rencontre une rive",
    "les rouges plient l’espace",
    "le papier garde cette intensité",
    "des remous sans ligne droite",
  ],
  spark: [
    "deux courbes se tiennent compagnie",
    "une couleur frôle une autre",
    "des liens souples entre les formes",
    "le papier garde une chaleur",
    "les contours ont des gestes doux",
    "un pli accueille un autre pli",
    "une présence dans l’intervalle",
    "des fils sans nœud serré",
  ],
  wonder: [
    "un détail devient un monde",
    "les couleurs ont plusieurs horizons",
    "une ouverture dans le visible",
    "les reflets multiplient les chemins",
    "un prisme entre deux pensées",
    "le lointain se déplie encore",
    "un pli contient un paysage",
    "le regard trouve une autre échelle",
  ],
  surprise: [
    "un détour ouvre une fenêtre",
    "la forme invente sa suite",
    "quelque chose éclôt dans la marge",
    "le visible change de rythme",
    "une courbe surgit entre deux lignes",
    "un nouveau centre dans le dessin",
    "le papier réserve des détours",
    "un détail déplace l’horizon",
  ],
  confused: [
    "plusieurs chemins dans un même pli",
    "les lignes essaient des rencontres",
    "des nœuds encore sans nom",
    "le dessin garde ses questions",
    "un détour croise un détour",
    "les contours cherchent leurs places",
    "plusieurs rythmes sur le papier",
    "une forme reste à imaginer",
  ],
  tired: [
    "les courbes prennent leur temps",
    "un grand espace entre deux notes",
    "des strates au rythme du papier",
    "un mouvement presque immobile",
    "le pigment demeure un instant",
    "le silence a ses nuances",
    "une ligne repose dans un pli",
    "des couleurs à voix basse",
  ],
  trust: [
    "une onde en accompagne une autre",
    "l’espace garde des intervalles",
    "un rythme entre les courbes",
    "le papier laisse de la place",
    "des lignes sans hâte",
    "un cercle ouvert sur le lointain",
    "une présence entre deux notes",
    "les couleurs ont leur respiration",
  ],
  longing: [
    "un motif revient autrement",
    "le papier garde des échos",
    "une couleur se souvient d’une autre",
    "des boucles autour d’un reflet",
    "un fil relie deux horizons",
    "le familier devient paysage",
    "une note revient par un détour",
    "des traces dans les transparences",
  ],
};
export const PAIR_FRAGMENTS: Record<string, readonly string[]> = {
  "warm,water": [
    "un sourire entre les rivières",
    "deux lumières dans un même reflet",
    "la douceur et l’élan se répondent",
  ],
  "air,surprise": [
    "un seuil devient une ouverture",
    "l’inattendu dessine un passage",
    "une hésitation rencontre un élan",
  ],
  "soft,tired": [
    "des plis gardent leurs distances",
    "un espace entre les matières",
    "les contours prennent leur temps",
  ],
  "air,water": [
    "une rive au bord de l’incertain",
    "deux profondeurs dans le même bleu",
    "un fil à travers les reflets",
  ],
  "night,warm": [
    "deux intensités dans le même ciel",
    "l’or rencontre les braises",
    "un élan peut en croiser un autre",
  ],
  "tired,water": [
    "les rivières prennent leur temps",
    "une note demeure entre deux plis",
    "le bleu se pose dans le silence",
  ],
  "air,trust": [
    "un fil rencontre une onde",
    "les lisières gardent des passages",
    "deux rythmes partagent un espace",
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
  const singles = Array.from(
    { length: Math.max(...entries.map((id) => WEATHER_FRAGMENTS[id].length)) },
    (_, i) =>
      entries.map(
        (id) => WEATHER_FRAGMENTS[id][i % WEATHER_FRAGMENTS[id].length],
      ),
  ).flat();
  return [...new Set([...pairs, ...singles])];
}
