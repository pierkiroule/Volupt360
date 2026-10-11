import { Color, MathUtils } from "three";

const palettes = [
  ["#557f91", "#bb9068", "#a75c75"],
  ["#658477", "#a9a06d", "#b0644f"],
  ["#817898", "#bc9b82", "#527f86"],
  ["#637a95", "#bfa17b", "#9a6259"],
];

/** A stable limited gamut derived from the whole track, never its filename. */
export function createTrackPalette({ waveform = [], bpm = 0 } = {}) {
  let fingerprint = Math.round(bpm || 0);
  waveform.forEach((value, i) => {
    fingerprint =
      (Math.imul(fingerprint, 31) + Math.round(value * 1000) + i) >>> 0;
  });
  const colors = palettes[fingerprint % palettes.length];
  return {
    colors,
    colorFor(id, serial) {
      if (id === "brumes" || id === "lagons") return new Color("#26212a");
      const index =
        id === "falaises" ? 1 : id === "corolles" && serial % 7 === 2 ? 2 : 0;
      const color = new Color(colors[index]);
      color.offsetHSL(
        0,
        Math.sin(serial * 1.3) * 0.035,
        Math.sin(serial * 0.7) * 0.035,
      );
      return color;
    },
  };
}

const angleDistance = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/** Persistent open windows between distinct inhabited regions of the cocoon. */
export function compositionAt(position) {
  const angle = Math.atan2(position.z, position.x);
  const opening = Math.max(
    Math.exp(-Math.pow(angleDistance(angle, 3.05) / 0.34, 2)),
    Math.exp(-Math.pow(angleDistance(angle, 5.25) / 0.28, 2)),
  );
  const density = MathUtils.clamp(
    0.72 + 0.22 * Math.cos(angle * 3 + 0.3) - opening * 0.85,
    0.08,
    1,
  );
  return {
    density,
    opening,
    region: Math.floor((angle + Math.PI) / ((Math.PI * 2) / 6)) % 6,
  };
}

/** A phrase-length camera score; weights blend smoothly at passage boundaries. */
export function droneIntent(phrase, progress, energy) {
  const slot = ((phrase % 6) + 6) % 6;
  const scores = [0, 0, 0.5, 1, 0, 0.5];
  const t = MathUtils.smoothstep(progress, 0.1, 0.9);
  const score = MathUtils.lerp(scores[(slot + 5) % 6], scores[slot], t);
  return {
    passage: score * (1 - score) * 4,
    contemplation: Math.max(0, score * 2 - 1) * (1 - energy * 0.35),
    name: score > 0.75 ? "contemplation" : score > 0.25 ? "passage" : "suivi",
  };
}
