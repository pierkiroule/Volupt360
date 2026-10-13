export const UNIVERSES = [
  {
    id: "souffle",
    name: "ÉTHER",
    soundName: "Le ciel suspendu",
    description: "Nappes lumineuses, cloches cristallines et accords ouverts.",
    brushes: [
      "voiles",
      "filaments",
      "aurore",
      "dilution",
      "plumes",
      "lucioles",
    ],
  },
  {
    id: "marees",
    name: "ABYSSE",
    soundName: "Le jardin englouti",
    description:
      "Bourdons chaleureux, cordes résonantes et mélodies descendantes.",
    brushes: [
      "corolles",
      "brumes",
      "bulles",
      "lagons",
      "feuilles",
      "filamentslibres",
    ],
  },
  {
    id: "ramure",
    name: "MÉMOIRE",
    soundName: "Les échos du rêve",
    description: "Cellules feutrées, cloches douces et contrechants d’échos.",
    brushes: [
      "falaises",
      "calligraphie",
      "network",
      "echo",
      "racines",
      "hachures",
    ],
  },
].map((universe) => ({ ...universe, ambience: "ambiances/ambiance01.mp3" }));
