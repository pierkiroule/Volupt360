const roles = {
  voiles: 0,
  falaises: 3,
  filaments: 2,
  lagons: 4,
  dilution: 1,
  echo: 5,
};

/** One reusable local envelope per deposit. No frame allocations or shared phase. */
export function createMaterialResponse(brush, seed) {
  const primary = roles[brush] ?? 2;
  const secondary = (primary + 2 + (seed % 2)) % 6;
  const output = { energy: 0, low: 0, high: 0, pulse: 0, rms: 0, flux: 0 };
  let previous = 0;
  const speed = 3.5 + (seed % 7) * 0.55;
  return (audio, dt) => {
    const hasSpectrum = audio.bands?.length === 6;
    const a = hasSpectrum
      ? audio.bands[primary]
      : audio.low || audio.energy || 0;
    const b = hasSpectrum
      ? audio.bands[secondary]
      : audio.high || audio.energy || 0;
    const energy = Math.min(
      1,
      a * 0.85 + b * 0.35 + (audio.energy || 0) * 0.16,
    );
    const accent = Math.min(
      1,
      Math.max(0, energy - previous) * 8 +
        (audio.pulse || 0) * (0.22 + (seed % 3) * 0.12),
    );
    previous += (energy - previous) * (1 - Math.exp(-dt * 2));
    output.energy +=
      (energy - output.energy) *
      (1 - Math.exp(-dt * (energy > output.energy ? speed * 2 : speed)));
    output.low +=
      (a - output.low) *
      (1 - Math.exp(-dt * (a > output.low ? speed * 2 : speed)));
    output.high +=
      (b - output.high) *
      (1 - Math.exp(-dt * (b > output.high ? speed * 2 : speed)));
    output.pulse +=
      (accent - output.pulse) *
      (1 - Math.exp(-dt * (accent > output.pulse ? speed * 2 : speed)));
    output.rms = audio.rms || 0;
    output.flux = audio.flux || 0;
    return output;
  };
}
