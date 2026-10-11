/** Rare deterministic ornaments on audible accents, with no extra geometry.
 * One eligible stroke in nine; motifs occupy a small part of that stroke. */
export function graphicSurprise(serial, features = {}) {
  const energy = features.energy || 0;
  const variation = features.flux ?? features.motion ?? 0;
  if (serial % 9 !== 5 || energy < 0.25 || variation < 0.08 || features.silence)
    return 0;
  return 1 + (Math.floor(serial / 9) % 3);
}
