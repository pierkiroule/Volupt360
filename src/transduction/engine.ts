import type {
  SensoryComposition,
  SensoryParameters,
  SensoryVector,
} from "./types.ts";
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
export function hashText(text: string) {
  let hash = 2166136261;
  for (const c of text) hash = Math.imul(hash ^ c.codePointAt(0)!, 16777619);
  return hash >>> 0;
}
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
function hsl(h: number, s: number, l: number): [number, number, number] {
  return [0, 8, 4].map((n) => {
    const k = (n + h * 12) % 12;
    return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  }) as [number, number, number];
}
/** Order-independent mixed field; shared physical interactions, no rendering dependency. */
export function transduce(composition: SensoryComposition): SensoryParameters {
  const axes = new Array(8).fill(0) as SensoryVector;
  let weight = 0;
  const words = [...composition.words].sort((a, b) => a.id.localeCompare(b.id));
  for (const word of words) {
    const w = clamp(word.intensity / 100);
    weight += w;
    for (let i = 0; i < 8; i++) axes[i] += word.vector[i] * w;
  }
  for (let i = 0; i < 8; i++)
    axes[i] = clamp(axes[i] / Math.max(1, weight), -1, 1);
  const [
    gravity,
    expansion,
    fluidity,
    agitation,
    clarity,
    continuity,
    depth,
    unpredictability,
  ] = axes;
  const suspension = clamp(-gravity),
    rigidity = clamp(-fluidity),
    coupling = suspension * rigidity;
  // Opposing influences remain a composite material; variance affects its internal weave.
  let variance = 0;
  for (const word of words)
    for (let i = 0; i < 8; i++)
      variance += (word.vector[i] - axes[i]) ** 2 * (word.intensity / 100);
  variance /= Math.max(1, weight) * 8;
  const variation = seededRandom(composition.seed)();
  const hue =
    (((0.59 +
      expansion * 0.1 -
      fluidity * 0.055 +
      gravity * 0.035 +
      variation * 0.07) %
      1) +
      1) %
    1;
  return {
    axes,
    palette: [
      hsl(hue, 0.4 + clarity * 0.08, 0.62),
      hsl((hue + 0.12 + expansion * 0.1 + 1) % 1, 0.43, 0.68),
      hsl((hue - 0.2 + 1) % 1, 0.38, 0.61),
    ],
    speed: 0.055 + (agitation + 1) * 0.12,
    stretch: 1 + rigidity * 1.25 + coupling * 0.9,
    spread: 0.85 + expansion * 0.34,
    softness: clamp(0.5 - clarity * 0.35 + fluidity * 0.12),
    depth: 1 + depth * 0.35,
    density: clamp(0.5 + continuity * 0.26 + expansion * 0.1, 0.15, 0.9),
    fragmentation: clamp(0.3 - continuity * 0.25 + variance * 0.16),
    coupling: coupling + variance * 0.22 + unpredictability * 0.06,
  };
}
