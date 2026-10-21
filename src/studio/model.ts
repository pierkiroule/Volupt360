export const FORMAT = "squiggle360.project";
export type BrushId =
  | "ink"
  | "watercolor"
  | "ribbon"
  | "charcoal"
  | "light"
  | "dust"
  | "branch"
  | "waves"
  | "thread"
  | "bubbles"
  | "feather"
  | "collage";
export type EffectId =
  | "breathe"
  | "wave"
  | "vibrate"
  | "rotate"
  | "bloom"
  | "dissolve"
  | "float"
  | "pulse"
  | "attract"
  | "repel"
  | "flow"
  | "sparkle";
export interface Point {
  x: number;
  y: number;
  time: number;
  pressure: number;
  speed: number;
}
export interface Stroke {
  id: string;
  brush: BrushId;
  secondary?: BrushId;
  points: Point[];
  color: string;
  size: number;
  opacity: number;
  seed: number;
  createdAt: number;
  parameters: Record<string, number>;
}
export interface Effect {
  id: string;
  type: EffectId;
  path: { x: number; y: number }[];
  targets: string[];
  weights: Record<string, number[]>;
  intensity: number;
  speed: number;
  radius: number;
  duration: number;
  enabled: boolean;
  seed: number;
  referenceTime: number;
}
export interface Project {
  format: typeof FORMAT;
  version: 1;
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  width: 1200;
  height: 900;
  background: string;
  strokes: Stroke[];
  effects: Effect[];
  favorites: BrushId[];
  playhead: number;
}
export const BRUSH_IDS: BrushId[] = [
  "ink",
  "watercolor",
  "ribbon",
  "charcoal",
  "light",
  "dust",
  "branch",
  "waves",
  "thread",
  "bubbles",
  "feather",
  "collage",
];
export const EFFECT_IDS: EffectId[] = [
  "breathe",
  "wave",
  "vibrate",
  "rotate",
  "bloom",
  "dissolve",
  "float",
  "pulse",
  "attract",
  "repel",
  "flow",
  "sparkle",
];
export const uid = () => crypto.randomUUID();
export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const random = (seed: number) => {
  let n = seed >>> 0;
  return () => (n = (Math.imul(n, 1664525) + 1013904223) >>> 0) / 4294967296;
};
export function newProject(): Project {
  const now = Date.now();
  return {
    format: FORMAT,
    version: 1,
    id: uid(),
    title: "Mon dessin vivant",
    createdAt: now,
    updatedAt: now,
    width: 1200,
    height: 900,
    background: "#f5f0e5",
    strokes: [],
    effects: [],
    favorites: BRUSH_IDS.slice(0, 6),
    playhead: 0,
  };
}
/** Strict, bounded import; unknown properties are never copied into project state. */
export function validateProject(input: unknown): Project {
  const p = input as Project;
  const bad = () => {
    throw Error("Projet invalide ou version non prise en charge.");
  };
  const finite = (n: unknown, a: number, b: number) =>
    typeof n === "number" && Number.isFinite(n) && n >= a && n <= b;
  const text = (s: unknown) =>
    typeof s === "string" && s.length > 0 && s.length < 140;
  const color = (s: unknown) =>
    typeof s === "string" && /^#[\da-f]{6}$/i.test(s);
  if (
    !p ||
    p.format !== FORMAT ||
    p.version !== 1 ||
    !text(p.id) ||
    !text(p.title) ||
    !color(p.background) ||
    !Array.isArray(p.strokes) ||
    p.strokes.length > 200 ||
    !Array.isArray(p.effects) ||
    p.effects.length > 80
  )
    return bad();
  if (!finite(p.createdAt, 0, 1e14) || !finite(p.updatedAt, 0, 1e14))
    return bad();
  let count = 0;
  const ids = new Set<string>();
  const strokes = p.strokes.map((s) => {
    if (
      !text(s.id) ||
      ids.has(s.id) ||
      !BRUSH_IDS.includes(s.brush) ||
      (s.secondary && !BRUSH_IDS.includes(s.secondary)) ||
      !Array.isArray(s.points) ||
      !s.points.length ||
      s.points.length > 1800 ||
      !color(s.color) ||
      !finite(s.size, 1, 160) ||
      !finite(s.opacity, 0, 1) ||
      !finite(s.seed, 0, 4294967295) ||
      !finite(s.createdAt, 0, 1e14)
    )
      return bad();
    ids.add(s.id);
    count += s.points.length;
    if (count > 120000) return bad();
    const points = s.points.map((q) => {
      if (
        !finite(q.x, 0, 1) ||
        !finite(q.y, 0, 1) ||
        !finite(q.time, 0, 1e9) ||
        !finite(q.pressure, 0, 1) ||
        !finite(q.speed, 0, 100)
      )
        return bad();
      return {
        x: q.x,
        y: q.y,
        time: q.time,
        pressure: q.pressure,
        speed: q.speed,
      };
    });
    return {
      id: s.id,
      brush: s.brush,
      secondary: s.secondary,
      points,
      color: s.color,
      size: s.size,
      opacity: s.opacity,
      seed: s.seed,
      createdAt: s.createdAt,
      parameters: Object.fromEntries(
        ["spacing", "amplitude", "dispersion"]
          .filter((key) => finite(s.parameters?.[key], 0.1, 3))
          .map((key) => [key, s.parameters[key]]),
      ),
    };
  });
  let totalWeights = 0;
  const effectIds = new Set<string>();
  const effects = p.effects.map((e) => {
    if (
      !text(e.id) ||
      effectIds.has(e.id) ||
      !EFFECT_IDS.includes(e.type) ||
      !Array.isArray(e.path) ||
      e.path.length > 400 ||
      !Array.isArray(e.targets) ||
      e.targets.length > 200 ||
      !finite(e.intensity, 0, 1) ||
      !finite(e.speed, 0.05, 3) ||
      !finite(e.radius, 0.005, 1) ||
      !finite(e.duration, 0, 600) ||
      !finite(e.referenceTime, 0, 1e9) ||
      !finite(e.seed, 0, 4294967295) ||
      typeof e.enabled !== "boolean" ||
      !e.weights
    )
      return bad();
    effectIds.add(e.id);
    const targets = [...new Set(e.targets.filter((id) => ids.has(id)))];
    const weights: Record<string, number[]> = Object.create(null);
    for (const id of targets) {
      const s = strokes.find((s) => s.id === id)!;
      const w = e.weights[id];
      if (
        !Array.isArray(w) ||
        w.length !== s.points.length ||
        w.some((n) => !finite(n, 0, 1))
      )
        return bad();
      totalWeights += w.length;
      if (totalWeights > 1_000_000) return bad();
      weights[id] = [...w];
    }
    const path = e.path.map((q) => {
      if (!finite(q.x, 0, 1) || !finite(q.y, 0, 1)) return bad();
      return { x: q.x, y: q.y };
    });
    return {
      id: e.id,
      type: e.type,
      path,
      targets,
      weights,
      intensity: e.intensity,
      speed: e.speed,
      radius: e.radius,
      duration: e.duration,
      enabled: e.enabled,
      seed: e.seed,
      referenceTime: e.referenceTime,
    };
  });
  return {
    format: FORMAT,
    version: 1,
    id: p.id,
    title: p.title,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    width: 1200,
    height: 900,
    background: p.background,
    strokes,
    effects,
    favorites: Array.isArray(p.favorites)
      ? [...new Set(p.favorites.filter((b) => BRUSH_IDS.includes(b)))].slice(
          0,
          6,
        )
      : BRUSH_IDS.slice(0, 6),
    playhead: finite(p.playhead, 0, 1e9) ? p.playhead : 0,
  };
}
