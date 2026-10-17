import { hashMood } from "./echoMoodEngine.js";
// Artistic affinity, not an acoustic classifier. Optional curated metadata can be added later.
export function musicSelector(mood, tracks = []) {
  if (!tracks.length) return null;
  return tracks
    .map((url) => ({
      url,
      score:
        Math.abs(
          (hashMood(url) % 1000) / 1000 -
            (mood.music.energy * 0.45 +
              mood.music.warmth * 0.3 +
              mood.music.space * 0.25),
        ) +
        (hashMood(`${url}:${mood.seed}`) % 100) / 1000,
    }))
    .sort((a, b) => a.score - b.score)[0].url;
}
