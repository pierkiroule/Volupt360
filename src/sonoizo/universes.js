export const UNIVERSES = [
  {
    id: "souffle",
    name: "Le Souffle",
    soundName: "Source · gouttes cristallines",
    description:
      "Source : gouttes résonantes, ruissellements délicats et mélodies lumineuses.",
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
    soundName: "Rivière · courants rythmiques",
    description:
      "Rivière : impacts liquides, courants vivants et pulsations chaloupées.",
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
    soundName: "Abysses · bulles profondes",
    description:
      "Abysses : grosses bulles, vagues sourdes et résonances profondes.",
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
