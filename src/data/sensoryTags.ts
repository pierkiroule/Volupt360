/** Symbols remain in the composer: the 3D world translates properties, never emoji sprites. */
export const SENSORY_TAGS = [
  { id: "flottement", emoji: "🫧" },
  { id: "vertige", emoji: "🌀" },
  { id: "douceur", emoji: "🪶" },
  { id: "chaleur", emoji: "🔥" },
  { id: "froid", emoji: "❄️" },
  { id: "tension", emoji: "🪢" },
  { id: "legerete", emoji: "🎈" },
  { id: "lourdeur", emoji: "🪨" },
  { id: "frisson", emoji: "〰️" },
  { id: "elan", emoji: "🌱" },
  { id: "calme", emoji: "🌙" },
  { id: "fluidite", emoji: "🌊" },
] as const;
export const emojiFor = (id: string) =>
  SENSORY_TAGS.find((t) => t.id === id)?.emoji ?? "◌";
