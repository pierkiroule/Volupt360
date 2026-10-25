/** Expressive starting points, freely combinable; not an exhaustive classification.
 * Stable IDs preserve saved palettes and the existing artistic scores. */
export const NUANCES = [
  {
    id: "warm",
    emoji: "😊",
    label: "Joie",
    color: "#d4a059",
    secondary: "#c77868",
  },
  {
    id: "water",
    emoji: "😢",
    label: "Tristesse",
    color: "#5685ad",
    secondary: "#7294b4",
  },
  {
    id: "air",
    emoji: "😨",
    label: "Peur",
    color: "#8aa488",
    secondary: "#b9b283",
  },
  {
    id: "soft",
    emoji: "🤢",
    label: "Dégoût",
    color: "#a49bb9",
    secondary: "#c4a5b2",
  },
  {
    id: "night",
    emoji: "😠",
    label: "Colère",
    color: "#576683",
    secondary: "#a285b0",
  },
  {
    id: "spark",
    emoji: "🥰",
    label: "Tendresse",
    color: "#ca9479",
    secondary: "#d5bd84",
  },
  {
    id: "wonder",
    emoji: "🤩",
    label: "Émerveillement",
    color: "#d0b168",
    secondary: "#87b6ac",
  },
  {
    id: "surprise",
    emoji: "😮",
    label: "Surprise",
    color: "#94b6cb",
    secondary: "#d9e4e9",
  },
  {
    id: "confused",
    emoji: "😕",
    label: "Confusion",
    color: "#9185af",
    secondary: "#7fa7b0",
  },
  {
    id: "tired",
    emoji: "😴",
    label: "Fatigue",
    color: "#777dae",
    secondary: "#b1acba",
  },
  {
    id: "trust",
    emoji: "😌",
    label: "Sérénité",
    color: "#7ca88e",
    secondary: "#d1b283",
  },
  {
    id: "longing",
    emoji: "🥹",
    label: "Nostalgie",
    color: "#b78e9c",
    secondary: "#d1b197",
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
