const unit = (value) =>
  Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

/** Acoustic-to-plastic correspondences only; no psychological interpretation.
 * `freq` is the existing spectral centroid, not a measured fundamental pitch. */
export function materialGrammar(features = {}) {
  const intensity = unit(features.energy ?? (features.rms || 0) * 9);
  const variation = unit(features.flux ?? features.motion);
  const frequency = unit((features.freq || 0) / 6000);
  const silence =
    features.silence === true || (features.rms != null && features.rms < 0.006);
  return {
    silence,
    profile: silence
      ? 0
      : Math.min(3, Math.floor(intensity * 2 + variation + frequency)),
    spread: 0.45 + intensity * 0.3,
    irregularity: 0.12 + variation * 0.32,
    granulation: 0.2 + frequency * 0.5,
    opacity: silence ? 0.15 : 0.4 + intensity * 0.5,
  };
}
