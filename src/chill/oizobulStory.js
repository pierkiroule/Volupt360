// An open constellation: every fragment can be encountered first or last.
// Repeated objects echo across texts without prescribing an order or a feeling.
const fragments = [
  [
    "La plume-fenêtre",
    "Oizobul trouva une plume portant une minuscule tache bleue. Lorsqu’il la tourna, la tache ressemblait à une fenêtre. De l’autre côté, quelque chose remuait doucement.",
    "aurore",
  ],
  [
    "La fenêtre entrouverte",
    "Dans le nuage, une fenêtre bleue était restée entrouverte. Oizobul entendit le froissement d’une aile, puis celui d’une page. Les deux bruits semblaient se répondre.",
    "voiles",
  ],
  [
    "La branche qui fredonne",
    "Une branche dépassait du ciel, sans arbre autour d’elle. Elle fredonnait chaque fois qu’Oizobul passait à côté. Une plume bleue, posée sur son écorce, en connaissait peut-être les paroles.",
    "filaments",
  ],
  [
    "Le nuage cousu",
    "Oizobul remarqua un nuage cousu de travers. Entre deux points de fil, un morceau de ciel restait visible. Il y aperçut une branche qui semblait écouter.",
    "calligraphie",
  ],
  [
    "La poche du vent",
    "Le vent avait une poche pleine de petits bouts de papier. Oizobul en attrapa un : on y avait dessiné une fenêtre sans maison. Le papier sentait la pluie sur l’écorce.",
    "dilution",
  ],
  [
    "Le grain de bleu",
    "Un grain de bleu roulait au creux d’un nuage. Oizobul le suivit du regard ; à chaque pli, il changeait de nuance. À un endroit, il avait exactement la couleur d’une plume.",
    "falaises",
  ],
  [
    "La goutte musicienne",
    "Une goutte attendait au bout d’une branche. Quand Oizobul battit des ailes, elle vibra comme une corde minuscule. Le nuage voisin parut reconnaître cette note.",
    "lagons",
  ],
  [
    "La carte sans nord",
    "Oizobul ouvrit une carte où les chemins étaient tracés à l’eau. Une fenêtre bleue y servait de repère. Chaque fois qu’il inclinait la feuille, un autre chemin devenait visible.",
    "echo",
  ],
  [
    "Le bouton de nacre",
    "Dans un pli du ciel, Oizobul trouva un bouton de nacre. Il était trop petit pour fermer un nuage, mais juste assez grand pour refléter une branche. Quelqu’un avait passé un fil bleu dans ses deux trous.",
    "voiles",
  ],
  [
    "L’ombre de la plume",
    "Une ombre en forme de plume avançait sur le papier du ciel. Oizobul chercha l’aile qui pouvait la porter. Au-dessus de lui, un nuage remuait ses coutures.",
    "aurore",
  ],
  [
    "La bibliothèque d’air",
    "Une bibliothèque d’air gardait des livres dont les pages étaient transparentes. Oizobul en ouvrit un : une branche y poussait en dessin. Entre deux nervures, une note semblait attendre son prochain souffle.",
    "filaments",
  ],
  [
    "Le petit écho",
    "Oizobul entendit un froissement derrière une fenêtre bleue. Il répondit d’un battement d’ailes. L’écho revint avec un bruit de pluie, comme s’il avait traversé un autre paysage.",
    "echo",
  ],
  [
    "Le banc du nuage",
    "Un petit banc était dessiné à l’encre sur un nuage. Oizobul y trouva une plume et une carte encore humide. Sur le dossier, quelqu’un avait esquissé une fenêtre ouverte.",
    "falaises",
  ],
  [
    "La couture dorée",
    "Un fil doré suivait le bord d’un lavis. Oizobul le vit se glisser entre deux nuances, puis ressortir près d’une branche. Il ne fermait rien : il dessinait un passage.",
    "calligraphie",
  ],
  [
    "Le jardin dans la goutte",
    "Dans une goutte suspendue, Oizobul aperçut un jardin minuscule. Une branche y portait des fenêtres plutôt que des feuilles. Lorsqu’il changea d’angle, le jardin devint une simple couleur.",
    "lagons",
  ],
  [
    "Le courrier des ailes",
    "Une enveloppe sans adresse flottait près d’Oizobul. Elle contenait le dessin d’un nuage cousu et un peu de poussière nacrée. Sur le rabat, une plume bleue avait laissé son empreinte.",
    "dilution",
  ],
  [
    "Le ciel à deux voix",
    "Deux nuages fredonnaient presque la même note. Oizobul passa dans l’espace entre eux. Un léger froissement s’ajouta au chant, comme une page qu’on aurait tournée.",
    "aurore",
  ],
  [
    "La réserve de blanc",
    "Au milieu des pigments, une petite étendue de papier était restée blanche. Oizobul y vit se refléter la fenêtre bleue. Rien n’y était dessiné, et pourtant le paysage y trouvait une place.",
    "voiles",
  ],
  [
    "L’encre voyageuse",
    "Une ligne d’encre avançait lentement sur une carte. Oizobul remarqua qu’elle suivait les traces d’une goutte. Près d’une branche dessinée, elle forma un signe qui ressemblait à une aile.",
    "filaments",
  ],
  [
    "La lumière de poche",
    "Oizobul découvrit une lumière pliée dans un morceau de papier. En l’ouvrant un peu, il éclaira la couture d’un nuage. Un bouton de nacre y brillait comme une petite lune.",
    "echo",
  ],
  [
    "Le nuancier du vent",
    "Le vent montra à Oizobul un nuancier fait de plumes. Aucun bleu n’y portait le même nom. L’un ressemblait à une fenêtre, un autre au son d’une goutte sur une branche.",
    "falaises",
  ],
  [
    "Le dessin qui écoute",
    "Une fenêtre dessinée sur le ciel paraissait écouter. Oizobul passa près d’elle, et son sillage en fit frémir le contour. Dans le reflet, une branche inventait une nouvelle courbe.",
    "calligraphie",
  ],
  [
    "Le passage nacré",
    "Un éclat de nacre marquait un passage entre deux nuages. Oizobul y reconnut les couleurs d’une carte humide. De chaque côté, les coutures dessinaient des chemins différents.",
    "lagons",
  ],
  [
    "La page ouverte",
    "Oizobul aperçut une page ouverte au milieu du ciel. Une plume, une branche et une fenêtre bleue y partageaient le même espace. Entre ces détails, il restait encore beaucoup de papier.",
    "dilution",
  ],
];
export const OIZOBUL_STORY = fragments.map(([title, text, brushId], i) => ({
  id: `resonance-${i + 1}`,
  title,
  text,
  brushId,
}));
