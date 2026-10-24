/** Original, open-ended fragments: artistic associations, never interpretations. */
export const WEATHER_FRAGMENTS: Record<string, readonly string[]> = {
  warm: [
    "une lumière entre les plis",
    "le jour effleure les contours",
    "de l’or dans les intervalles",
    "une chaleur au bord du papier",
    "l’horizon garde une éclaircie",
    "le jour trouve une place entre les choses",
    "une lumière qui ne demande rien",
    "dans l’intervalle, un peu de place",
  ],
  water: [
    "ce qui ruisselle cherche un passage",
    "la pluie écrit entre les lignes",
    "une goutte agrandit le paysage",
    "une rive commence dans un pli",
    "le bleu se souvient de l’eau",
    "les contours deviennent rivières",
    "une même goutte, plusieurs chemins",
    "ce qui déborde invente une rive",
  ],
  air: [
    "le vent déplace les contours",
    "une courbe emporte la suivante",
    "le papier imagine un souffle",
    "des chemins sans ligne droite",
    "quelque chose passe entre les formes",
    "l’espace garde un mouvement",
    "entre deux souffles, une direction",
    "le détour a sa propre géographie",
  ],
  soft: [
    "des formes attendent un nom",
    "le lointain se dessine à peine",
    "un paysage entre deux contours",
    "la brume laisse des possibles",
    "ce qui apparaît reste ouvert",
    "le visible a des marges",
    "l’espace n’a pas fini sa phrase",
    "une forme peut en devenir une autre",
  ],
  night: [
    "quelque chose remue au loin",
    "l’encre rassemble ses courants",
    "des chemins au creux du sombre",
    "le ciel a plusieurs profondeurs",
    "un pli traverse les nuages",
    "un relief se devine dans le contraste",
    "même l’encre garde des passages",
    "une force encore sans contour",
  ],
  spark: [
    "une trouée entre les nuages",
    "le jour revient par un détail",
    "un éclat au bord du lavis",
    "les ombres dessinent la lumière",
    "le ciel entrouvre une fenêtre",
    "une couleur trouve un passage",
    "par une fente, un autre paysage",
    "un détail déplace tout le lointain",
  ],
  wonder: [
    "les couleurs se rencontrent sans se confondre",
    "un passage entre deux couleurs",
    "l’eau déplie ses nuances",
    "plusieurs lumières dans une goutte",
    "les teintes inventent un chemin",
    "un arc relie les différences",
    "la rencontre garde deux couleurs",
    "ce qui relie laisse aussi de l’espace",
  ],
  surprise: [
    "le silence a du grain",
    "le blanc garde des nuances",
    "une poussière de ciel en suspens",
    "des empreintes entre les flocons",
    "la lumière repose sur les bords",
    "une empreinte dans ce qui paraît vide",
    "ce qui semble vide porte des traces",
    "sous le blanc, d’autres nuances",
  ],
  confused: [
    "des couleurs au seuil de la nuit",
    "le ciel déplie ses rubans",
    "une lueur suit une autre lueur",
    "ce qui hésite garde plusieurs formes",
    "le lointain prend une nuance",
    "la nuit laisse courir ses encres",
    "les possibles flottent côte à côte",
    "un ruban change sans se rompre",
  ],
  tired: [
    "une clarté veille entre les ombres",
    "le ciel garde un fil d’argent",
    "un reflet au creux du bleu",
    "dans l’ombre, des espaces encore ouverts",
    "une lumière sans bruit",
    "un reflet donne de la place au lointain",
    "la clarté n’a pas besoin de tout montrer",
    "un reflet suffit à déplacer le regard",
  ],
  trust: [
    "un nuage en contient un autre",
    "des formes se prêtent leurs contours",
    "ce qui sépare laisse aussi passer",
    "le ciel compose avec le vide",
    "un paysage à plusieurs lectures",
    "les nuages gardent leurs passages",
    "plusieurs formes, un même espace",
    "une place entre ce qui se touche",
  ],
  longing: [
    "le jour et l’eau se croisent",
    "une éclaircie parmi les gouttes",
    "des reflets entre deux averses",
    "le ciel mêle ses écritures",
    "une lumière sur l’eau mouvante",
    "chaque goutte garde un horizon",
    "deux écritures dans une même eau",
    "ce qui contraste peut aussi se répondre",
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
  "air,water": [
    "le vent donne une autre rive à la pluie",
    "une goutte peut prendre un détour",
    "des courants dans les courants",
  ],
  "night,warm": [
    "une lumière au creux de l’encre",
    "deux intensités dans le même ciel",
    "le contraste ouvre une profondeur",
  ],
  "tired,water": [
    "l’eau emporte un fil de lune",
    "le reflet a plusieurs rivages",
    "la nuit s’écrit aussi à l’eau",
  ],
  "air,trust": [
    "un nuage apprend une autre courbe",
    "les formes se déplacent, l’espace demeure",
    "un détour entre deux présences",
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
