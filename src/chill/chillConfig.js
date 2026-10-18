import { LANDSCAPE_BRUSHES } from "../materials/landscapePalette.js";
export const CHILL_BRUSHES = LANDSCAPE_BRUSHES.map((b, i) => ({
  ...b,
  chillStyle: i,
  name: [
    "Brume",
    "Soie",
    "Fil de lumière",
    "Poussière d’or",
    "Marée",
    "Constellation",
  ][i],
  color: ["#b6d7dd", "#e8b8ae", "#d5d5f0", "#f0d9a1", "#8fc7cb", "#c9bfe8"][i],
  width: [0.9, 0.45, 0.32, 0.55, 0.8, 0.6][i],
  opacity: 0.55,
  speed: 0.65,
  dispersion: 0.7,
  responseGain: 1.15,
  particleCount: 2,
  sampleStride: 6,
}));
const sayings = [
  [
    "Patience et longueur de temps font plus que force ni que rage.",
    "Jean de La Fontaine, Le Lion et le Rat",
  ],
  [
    "Rien ne sert de courir ; il faut partir à point.",
    "Jean de La Fontaine, Le Lièvre et la Tortue",
  ],
  [
    "On a souvent besoin d’un plus petit que soi.",
    "Jean de La Fontaine, Le Lion et le Rat",
  ],
  ["Tout vient à point à qui sait attendre.", "Proverbe français"],
  ["Après la pluie, le beau temps.", "Proverbe français"],
  ["Petit à petit, l’oiseau fait son nid.", "Proverbe français"],
  ["La nuit porte conseil.", "Proverbe français"],
  ["À chaque jour suffit sa peine.", "Expression proverbiale"],
  ["Qui va doucement va sûrement.", "Proverbe"],
  ["Il n’est jamais trop tard pour bien faire.", "Proverbe français"],
  ["Le mieux est l’ennemi du bien.", "Proverbe"],
  [
    "Il faut tourner sept fois sa langue dans sa bouche avant de parler.",
    "Proverbe français",
  ],
  ["Il ne faut pas mettre la charrue avant les bœufs.", "Proverbe français"],
  ["À l’impossible nul n’est tenu.", "Proverbe français"],
  ["Chaque chose en son temps.", "Expression populaire"],
  ["Demain est un autre jour.", "Expression populaire"],
  ["Mieux vaut prévenir que guérir.", "Proverbe français"],
  ["Tous les chemins mènent à Rome.", "Proverbe"],
  ["Une hirondelle ne fait pas le printemps.", "Proverbe"],
  ["C’est en forgeant qu’on devient forgeron.", "Proverbe français"],
  ["Mieux vaut tard que jamais.", "Proverbe"],
  ["Qui veut voyager loin ménage sa monture.", "Expression proverbiale"],
  ["Plus fait douceur que violence.", "Jean de La Fontaine, Phébus et Borée"],
  ["La parole est d’argent, le silence est d’or.", "Proverbe"],
];
export const CHILL_FRAGMENTS = sayings.map(([text, source], i) => ({
  id: `chill-${i}`,
  text,
  source,
}));
export const CHILL_UNIVERSE = {
  chill: true,
  seed: 811,
  background: "#ddd3cc",
  color: "#b6d7dd",
  speed: 0.6,
  fluidity: 0.8,
  density: 0.4,
  response: 1,
};
