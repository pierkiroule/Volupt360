/** Closed, smooth tour: approach the pigments, cross them, then recover perspective.
 * The reused output avoids per-frame allocations. Gaze remains independent. */
export function sampleTravel(time: number, out: Float64Array) {
  const t = time * 0.042;
  const radius = 5.4 + 1.5 * Math.sin(t * 2 - 0.4);
  out[0] = Math.sin(t) * radius;
  out[1] = 18 + Math.sin(t * 2) * 1.1 + (1 - Math.cos(t)) * 0.35;
  out[2] = -5 + Math.cos(t) * (6.8 + 0.8 * Math.sin(t * 2));
  // A slowly moving point inside the work keeps turns continuous, without roll.
  out[3] = Math.sin(t * 2) * 1.2;
  out[4] = 18 + Math.sin(t) * 0.45;
  out[5] = -5 + Math.sin(t * 2) * 0.7;
  return out;
}
