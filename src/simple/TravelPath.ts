/** Continuous discovery: close details, open passages, then regain perspective.
 * The route is bounded, slow and closed. No look-at target can meet the camera. */
export const TRAVEL_PERIOD = (Math.PI * 2) / 0.028;
export function sampleTravel(time: number, out: Float64Array) {
  const t = time * 0.028;
  const radius = 5.1 + 2.2 * Math.cos(t * 2) + 0.25 * Math.sin(t * 3);
  out[0] = Math.sin(t) * radius;
  out[1] = 18 + Math.sin(t) * 0.9 + Math.sin(t * 3) * 0.45;
  out[2] = -5 + Math.cos(t) * radius * 0.85;
  out[3] = Math.sin(t * 2) * 0.65;
  out[4] = 18 + Math.sin(t + 0.4) * 0.5;
  out[5] = -5 + Math.cos(t * 3) * 0.5;
  return out;
}
