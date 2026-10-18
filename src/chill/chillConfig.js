import { LANDSCAPE_BRUSHES } from "../materials/landscapePalette.js";
export const CHILL_BRUSHES = LANDSCAPE_BRUSHES.map((b, i) => ({
  ...b,
  chillStyle: i,
  name: [
    "Lavis aérien",
    "Pigment sec",
    "Encre fine",
    "Éclats d’encre",
    "Encre diluée",
    "Empreintes",
  ][i],
  color: ["#7eaaa9", "#bd8d8f", "#33434c", "#45434e", "#608c94", "#a694b7"][i],
  width: [0.9, 0.45, 0.32, 0.55, 0.8, 0.6][i],
  opacity: [0.46, 0.52, 0.7, 0.6, 0.42, 0.46][i],
  speed: 0.65,
  dispersion: 0.7,
  responseGain: 1.15,
  particleCount: 2,
  sampleStride: 6,
}));
// Haïkus originaux en trois vers, sans attribution à un auteur existant.
const haikus = [
  ["Brume du matin", "un oiseau traverse le blanc", "sans froisser le jour"],
  ["Au bord du papier", "la pluie hésite un instant", "puis devient rivière"],
  ["Sous le ciel de mars", "une aile emporte le gris", "le bleu reste ouvert"],
  [
    "Un trait dans le vide",
    "la lumière entre les grains",
    "prend tout son espace",
  ],
  [
    "La branche sans feuilles",
    "tient une goutte de ciel",
    "jusqu’au premier vent",
  ],
  ["L’encre se dénoue", "sur la neige du papier", "un printemps commence"],
  ["Le vent dans les joncs", "ne garde de son passage", "qu’un pli de lumière"],
  [
    "Au creux de la pierre",
    "la pluie rassemble le ciel",
    "puis rend le silence",
  ],
  ["Une aile se plie", "sur le chemin du retour", "le soir devient mauve"],
  [
    "Dans le jardin blanc",
    "une ombre passe sans bruit",
    "la fleur reste claire",
  ],
  ["Le pinceau s’éloigne", "une flaque de lumière", "continue de vivre"],
  ["Un pétale tombe", "le vide autour de la fleur", "s’agrandit doucement"],
  [
    "Là où l’encre dort",
    "un fil d’eau cherche la pente",
    "sans connaître l’aval",
  ],
  ["La lune est si mince", "un nuage la traverse", "le ciel n’a pas froid"],
  ["Le bleu dans le gris", "comme un chant sous la fenêtre", "avant le réveil"],
  [
    "Sur la feuille humide",
    "deux couleurs se rencontrent",
    "sans tracer de bord",
  ],
  ["L’oiseau dans le soir", "n’emporte rien de la branche", "sinon son élan"],
  ["Une pluie légère", "dans la cour le vieux silence", "change de couleur"],
  ["Le jour se retire", "au fond d’une trace pâle", "une braise de rose"],
  [
    "Entre deux roseaux",
    "un morceau de ciel demeure",
    "l’eau passe en dessous",
  ],
  ["Au seuil du printemps", "une pousse fend la terre", "sans lever la voix"],
  ["Le papier respire", "sous la pointe du pinceau", "un blanc reste libre"],
  [
    "Après le passage",
    "les herbes gardent un souffle",
    "l’oiseau n’est plus là",
  ],
  ["Dernier trait d’encre", "la page accueille le soir", "rien ne se referme"],
];
export const CHILL_FRAGMENTS = haikus.map((lines, i) => ({
  id: `haiku-${i + 1}`,
  lines,
  text: lines.join("\n"),
}));
export const CHILL_UNIVERSE = {
  chill: true,
  seed: 811,
  background: "#f3eee3",
  color: "#b6d7dd",
  speed: 0.6,
  fluidity: 0.8,
  density: 0.4,
  response: 1,
};
