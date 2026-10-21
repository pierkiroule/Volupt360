import {
  type Stroke,
  type Project,
  type Point,
  type BrushId,
  uid,
  clamp,
} from "./model";
export interface DrawingTool {
  brush: BrushId;
  secondary?: BrushId;
  color: string;
  size: number;
  opacity: number;
  parameters?: Record<string, number>;
}
export class DrawingEngine {
  stroke: Stroke | null = null;
  private began = 0;
  begin(
    point: { x: number; y: number },
    event: PointerEvent,
    tool: DrawingTool,
  ) {
    this.began = event.timeStamp;
    this.stroke = {
      id: uid(),
      ...tool,
      points: [],
      seed: crypto.getRandomValues(new Uint32Array(1))[0],
      createdAt: Date.now(),
      parameters: { ...tool.parameters },
    };
    this.append(point, event);
  }
  append(p: { x: number; y: number }, event: PointerEvent) {
    if (!this.stroke) return;
    const last = this.stroke.points.at(-1),
      time = Math.max(0, event.timeStamp - this.began);
    const distance = last
      ? Math.hypot((p.x - last.x) * 1200, (p.y - last.y) * 900)
      : 0;
    if (last && distance < 0.7) return;
    const speed = last
      ? clamp(distance / Math.max(1, time - last.time), 0, 100)
      : 0;
    const pressure =
      event.pointerType === "pen" ? clamp(event.pressure || 0.05) : 0.55;
    const point: Point = {
      x: clamp(p.x),
      y: clamp(p.y),
      time,
      pressure,
      speed,
    };
    if (last) {
      point.x = last.x * 0.15 + point.x * 0.85;
      point.y = last.y * 0.15 + point.y * 0.85;
    }
    if (this.stroke.points.length < 1800) this.stroke.points.push(point);
  }
  finish() {
    const result = this.stroke;
    this.stroke = null;
    return result;
  }
  cancel() {
    this.stroke = null;
  }
}
/** Split only touched runs; remap local effect weights to the surviving fragments. */
export function erase(
  project: Project,
  path: { x: number; y: number }[],
  radius: number,
): Project {
  const mappings = new Map<string, { stroke: Stroke; indices: number[] }[]>();
  const strokes: Stroke[] = [];
  for (const s of project.strokes) {
    const kept: { stroke: Stroke; indices: number[] }[] = [];
    let run: number[] = [];
    let changed = false;
    const flush = () => {
      if (run.length) {
        const stroke = { ...s, id: uid(), points: run.map((i) => s.points[i]) };
        kept.push({ stroke, indices: run });
        run = [];
      }
    };
    for (let i = 0; i < s.points.length; i++) {
      const p = s.points[i];
      const hit = path.some(
        (q) => Math.hypot((p.x - q.x) * 1.333, p.y - q.y) < radius,
      );
      if (hit) {
        changed = true;
        flush();
      } else run.push(i);
    }
    flush();
    if (!changed) {
      strokes.push(s);
      continue;
    }
    mappings.set(s.id, kept);
    strokes.push(...kept.map((k) => k.stroke));
  }
  if (!mappings.size) return project;
  const effects = project.effects
    .map((e) => {
      const weights = { ...e.weights };
      for (const [id, fragments] of mappings) {
        const old = weights[id];
        delete weights[id];
        if (old)
          for (const f of fragments)
            weights[f.stroke.id] = f.indices.map((i) => old[i]);
      }
      return { ...e, weights, targets: Object.keys(weights) };
    })
    .filter((e) => e.targets.length);
  return { ...project, strokes, effects };
}
