import { type BrushId, type Stroke, random, clamp } from "./model";
import { samples, type Sample } from "./StrokeGeometry";
export const BRUSHES: { id: BrushId; name: string; description: string }[] = [
  {
    id: "ink",
    name: "Encre",
    description: "Calligraphie souple, sensible à la pression",
  },
  {
    id: "watercolor",
    name: "Aquarelle",
    description: "Lavis, granulation et auréoles",
  },
  { id: "ribbon", name: "Ruban", description: "Bandes torsadées et dégradés" },
  {
    id: "charcoal",
    name: "Fusain",
    description: "Frottement sec et microfragments",
  },
  { id: "light", name: "Lumière", description: "Noyau clair et halo diffus" },
  {
    id: "dust",
    name: "Poussière",
    description: "Constellation de grains dispersés",
  },
  {
    id: "branch",
    name: "Ramification",
    description: "Branches et pousses hiérarchisées",
  },
  {
    id: "waves",
    name: "Ondes",
    description: "Cercles et résonances graphiques",
  },
  { id: "thread", name: "Fil", description: "Entrelacs de fibres fines" },
  {
    id: "bubbles",
    name: "Bulles",
    description: "Membranes translucides superposées",
  },
  { id: "feather", name: "Plume", description: "Fibres souples et effilées" },
  {
    id: "collage",
    name: "Collage",
    description: "Papiers découpés et fragments pigmentés",
  },
];
export interface Vertex {
  x: number;
  y: number;
  source: number;
}
export interface Mark {
  kind: "line" | "dot" | "wash" | "glow" | "ring" | "polygon";
  points: Vertex[];
  size: number;
  alpha: number;
  color: string;
}
const cached = new WeakMap<Stroke, Mark[]>();
export function marks(stroke: Stroke): Mark[] {
  const old = cached.get(stroke);
  if (old) return old;
  const path = samples(stroke),
    out: Mark[] = [];
  function generate(id: BrushId, opacity: number) {
    const spacing = stroke.parameters.spacing || 1,
      amplitude = stroke.parameters.amplitude || 1,
      dispersion = stroke.parameters.dispersion || 1;
    const rand = random(stroke.seed + id.charCodeAt(0) * 719),
      color = stroke.color,
      size = stroke.size;
    const at = (p: Sample, dx = 0, dy = 0): Vertex => ({
      x: p.x + dx,
      y: p.y + dy,
      source: p.source,
    });
    const add = (
      kind: Mark["kind"],
      points: Vertex[],
      width: number,
      alpha: number,
      c = color,
    ) =>
      out.push({
        kind,
        points,
        size: width,
        alpha: clamp(alpha * opacity),
        color: c,
      });
    let travelled = 10000;
    for (let i = 0; i < path.length; i++) {
      const p = path[i],
        prev = path[Math.max(0, i - 1)],
        next = path[Math.min(path.length - 1, i + 1)];
      const angle = Math.atan2(next.y - prev.y, next.x - prev.x),
        nx = -Math.sin(angle),
        ny = Math.cos(angle);
      const pressure = 0.25 + 0.75 * p.pressure,
        w = size * pressure * (id === "ink" ? 1 / (1 + p.speed * 0.08) : 1);
      travelled += Math.hypot(p.x - prev.x, p.y - prev.y);
      if (id === "ink") {
        add(
          "line",
          [at(prev), at(p)],
          Math.max(0.8, w * (0.92 + rand() * 0.16)),
          0.92,
        );
        if (i % 4 === 0) add("wash", [at(p)], w * 0.75, 0.08);
      }
      if (id === "watercolor" && travelled > size * 0.18) {
        travelled = 0;
        add(
          "wash",
          [at(p, (rand() - 0.5) * w * 0.25, (rand() - 0.5) * w * 0.25)],
          w * (1 + rand() * 0.4),
          0.38,
        );
        if (rand() < 0.12)
          add(
            "dot",
            [at(p, (rand() - 0.5) * w * 2, (rand() - 0.5) * w * 2)],
            0.8 + rand() * 2.2,
            0.2,
          );
      }
      if (id === "ribbon") {
        const t = 0.65 + 0.35 * Math.sin(i * 0.16);
        const a = size * 0.5 * t;
        add(
          "polygon",
          [
            at(prev, nx * a, ny * a),
            at(p, nx * a, ny * a),
            at(p, -nx * a, -ny * a),
            at(prev, -nx * a, -ny * a),
          ],
          1,
          0.65,
        );
        add(
          "line",
          [
            at(prev, nx * a * 0.6, ny * a * 0.6),
            at(p, nx * a * 0.6, ny * a * 0.6),
          ],
          Math.max(1, w * 0.13),
          0.35,
          "#ffffff",
        );
      }
      if (id === "charcoal" && i % 2 === 0) {
        for (let k = 0; k < 9; k++) {
          const u = (rand() - 0.5) * w,
            v = (rand() - 0.5) * w * 0.8;
          add(
            "dot",
            [at(p, u, v)],
            0.6 + rand() * w * 0.09,
            0.18 + rand() * 0.4,
          );
        }
      }
      if (id === "light") {
        if (travelled > size * 0.23) {
          travelled = 0;
          add("glow", [at(p)], size * 1.9, 0.2);
        }
        add("line", [at(prev), at(p)], Math.max(1, w * 0.15), 0.65);
        add(
          "line",
          [at(prev), at(p)],
          Math.max(0.7, w * 0.04),
          0.85,
          "#fff6dc",
        );
      }
      if (id === "dust" && i % 2 === 0) {
        for (let k = 0; k < 7; k++) {
          const a = rand() * Math.PI * 2,
            r = Math.sqrt(rand()) * size * 1.5 * dispersion;
          add(
            "dot",
            [at(p, Math.cos(a) * r, Math.sin(a) * r)],
            1 + rand() * size * 0.1,
            0.1 + rand() * 0.65,
          );
        }
      }
      if (id === "branch") {
        add("line", [at(prev), at(p)], Math.max(0.8, w * 0.15), 0.7);
        if (travelled > size * 0.65) {
          travelled = 0;
          const sign = rand() < 0.5 ? -1 : 1,
            len = w * (1.2 + rand() * 1.4),
            tip = at(p, nx * len * sign, ny * len * sign);
          add("line", [at(p), tip], Math.max(0.7, w * 0.06), 0.65);
          add(
            "line",
            [
              {
                ...tip,
                x: (tip.x + p.x) * 0.6 + next.x * 0.4,
                y: (tip.y + p.y) * 0.6 + next.y * 0.4,
              },
              tip,
            ],
            Math.max(0.5, w * 0.03),
            0.45,
          );
          for (let k = 1; k < 4; k++) {
            const f = k / 4;
            add(
              "line",
              [
                at(p, nx * len * sign * f, ny * len * sign * f),
                at(
                  p,
                  nx * len * sign * f + Math.cos(angle) * len * 0.25,
                  ny * len * sign * f + Math.sin(angle) * len * 0.25,
                ),
              ],
              0.6,
              0.5,
            );
          }
        }
      }
      if (id === "waves" && travelled > size * 0.62 * spacing) {
        travelled = 0;
        for (let k = 1; k <= 3; k++)
          add(
            "ring",
            [at(p)],
            size * k * 0.38 * amplitude,
            0.4 / (k * 0.6 + 1),
          );
      }
      if (id === "thread") {
        for (let k = 0; k < 4; k++) {
          const a = Math.sin(i * 0.11 + k * 1.7) * size * 0.45 * amplitude;
          add(
            "line",
            [at(prev, nx * a, ny * a), at(p, nx * a, ny * a)],
            0.65 + (k === 1 ? 0.5 : 0),
            0.42,
          );
        }
      }
      if (id === "bubbles" && travelled > size * 0.66) {
        travelled = 0;
        const dx = (rand() - 0.5) * size * 0.7,
          dy = (rand() - 0.5) * size * 0.7,
          r = size * (0.3 + rand() * 0.5);
        add("wash", [at(p, dx, dy)], r * 1.8, 0.06);
        add("ring", [at(p, dx, dy)], r, 0.44);
        add(
          "ring",
          [at(p, dx + r * 0.03, dy - r * 0.03)],
          r * 0.95,
          0.28,
          "#ffffff",
        );
      }
      if (id === "feather") {
        add("line", [at(prev), at(p)], Math.max(0.6, w * 0.05), 0.4);
        if (i % 2 === 0) {
          const len = w * (0.7 + 0.3 * Math.sin(i * 0.1));
          for (const sign of [-1, 1])
            add(
              "line",
              [
                at(p),
                at(
                  p,
                  nx * len * sign - Math.cos(angle) * len * 0.5,
                  ny * len * sign - Math.sin(angle) * len * 0.5,
                ),
              ],
              Math.max(0.5, w * 0.025),
              0.3,
            );
        }
      }
      if (id === "collage" && travelled > size * 0.55) {
        travelled = 0;
        const polygon = [];
        for (let k = 0; k < 5; k++) {
          const a = (k * Math.PI * 2) / 5,
            rad = size * (0.45 + rand() * 0.4);
          polygon.push(at(p, Math.cos(a) * rad, Math.sin(a) * rad));
        }
        add("polygon", polygon, 1, 0.3 + rand() * 0.45);
        for (let k = 0; k < 4; k++)
          add(
            "line",
            [
              at(p, -size * 0.3, (k - 2) * size * 0.13),
              at(p, size * 0.3, (k - 2) * size * 0.13),
            ],
            0.6,
            0.2,
            "#f6efdb",
          );
      }
    }
  }
  generate(stroke.brush, stroke.opacity);
  if (stroke.secondary && stroke.secondary !== stroke.brush)
    generate(stroke.secondary, stroke.opacity * 0.55);
  cached.set(stroke, out);
  return out;
}
const stamps = new Map<string, HTMLCanvasElement>();
export function watercolorStamp(color: string) {
  const old = stamps.get(color);
  if (old) return old;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const rand = random(31273),
    pixels = ctx.createImageData(128, 128);
  const red = parseInt(color.slice(1, 3), 16),
    green = parseInt(color.slice(3, 5), 16),
    blue = parseInt(color.slice(5, 7), 16);
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++) {
      const dx = (x - 64) / 61,
        dy = (y - 64) / 61,
        a = Math.atan2(dy, dx);
      const boundary =
        0.87 +
        0.045 * Math.sin(a * 7) +
        0.035 * Math.sin(a * 13 + 2) +
        0.025 * Math.sin(a * 23);
      const d = Math.hypot(dx, dy) / boundary;
      const tide =
        0.5 +
        0.5 *
          Math.sin(x * 0.17 + Math.sin(y * 0.11) * 3) *
          Math.sin(y * 0.13 + x * 0.05);
      const grain = rand(),
        edge = Math.max(0, Math.min(1, (1 - d) * 11));
      let alpha =
        edge *
        (0.3 + tide * 0.17 + Math.exp(-(((d - 0.82) / 0.09) ** 2)) * 0.26) *
        (grain < 0.12 ? 0.2 : 0.65 + grain * 0.35);
      if (d > 1) alpha = 0;
      const shade = 0.72 + tide * 0.19 + grain * 0.09;
      const i = (y * 128 + x) * 4;
      pixels.data[i] = red * shade;
      pixels.data[i + 1] = green * shade;
      pixels.data[i + 2] = blue * shade;
      pixels.data[i + 3] = alpha * 255;
    }
  ctx.putImageData(pixels, 0, 0);
  stamps.set(color, c);
  while (stamps.size > 32) stamps.delete(stamps.keys().next().value!);
  return c;
}
