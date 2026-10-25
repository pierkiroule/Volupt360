/** Expressive starting points, freely combinable; not an exhaustive classification.
 * Stable IDs preserve saved palettes and the existing artistic scores. */
export const NUANCES = [
  {
    id: "warm",
    emoji: "😊",
    label: "Joie",
    color: "#f7b43b",
    secondary: "#f27754",
  },
  {
    id: "water",
    emoji: "😢",
    label: "Tristesse",
    color: "#326db1",
    secondary: "#8279b7",
  },
  {
    id: "air",
    emoji: "😨",
    label: "Peur",
    color: "#728d93",
    secondary: "#a197b5",
  },
  {
    id: "soft",
    emoji: "🤢",
    label: "Dégoût",
    color: "#6b8855",
    secondary: "#a49b52",
  },
  {
    id: "night",
    emoji: "😠",
    label: "Colère",
    color: "#be3949",
    secondary: "#e77943",
  },
  {
    id: "spark",
    emoji: "🥰",
    label: "Tendresse",
    color: "#d78fa8",
    secondary: "#edbba2",
  },
  {
    id: "wonder",
    emoji: "🤩",
    label: "Émerveillement",
    color: "#49b9b0",
    secondary: "#c07bc8",
  },
  {
    id: "surprise",
    emoji: "😮",
    label: "Surprise",
    color: "#efad59",
    secondary: "#7fc9cd",
  },
  {
    id: "confused",
    emoji: "😕",
    label: "Confusion",
    color: "#9c7bc2",
    secondary: "#5fa5ac",
  },
  {
    id: "tired",
    emoji: "😴",
    label: "Fatigue",
    color: "#8c8caa",
    secondary: "#b5a4b9",
  },
  {
    id: "trust",
    emoji: "😌",
    label: "Sérénité",
    color: "#6bada2",
    secondary: "#b6c9a1",
  },
  {
    id: "longing",
    emoji: "🥹",
    label: "Nostalgie",
    color: "#b17b92",
    secondary: "#839bbb",
  },
] as const;
export const SIMPLE_KEY = "cosmo-simple.v1";
export function readPalette(): string[] {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(SIMPLE_KEY) || "null",
    );
    if (Array.isArray(saved)) {
      const valid = [
        ...new Set(
          saved.filter(
            (id): id is string =>
              typeof id === "string" && NUANCES.some((n) => n.id === id),
          ),
        ),
      ].slice(0, 3);
      if (valid.length) return valid;
    }
  } catch {
    /* A blocked store must not prevent opening the atelier. */
  }
  return ["water", "warm"];
}
