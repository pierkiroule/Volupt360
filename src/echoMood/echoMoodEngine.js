import { Color } from "three";

export const MOOD_EMOJIS = [
  "🌊",
  "🌿",
  "🔥",
  "🌙",
  "☀️",
  "❄️",
  "🌸",
  "🍂",
  "🪶",
  "🌀",
  "🫧",
  "🌈",
  "✨",
  "🪨",
  "🌧️",
  "🌌",
  "🦋",
  "🐚",
  "🍄",
  "🌾",
  "💧",
  "🎵",
  "🕯️",
  "🪸",
  "💜",
  "🧡",
  "💙",
  "🤍",
];
const hues = [
  205, 125, 18, 245, 45, 190, 325, 30, 42, 270, 180, 285, 52, 215, 220, 265,
  300, 175, 10, 65, 200, 280, 35, 350, 275, 25, 210, 45,
];
export const hashMood = (text) =>
  Array.from(text).reduce(
    (h, c) => Math.imul(h ^ c.codePointAt(0), 16777619) >>> 0,
    2166136261,
  );
export function echoMoodEngine(emojis, seed = 0) {
  const selected = [...new Set(emojis)]
    .filter((e) => MOOD_EMOJIS.includes(e))
    .sort();
  if (selected.length < 1 || selected.length > 3)
    throw new Error("Choisissez entre un et trois emojis.");
  const mix = new Float64Array(7);
  let x = 0,
    y = 0;
  for (const emoji of selected) {
    const i = MOOD_EMOJIS.indexOf(emoji),
      h = (hues[i] * Math.PI) / 180;
    x += Math.cos(h);
    y += Math.sin(h);
    for (let d = 0; d < mix.length; d++)
      mix[d] += (hashMood(`${emoji}:${d}`) % 1000) / 1000 / selected.length;
  }
  const key = selected.join(""),
    family = hashMood(key),
    variation = (hashMood(`${key}:${seed}`) % 1000) / 1000 - 0.5;
  const hue =
    (((Math.atan2(y, x) * 180) / Math.PI + 360 + variation * 16) % 360) / 360;
  const palette = Array.from(
    { length: 5 },
    (_, i) =>
      "#" +
      new Color()
        .setHSL(
          (hue + (i - 2) * (0.045 + mix[0] * 0.045) + 1) % 1,
          0.3 + mix[1] * 0.32,
          0.32 + mix[2] * 0.16 + (i % 2) * 0.07,
        )
        .getHexString(),
  );
  return {
    emojis: selected,
    seed: hashMood(`${family}:${seed}`),
    palette,
    hue,
    brightness: 0.91 + mix[3] * 0.065,
    fluidity: 0.3 + mix[0] * 0.65,
    density: 0.3 + mix[1] * 0.6,
    speed: 0.65 + mix[4] * 0.7,
    dispersion: 0.4 + mix[5] * 1.1,
    response: 0.8 + mix[6] * 0.65,
    music: { energy: mix[4], warmth: mix[2], space: mix[0] },
  };
}
