/** Sensory invitations with open meanings; no emotion or clinical inference. */
export const SENSORY_EMOJIS = [
  ["bubbles", "🫧", "Bulles", "#729e9c", 1, "orbit"],
  ["water", "🌊", "Ondes", "#286caa", 0, "wave"],
  ["warm", "🔥", "Chaleur", "#bc3d35", 2, "rise"],
  ["cold", "❄️", "Fraîcheur", "#8daebc", 5, "crystal"],
  ["stone", "🪨", "Densité", "#7c818c", 0, "grain"],
  ["feather", "🪶", "Légèreté", "#a79bb1", 3, "float"],
  ["mist", "🌫️", "Brume", "#a4adb0", 1, "float"],
  ["spark", "⚡", "Vibration", "#b7a36a", 4, "pulse"],
  ["swirl", "🌀", "Tourbillon", "#9188a5", 2, "orbit"],
  ["thread", "🧵", "Tension", "#ac8292", 3, "wave"],
  ["shoot", "🌱", "Élan", "#8eab88", 2, "rise"],
  ["sun", "☀️", "Rayonnement", "#c7ad74", 1, "pulse"],
].map(([id, emoji, name, color, band, motion]) => ({
  id,
  emoji,
  name,
  color,
  band,
  motion,
}));
export const emojiById = (id) =>
  SENSORY_EMOJIS.find((e) => e.id === id) || SENSORY_EMOJIS[0];
