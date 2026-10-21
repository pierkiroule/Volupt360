import { type Stroke } from "./model";
export interface Sample {
  x: number;
  y: number;
  pressure: number;
  speed: number;
  source: number;
}
const cache = new WeakMap<Stroke, Sample[]>();
export function samples(stroke: Stroke): Sample[] {
  const cached = cache.get(stroke);
  if (cached) return cached;
  const points = stroke.points,
    result: Sample[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(0, i - 1)],
      b = points[i],
      c = points[Math.min(points.length - 1, i + 1)];
    const x = ((a.x + b.x * 4 + c.x) / 6) * 1200,
      y = ((a.y + b.y * 4 + c.y) / 6) * 900;
    const prev = result.at(-1);
    const steps = prev
      ? Math.max(
          1,
          Math.ceil(
            Math.hypot(x - prev.x, y - prev.y) /
              Math.max(2, stroke.size * 0.17),
          ),
        )
      : 1;
    const from = prev || {
      x,
      y,
      pressure: b.pressure,
      speed: b.speed,
      source: i,
    };
    for (let k = 1; k <= Math.min(steps, 80); k++) {
      const t = k / Math.min(steps, 80);
      result.push({
        x: from.x + (x - from.x) * t,
        y: from.y + (y - from.y) * t,
        pressure: from.pressure + (b.pressure - from.pressure) * t,
        speed: b.speed,
        source: Math.max(0, i - 1 + t),
      });
    }
  }
  const bounded =
    result.length > 2400
      ? result.filter((_, i) => i % Math.ceil(result.length / 2400) === 0)
      : result;
  cache.set(stroke, bounded);
  return bounded;
}
