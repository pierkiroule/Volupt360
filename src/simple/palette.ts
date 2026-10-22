export const NUANCES = [
  {
    id: "warm",
    emoji: "☀️",
    label: "Soleil",
    color: "#d4a059",
    secondary: "#c77868",
  },
  {
    id: "water",
    emoji: "🌧️",
    label: "Pluie",
    color: "#5685ad",
    secondary: "#7294b4",
  },
  {
    id: "air",
    emoji: "🌬️",
    label: "Vent",
    color: "#8aa488",
    secondary: "#b9b283",
  },
  {
    id: "soft",
    emoji: "🌫️",
    label: "Brume",
    color: "#a49bb9",
    secondary: "#c4a5b2",
  },
  {
    id: "night",
    emoji: "⛈️",
    label: "Orage",
    color: "#576683",
    secondary: "#a285b0",
  },
  {
    id: "spark",
    emoji: "🔥",
    label: "Braises",
    color: "#ca9479",
    secondary: "#d5bd84",
  },
  {
    id: "wonder",
    emoji: "🌈",
    label: "Arc-en-ciel",
    color: "#d0b168",
    secondary: "#87b6ac",
  },
  {
    id: "surprise",
    emoji: "❄️",
    label: "Neige",
    color: "#c68d95",
    secondary: "#b1a1bf",
  },
  {
    id: "confused",
    emoji: "🌌",
    label: "Aurore",
    color: "#9185af",
    secondary: "#7fa7b0",
  },
  {
    id: "tired",
    emoji: "🌙",
    label: "Lune",
    color: "#777dae",
    secondary: "#b1acba",
  },
  {
    id: "trust",
    emoji: "☁️",
    label: "Nuages",
    color: "#7ca88e",
    secondary: "#d1b283",
  },
  {
    id: "longing",
    emoji: "🌊",
    label: "Vagues",
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
