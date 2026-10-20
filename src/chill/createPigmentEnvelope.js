const finite = (value) =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
/** Two cascaded envelopes soften both amplitude and its rate of change. */
export function createPigmentEnvelope() {
  const bands = new Float32Array(6),
    water = new Float32Array(6);
  let accent = 0,
    onset = 0,
    previous = 0;
  return {
    bands,
    get accent() {
      return accent;
    },
    update(audio = {}, dt = 0) {
      const delta = Math.max(0, Math.min(0.1, Number.isFinite(dt) ? dt : 0));
      for (let i = 0; i < 6; i++) {
        const target = Math.pow(finite(audio.bands?.[i] ?? audio.energy), 0.8);
        water[i] +=
          (target - water[i]) *
          (1 - Math.exp(-delta / (target > water[i] ? 0.42 : 1.4)));
        bands[i] += (water[i] - bands[i]) * (1 - Math.exp(-delta / 0.38));
      }
      const level = finite(audio.energy),
        target = Math.min(
          0.24,
          finite(audio.flux) * 0.12 + Math.max(0, level - previous) * 0.18,
        );
      previous = level;
      onset += (target - onset) * (1 - Math.exp(-delta / 0.35));
      accent += (onset - accent) * (1 - Math.exp(-delta / 0.65));
    },
    copyFrom(other) {
      const s = other.snapshot();
      bands.set(s.bands);
      water.set(s.water);
      accent = s.accent;
      onset = s.onset;
      previous = s.previous;
    },
    snapshot() {
      return {
        bands: Array.from(bands),
        water: Array.from(water),
        accent,
        onset,
        previous,
      };
    },
    reset() {
      bands.fill(0);
      water.fill(0);
      accent = onset = previous = 0;
    },
  };
}
