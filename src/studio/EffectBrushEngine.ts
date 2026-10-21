import {
  type Effect,
  type EffectId,
  type Stroke,
  type Project,
  uid,
  clamp,
} from "./model";
export const EFFECTS: { id: EffectId; name: string; glyph: string }[] = [
  { id: "breathe", name: "Respirer", glyph: "◌" },
  { id: "wave", name: "Onduler", glyph: "≈" },
  { id: "vibrate", name: "Vibrer", glyph: "≋" },
  { id: "rotate", name: "Tourner", glyph: "↻" },
  { id: "bloom", name: "Éclore", glyph: "✳" },
  { id: "dissolve", name: "Dissoudre", glyph: "⁙" },
  { id: "float", name: "Flotter", glyph: "∿" },
  { id: "pulse", name: "Pulser", glyph: "◉" },
  { id: "attract", name: "Attirer", glyph: "⇥" },
  { id: "repel", name: "Repousser", glyph: "↔" },
  { id: "flow", name: "Ruisseler", glyph: "⌁" },
  { id: "sparkle", name: "Scintiller", glyph: "✧" },
];
export function paintEffect(
  project: Project,
  type: EffectId,
  path: { x: number; y: number }[],
  params: {
    intensity: number;
    speed: number;
    radius: number;
    duration: number;
  },
  time: number,
): Effect | null {
  const weights: Record<string, number[]> = Object.create(null),
    targets: string[] = [];
  for (const stroke of project.strokes) {
    const w = stroke.points.map((p) => {
      let d = Infinity;
      for (const q of path)
        d = Math.min(d, Math.hypot((p.x - q.x) * 1.333, p.y - q.y));
      const f = clamp(1 - d / params.radius);
      return f * f * (3 - 2 * f);
    });
    if (w.some((n) => n > 0)) {
      weights[stroke.id] = w;
      targets.push(stroke.id);
    }
  }
  return targets.length
    ? {
        id: uid(),
        type,
        path,
        targets,
        weights,
        ...params,
        enabled: true,
        seed: Math.floor(Math.random() * 4294967295),
        referenceTime: time,
      }
    : null;
}
export interface Motion {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  alpha: number;
  glow: number;
}
/** Derived from immutable coordinates: no accumulation and exact time-zero reset. */
export function motion(
  effects: Effect[],
  stroke: Stroke,
  source: number,
  x: number,
  y: number,
  time: number,
): Motion {
  const out = { x, y, scale: 1, rotation: 0, alpha: 1, glow: 0 };
  for (const effect of effects) {
    if (!effect.enabled) continue;
    const values = effect.weights[stroke.id];
    if (!values) continue;
    const index = Math.min(values.length - 1, Math.max(0, source)),
      i = Math.floor(index),
      weight =
        values[i] +
        ((values[Math.min(i + 1, values.length - 1)] || 0) - values[i]) *
          (index - i);
    const age = Math.max(0, time - effect.referenceTime);
    if (effect.duration > 0 && age > effect.duration) continue;
    const envelope =
      Math.min(1, age * 2) *
      (effect.duration ? Math.min(1, (effect.duration - age) * 2) : 1);
    const a = weight * effect.intensity * envelope,
      t = age * effect.speed,
      phase = effect.seed * 0.00001;
    const center = effect.path[Math.floor(effect.path.length / 2)] || {
        x: 0.5,
        y: 0.5,
      },
      cx = center.x * 1200,
      cy = center.y * 900;
    const wave = Math.sin(t * 1.4 + source * 0.09 + phase);
    switch (effect.type) {
      case "breathe": {
        const s = 1 + Math.sin(t * 0.9) * a * 0.09;
        out.x += (x - cx) * (s - 1);
        out.y += (y - cy) * (s - 1);
        out.scale *= s;
        break;
      }
      case "wave":
        out.x += Math.sin(y * 0.025 + t * 1.1) * a * 18;
        out.y += Math.sin(x * 0.02 - t) * a * 22;
        break;
      case "vibrate":
        out.x += Math.sin(t * 6 + source * 0.8) * a * 3;
        out.y += Math.cos(t * 5.3 + source) * a * 3;
        break;
      case "rotate": {
        const angle = Math.sin(t * 0.35) * a * 0.28,
          dx = x - cx,
          dy = y - cy;
        out.x += dx * Math.cos(angle) - dy * Math.sin(angle) - dx;
        out.y += dx * Math.sin(angle) + dy * Math.cos(angle) - dy;
        out.rotation += angle;
        break;
      }
      case "bloom":
        out.scale *= 1 + a * (0.2 + 0.2 * Math.sin(t * 0.7));
        out.x += (x - cx) * a * 0.05 * (1 - Math.cos(t * 0.7));
        break;
      case "dissolve": {
        const d = (1 - Math.cos(t * 0.65)) * 0.5 * a;
        out.x += Math.sin(source * 12.98 + phase) * d * 45;
        out.y += Math.cos(source * 7.23 + phase) * d * 45;
        out.alpha *= 1 - d * 0.98;
        break;
      }
      case "float":
        out.x += Math.sin(t * 0.45 + phase) * a * 14;
        out.y += Math.sin(t * 0.7 + phase) * a * 20;
        break;
      case "pulse":
        out.scale *= 1 + wave * a * 0.09;
        out.alpha *= 1 - a * 0.25 * (0.5 + 0.5 * wave);
        out.glow = wave * a * 0.1;
        break;
      case "attract":
        out.x += (cx - x) * a * 0.16 * (0.5 + 0.5 * Math.sin(t * 0.6));
        out.y += (cy - y) * a * 0.16 * (0.5 + 0.5 * Math.sin(t * 0.6));
        break;
      case "repel":
        out.x += (x - cx) * a * 0.13 * (0.5 + 0.5 * Math.sin(t * 0.6));
        out.y += (y - cy) * a * 0.13 * (0.5 + 0.5 * Math.sin(t * 0.6));
        break;
      case "flow":
        out.y += Math.sin(t * 0.55 + source * 0.13) * a * 27;
        out.x += Math.sin(t * 0.4 + y * 0.018) * a * 12;
        break;
      case "sparkle":
        out.glow =
          Math.pow(Math.max(0, Math.sin(t * 1.7 + source * 0.83)), 6) * a * 0.5;
        out.alpha *= 1 - a * 0.18 * (1 - wave);
        break;
    }
  }
  return out;
}
