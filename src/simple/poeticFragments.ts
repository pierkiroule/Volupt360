/** Open original fragments; no image or personal interpretation is prescribed. */
export const WEATHER_FRAGMENTS: Record<string, readonly string[]> = {
  warm: [
    "entre les éclats",
    "un pli de lumière",
    "presque un élan",
    "de l’or en suspens",
    "au bord du jour",
    "une ronde ouverte",
    "plus loin, une couleur",
    "une chaleur sans nom",
  ],
  water: [
    "une autre rive",
    "dans les transparences",
    "un bleu plus loin",
    "entre deux reflets",
    "le creux d’un pli",
    "une profondeur encore",
    "l’eau entre les lignes",
    "une trace demeure",
  ],
  air: [
    "à la lisière",
    "un seuil entrouvert",
    "entre deux espaces",
    "presque une présence",
    "un fil dans le lointain",
    "derrière le contour",
    "un abri peut-être",
    "une marge ouverte",
  ],
  soft: [
    "entre les matières",
    "un autre bord",
    "des distances souples",
    "le revers d’un pli",
    "une limite mouvante",
    "tout près, autrement",
    "un espace réservé",
    "une forme à part",
  ],
  night: [
    "au creux du rouge",
    "une force en suspens",
    "l’envers du mouvement",
    "un remous d’encre",
    "entre deux élans",
    "des braises sans contour",
    "une rive pour l’intensité",
    "un passage dans le dense",
  ],
  spark: [
    "une présence voisine",
    "entre les fils",
    "une chaleur diffuse",
    "deux courbes proches",
    "au bord d’un lien",
    "une rencontre légère",
    "dans le même pli",
    "presque un geste",
  ],
  wonder: [
    "une autre échelle",
    "un monde dans le pli",
    "plus loin encore",
    "presque une ouverture",
    "dans le détail",
    "un horizon intérieur",
    "des reflets possibles",
    "au-delà du contour",
  ],
  surprise: [
    "un détour soudain",
    "quelque chose en marge",
    "presque une éclosion",
    "une autre fenêtre",
    "le début d’une forme",
    "un centre inattendu",
    "entre deux instants",
    "un détail autrement",
  ],
  confused: [
    "plusieurs passages",
    "entre les chemins",
    "un nœud ouvert",
    "encore sans nom",
    "des directions possibles",
    "une forme en question",
    "un détour dans le détour",
    "à travers les lignes",
  ],
  tired: [
    "un intervalle vaste",
    "presque immobile",
    "une strate de silence",
    "des couleurs basses",
    "un pli en suspens",
    "le temps du papier",
    "entre deux notes",
    "un mouvement à peine",
  ],
  trust: [
    "une onde voisine",
    "de la place autour",
    "un cercle entrouvert",
    "dans l’intervalle",
    "des lignes sans hâte",
    "une présence discrète",
    "un rythme en creux",
    "le calme des contours",
  ],
  longing: [
    "un écho familier",
    "autrement, la même rive",
    "un reflet revient",
    "entre les traces",
    "le pli d’un souvenir",
    "une boucle ouverte",
    "une couleur lointaine",
    "presque une mélodie",
  ],
};
export const PAIR_FRAGMENTS: Record<string, readonly string[]> = {
  "warm,water": [
    "entre l’or et le bleu",
    "un reflet à deux voix",
    "plusieurs lumières",
  ],
  "air,surprise": [
    "un seuil possible",
    "presque un passage",
    "un détour entrouvert",
  ],
  "soft,tired": [
    "des plis en suspens",
    "entre les distances",
    "une matière à part",
  ],
  "air,water": [
    "au bord de l’incertain",
    "un fil entre les rives",
    "deux profondeurs",
  ],
  "night,warm": [
    "des intensités voisines",
    "entre l’or et les braises",
    "un élan dans l’élan",
  ],
  "tired,water": ["une rive lente", "le bleu en suspens", "un pli de silence"],
  "air,trust": [
    "un fil dans l’onde",
    "une lisière ouverte",
    "deux rythmes proches",
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
