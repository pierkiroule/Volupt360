export const UNIVERSES = [
  {
    id: "souffle",
    name: "Le Souffle",
    description: "Lavis, voiles et courants aériens.",
    brushes: ["voiles", "filaments", "aurore", "dilution"],
  },
  {
    id: "marees",
    name: "Les Marées",
    description: "Pigments, bulles et floraisons organiques.",
    brushes: ["corolles", "brumes", "bulles", "lagons"],
  },
  {
    id: "ramure",
    name: "La Ramure",
    description: "Structures, signes et résonances.",
    brushes: ["falaises", "calligraphie", "network", "echo"],
  },
].map((universe) => ({ ...universe, ambience: "ambiances/ambiance01.mp3" }));
