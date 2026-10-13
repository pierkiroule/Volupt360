export const UNIVERSES = [
  {
    id: "souffle",
    name: "Le Souffle",
    description: "Lavis et voiles — souffles flûtés, harmonies aériennes.",
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
    name: "Les Marées",
    description:
      "Pigments et bulles — carillons cristallins, mélodies ondulantes.",
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
    name: "La Ramure",
    description: "Structures et signes — timbres boisés, pulsations dansantes.",
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
