export interface Ingredient {
  emoji: string;
  name: string;
  color: string;
}
export const INGREDIENTS: Ingredient[] = [
  { emoji: "🌊", name: "Courant", color: "#508e9c" },
  { emoji: "🔥", name: "Braise", color: "#bd7655" },
  { emoji: "🌸", name: "Éclosion", color: "#bc8c9f" },
  { emoji: "🍃", name: "Souffle", color: "#8ba68b" },
  { emoji: "🌙", name: "Lune", color: "#8e91b3" },
  { emoji: "☀️", name: "Lumière", color: "#c6a664" },
  { emoji: "☁️", name: "Brume", color: "#9da9b8" },
  { emoji: "✨", name: "Étincelle", color: "#b6a26d" },
  { emoji: "🌧️", name: "Pluie", color: "#718dad" },
  { emoji: "🌀", name: "Spirale", color: "#9684ac" },
  { emoji: "❄️", name: "Cristal", color: "#8eb7ba" },
  { emoji: "🫧", name: "Source", color: "#8fb0a7" },
];
export type ResourceKind = "image" | "quote" | "story" | "invitation";
export interface Resource {
  id: string;
  kind: ResourceKind;
  title: string;
  text: string;
  tags: string[];
  author?: string;
  image?: string;
  alt?: string;
}
const image = (name: string) =>
  import.meta.env.BASE_URL + "textures/emojis/" + name;
export const RESOURCES: Resource[] = [
  {
    id: "bord-du-monde",
    kind: "story",
    title: "Le bord du monde",
    text: "Squibble croyait avoir trouvé le bord du monde. Ce n’était que le bord d’une goutte. À travers elle, une autre couleur attendait.",
    tags: ["🌊", "🫧", "☁️"],
  },
  {
    id: "aile-encre",
    kind: "story",
    title: "Une aile d’encre",
    text: "Une aile effleure l’eau. Le cercle s’agrandit, puis en rencontre un autre. Personne n’avait dessiné le passage entre les deux.",
    tags: ["🌊", "🍃", "🌀"],
  },
  {
    id: "petite-braise",
    kind: "story",
    title: "La petite braise",
    text: "Au creux d’une bulle, une braise gardait sa couleur. Le colibri s’en approcha. Ce qu’il emporta n’était pas le feu, mais une nuance.",
    tags: ["🔥", "☀️"],
  },
  {
    id: "jardin-intervalles",
    kind: "story",
    title: "Le jardin des intervalles",
    text: "Entre deux battements d’ailes, il y avait assez de place pour un jardin. Une fleur y poussait, sans se presser de devenir autre chose.",
    tags: ["🌸", "🍃", "☁️"],
  },
  {
    id: "lettre-lune",
    kind: "story",
    title: "Une lettre à la lune",
    text: "La lune avait laissé un reflet dans chaque goutte. Squibble les lut dans le désordre. Chacune semblait commencer une nouvelle lettre.",
    tags: ["🌙", "🌧️", "🫧"],
  },
  {
    id: "carte-inachevee",
    kind: "story",
    title: "La carte inachevée",
    text: "La carte dessinait des courants, mais aucune destination. Squibble découvrit qu’un détour pouvait aussi être une façon d’habiter le voyage.",
    tags: ["🌀", "🌊", "🍃"],
  },
  {
    id: "pluie-couleurs",
    kind: "story",
    title: "La pluie des couleurs",
    text: "Il plut quelques pigments sur la clairière. Là où les couleurs se touchaient, une troisième apparaissait. Le ciel n’avait rien prévu.",
    tags: ["🌧️", "🌸", "✨"],
  },
  {
    id: "cristal-ouvert",
    kind: "story",
    title: "Le cristal ouvert",
    text: "Dans le cristal, une lumière se partageait en chemins minuscules. Le colibri en suivit un. Il retrouva le même monde, autrement éclairé.",
    tags: ["❄️", "✨", "☀️"],
  },
  {
    id: "fenetre",
    kind: "invitation",
    title: "Une fenêtre",
    text: "Et si cette couleur devenait une fenêtre… qu’aimerais-tu apercevoir de l’autre côté ?",
    tags: ["☀️", "☁️", "✨"],
  },
  {
    id: "rive",
    kind: "invitation",
    title: "Une autre rive",
    text: "Dans ce paysage, quel petit endroit pourrait accueillir une halte ? Une ombre, un reflet, un espace entre deux couleurs…",
    tags: ["🌊", "🌙", "🍃"],
  },
  {
    id: "compagnie",
    kind: "invitation",
    title: "Une présence",
    text: "Si une présence bienveillante pouvait prendre une forme ici, serait-ce une lumière, un arbre, un son… ou tout autre chose ?",
    tags: ["🌸", "☀️", "🫧"],
  },
  {
    id: "petit-passage",
    kind: "invitation",
    title: "Un passage possible",
    text: "Quel détail pourrait devenir un passage ? Peut-être une ouverture minuscule, qui n’a pas encore de nom.",
    tags: ["🌀", "🔥", "❄️"],
  },
  {
    id: "nuance",
    kind: "invitation",
    title: "Une nuance à garder",
    text: "Parmi toutes ces nuances, y en a-t-il une que tu aimerais emporter dans la suite du voyage ?",
    tags: ["🌸", "🌧️", "✨"],
  },
  {
    id: "son-forme",
    kind: "invitation",
    title: "Le son d’une forme",
    text: "Si cette forme avait un son, serait-ce un murmure, une note tenue, le bruit de l’eau… ?",
    tags: ["🌊", "☁️", "🌧️"],
  },
  {
    id: "deux-regards",
    kind: "invitation",
    title: "Deux regards",
    text: "Une même bulle, vue de près puis de loin. Quelles nouvelles associations apparaissent entre ces deux regards ?",
    tags: ["🌙", "❄️", "🫧"],
  },
  {
    id: "graine",
    kind: "invitation",
    title: "Une graine de possible",
    text: "Si une petite idée pouvait germer dans ce jardin, de quelle place aurait-elle besoin ?",
    tags: ["🍃", "🌸", "🔥"],
  },
  {
    id: "montaigne",
    kind: "quote",
    title: "Le passage",
    text: "« Je ne peins pas l’être. Je peins le passage. »",
    author: "Michel de Montaigne · Essais, III, 2",
    tags: ["🌀", "🌊", "🌧️"],
  },
  {
    id: "blake",
    kind: "quote",
    title: "Un monde dans un grain",
    text: "« Voir un monde dans un grain de sable. »",
    author:
      "William Blake · Augures d’innocence · traduction libre du premier vers",
    tags: ["❄️", "✨", "☀️"],
  },
  {
    id: "dickinson",
    kind: "quote",
    title: "Maintenant",
    text: "« L’éternité se compose de maintenant. »",
    author:
      "Emily Dickinson · « Forever – is composed of Nows – » · traduction libre",
    tags: ["🌙", "🫧", "☁️"],
  },
  {
    id: "jardin-voltaire",
    kind: "quote",
    title: "Le jardin",
    text: "« Il faut cultiver notre jardin. »",
    author: "Voltaire · Candide, chapitre XXX",
    tags: ["🌸", "🍃", "☀️"],
  },
  {
    id: "matiere-feu",
    kind: "image",
    title: "La mémoire du feu",
    text: "Des plis, des braises, des îlots de couleur. Quel détail retiendrait le regard du colibri ?",
    image: image("feu/Feubase01.png"),
    alt: "Texture organique de braises et de pigments rouge orangé",
    tags: ["🔥", "☀️"],
  },
  {
    id: "matiere-feu-grain",
    kind: "image",
    title: "Sous la couleur",
    text: "Une matière peut contenir plusieurs paysages. Ici, rien n’oblige à reconnaître une seule forme.",
    image: image("feu/Feumatiere01.png"),
    alt: "Détail de matière associé à la brosse Feu",
    tags: ["🔥", "❄️", "✨"],
  },
  {
    id: "matiere-vague",
    kind: "image",
    title: "La peau de l’eau",
    text: "Le regard suit un courant, hésite sur un reflet, puis trouve une autre rive. L’image continue ailleurs.",
    image: image("vague/Vaguebase01.png"),
    alt: "Photographie texturée associée au courant et à l’eau",
    tags: ["🌊", "🌧️", "🫧"],
  },
  {
    id: "matiere-vague-grain",
    kind: "image",
    title: "Les plis du courant",
    text: "Des sillons se croisent dans cette matière. Certains semblent se rejoindre ; d’autres gardent leur propre chemin.",
    image: image("vague/Vaguematiere01.png"),
    alt: "Détail texturé de la matière Vague",
    tags: ["🌊", "🌀", "❄️"],
  },
  {
    id: "clairiere",
    kind: "story",
    title: "La clairière invisible",
    text: "On ne voyait pas la clairière depuis le chemin. Il fallut un léger mouvement d’aile pour découvrir la place qu’elle avait toujours gardée.",
    tags: ["🍃", "🌸", "☁️"],
  },
  {
    id: "reserve",
    kind: "story",
    title: "La réserve de papier",
    text: "Au milieu des pigments, une petite place était restée blanche. Squibble n’y ajouta rien. Une histoire pouvait aussi commencer là.",
    tags: ["☁️", "❄️", "🌙"],
  },
  {
    id: "accord",
    kind: "story",
    title: "L’accord minuscule",
    text: "Deux gouttes n’avaient pas la même couleur. En se frôlant, elles dessinèrent une bordure que ni l’une ni l’autre n’aurait inventée seule.",
    tags: ["🌸", "🌊", "🔥"],
  },
  {
    id: "horizon",
    kind: "invitation",
    title: "Un horizon proche",
    text: "Dans ce petit monde, qu’aimerais-tu regarder plus longtemps, sans avoir besoin de l’expliquer ?",
    tags: ["🌙", "☀️", "🫧"],
  },
  {
    id: "lumiere-papier",
    kind: "story",
    title: "La lumière du papier",
    text: "Le colibri chercha d’où venait cette lumière. Elle passait simplement à travers les couleurs, comme une page qui laisse respirer ses mots.",
    tags: ["☀️", "✨", "❄️"],
  },
  {
    id: "nouvelle-question",
    kind: "invitation",
    title: "Une question légère",
    text: "Et si ce que tu emportes aujourd’hui pouvait rester une question, plutôt qu’une réponse ?",
    tags: ["🌀", "☁️", "✨"],
  },
];
export function seedFor(choices: string[]) {
  let seed = 2166136261;
  for (const c of [...choices].sort().join(""))
    seed = Math.imul(seed ^ c.codePointAt(0)!, 16777619) >>> 0;
  return seed;
}
export function resourceWorld(choices: string[]) {
  if (!choices.length) return [];
  const seed = seedFor(choices);
  return RESOURCES.map((r, i) => ({
    r,
    score:
      r.tags.filter((tag) => choices.includes(tag)).length * 10 +
      ((Math.imul(seed ^ (i + 1), 1664525) >>> 0) % 1000) / 1000,
  }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 24)
    .map((v) => v.r);
}
export const kindLabel = {
  image: "Une image à explorer",
  quote: "Un écho de lecture",
  story: "Un fragment de récit",
  invitation: "Une invitation, si tu le souhaites",
};
