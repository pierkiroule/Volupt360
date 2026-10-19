/** Original three-line poems. Tags describe pictorial materials, never a person. */
export const HAIKU_GARDEN = [
  [
    "water",
    "Une eau sans rivage",
    "le pinceau laisse au passage",
    "un chemin de ciel",
  ],
  [
    "water",
    "Sous le trait humide",
    "deux couleurs se reconnaissent",
    "sans avoir de nom",
  ],
  [
    "water",
    "Au creux du papier",
    "la rivière prend son temps",
    "pour devenir rive",
  ],
  [
    "water",
    "Une vague passe",
    "son pli demeure dans l'encre",
    "le ciel est plus grand",
  ],
  [
    "stone",
    "Un grain dans le bleu",
    "tout un paysage repose",
    "sur ce presque rien",
  ],
  [
    "stone",
    "La pierre de papier",
    "garde un peu de la lumière",
    "entre ses fissures",
  ],
  ["stone", "Au bord de la tache", "un minuscule archipel", "attend sa marée"],
  [
    "stone",
    "Dans le gris des roches",
    "le pinceau trouve une source",
    "à peine esquissée",
  ],
  [
    "air",
    "Un fil dans le vent",
    "le blanc passe entre les lignes",
    "sans les déplacer",
  ],
  [
    "air",
    "Une plume hésite",
    "le papier lui fait une place",
    "au milieu du jour",
  ],
  [
    "air",
    "Le souffle du trait",
    "dessine une porte ouverte",
    "sur un autre bleu",
  ],
  [
    "air",
    "La brume se plisse",
    "un détail devient passage",
    "au bord du regard",
  ],
  [
    "warm",
    "Un ocre s'attarde",
    "au revers d'une aquarelle",
    "le jour a des plis",
  ],
  [
    "warm",
    "Sous la terre rose",
    "un soleil tient tout entier",
    "dans un grain d'encre",
  ],
  ["warm", "L'auréole sèche", "une lumière de cuivre", "habite son bord"],
  [
    "warm",
    "Une braise peinte",
    "ne réchauffe que les couleurs",
    "qui viennent la voir",
  ],
  [
    "space",
    "Entre deux couleurs",
    "le blanc invente une île",
    "sans rien ajouter",
  ],
  [
    "space",
    "Le ciel du papier",
    "a gardé pour une graine",
    "un morceau de blanc",
  ],
  [
    "space",
    "Un détour de l'encre",
    "et soudain dans l'intervalle",
    "un jardin commence",
  ],
  [
    "space",
    "La marge est un ciel",
    "où les chemins du pinceau",
    "peuvent se croiser",
  ],
  [
    "weave",
    "Les lignes se croisent",
    "sans connaître le dessin",
    "qu'elles font ensemble",
  ],
  [
    "weave",
    "Un chemin revient",
    "une autre couleur l'attend",
    "au même tournant",
  ],
  [
    "weave",
    "Dans ce nœud de traits",
    "chaque détour laisse ouverte",
    "une autre fenêtre",
  ],
  [
    "weave",
    "Le pinceau s'éloigne",
    "les traces continuent seules",
    "leur conversation",
  ],
].map(([family, ...lines], id) => ({ id: `garden-${id}`, family, lines }));

/** Stable local composition rules: same source, same poem and same host point. */
export function haikuForPainting(document) {
  const strokes = document.strokes || [];
  if (!strokes.length) return null;
  const scores = { water: 0, stone: 0, air: 0, warm: 0, space: 0, weave: 0 };
  const roles = {
    voiles: "water",
    lagons: "water",
    falaises: "stone",
    dilution: "stone",
    calligraphie: "air",
    filaments: "air",
    brumes: "air",
    echo: "warm",
    lucioles: "warm",
    hachures: "weave",
  };
  let hash = 2166136261,
    length = 0;
  for (const stroke of strokes) {
    scores[roles[stroke.brush] || "air"] += 1 + Math.min(1, stroke.size * 20);
    const rgb = [1, 3, 5].map(
      (i) => parseInt((stroke.color || "#808080").slice(i, i + 2), 16) / 255,
    );
    scores.warm += Math.max(0, rgb[0] - rgb[2]) * 2;
    for (let i = 0; i < stroke.points.length; i++) {
      const p = stroke.points[i];
      hash = Math.imul(hash ^ Math.round(p.u * 4096), 16777619);
      hash = Math.imul(hash ^ Math.round(p.v * 4096), 16777619);
      if (i)
        length += Math.hypot(
          p.u - stroke.points[i - 1].u,
          p.v - stroke.points[i - 1].v,
        );
    }
    hash = Math.imul(hash ^ Math.round(stroke.size * 1000), 16777619);
    for (const c of stroke.brush + stroke.color)
      hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  }
  scores.space += Math.max(0, 1.6 - length * 0.3);
  scores.weave += Math.min(
    5,
    length * 0.2 + Math.max(0, strokes.length - 3) * 0.4,
  );
  const family = Object.keys(scores).sort((a, b) => scores[b] - scores[a])[0];
  const candidates = HAIKU_GARDEN.filter((p) => p.family === family);
  const poem = candidates[(hash >>> 0) % candidates.length];
  // Seed lives on an actual painted path, rather than a prefabricated position.
  const layer = (hash >>> 0) % strokes.length;
  const stroke = strokes[layer];
  const index = Math.min(
    stroke.points.length - 1,
    Math.floor(stroke.points.length * 0.68),
  );
  return {
    poem,
    layer,
    point: { ...stroke.points[index] },
    size: stroke.size,
    seed: hash >>> 0,
  };
}
