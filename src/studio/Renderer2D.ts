import { type Project, type Stroke } from "./model";
import { marks, watercolorStamp, type Mark } from "./BrushRegistry";
import { motion } from "./EffectBrushEngine";
export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  effects: Project["effects"] = [],
  time = 0,
) {
  const active = effects.filter((e) => e.enabled && e.weights[stroke.id]);
  for (const mark of marks(stroke)) drawMark(ctx, mark, stroke, active, time);
  for (const e of active) {
    if (
      e.type !== "dissolve" ||
      (e.duration && time > e.referenceTime + e.duration)
    )
      continue;
    const age = Math.max(0, time - e.referenceTime),
      d = (1 - Math.cos(age * e.speed * 0.65)) * 0.5 * e.intensity;
    if (d < 0.03) continue;
    ctx.fillStyle = stroke.color;
    for (
      let i = 0;
      i < stroke.points.length;
      i += Math.max(1, Math.floor(stroke.points.length / 90))
    ) {
      const p = stroke.points[i],
        w = e.weights[stroke.id][i] || 0,
        q = motion([e], stroke, i, p.x * 1200, p.y * 900, time);
      ctx.globalAlpha = stroke.opacity * d * w * 0.8;
      ctx.beginPath();
      ctx.arc(
        q.x,
        q.y,
        Math.max(0.7, stroke.size * 0.045) * (0.7 + d),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
function drawMark(
  ctx: CanvasRenderingContext2D,
  m: Mark,
  stroke: Stroke,
  effects: Project["effects"],
  time: number,
) {
  const first = m.points[0];
  const transform = effects.length
    ? motion(effects, stroke, first.source, first.x, first.y, time)
    : { x: first.x, y: first.y, scale: 1, alpha: 1, rotation: 0, glow: 0 };
  ctx.globalAlpha = m.alpha * transform.alpha;
  ctx.strokeStyle = ctx.fillStyle = m.color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = m.size * transform.scale;
  if (m.kind === "line" || m.kind === "polygon") {
    ctx.beginPath();
    for (let i = 0; i < m.points.length; i++) {
      const p = m.points[i];
      const q = effects.length
        ? motion(effects, stroke, p.source, p.x, p.y, time)
        : p;
      i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
    }
    if (m.kind === "polygon") {
      ctx.closePath();
      ctx.fill();
    } else if (
      m.points.length > 1 &&
      (m.points[0].x !== m.points[1].x || m.points[0].y !== m.points[1].y)
    )
      ctx.stroke();
    else {
      ctx.arc(first.x, first.y, m.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    const size = m.size * transform.scale;
    if (m.kind === "wash")
      ctx.drawImage(
        watercolorStamp(m.color),
        transform.x - size * 0.65,
        transform.y - size * 0.65,
        size * 1.3,
        size * 1.3,
      );
    else if (m.kind === "glow") {
      const g = ctx.createRadialGradient(
        transform.x,
        transform.y,
        0,
        transform.x,
        transform.y,
        size,
      );
      g.addColorStop(0, m.color);
      g.addColorStop(1, m.color + "00");
      ctx.fillStyle = g;
      ctx.fillRect(transform.x - size, transform.y - size, size * 2, size * 2);
    } else {
      ctx.beginPath();
      ctx.arc(
        transform.x,
        transform.y,
        Math.max(0.15, m.kind === "ring" ? size : size * 0.5),
        0,
        Math.PI * 2,
      );
      if (m.kind === "ring") {
        ctx.lineWidth = Math.max(0.65, size * 0.035);
        ctx.stroke();
      } else ctx.fill();
    }
  }
  if (transform.glow > 0.15) {
    ctx.globalAlpha = transform.glow * 0.5;
    ctx.fillStyle = "#fff7d5";
    ctx.beginPath();
    ctx.arc(transform.x, transform.y, 1.4 + transform.glow * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
export interface Layer {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  width: number;
  height: number;
}
export function strokeLayer(stroke: Stroke): Layer {
  const pts = stroke.points,
    pad = stroke.size * 3.5 + 12;
  const x = Math.max(0, Math.min(...pts.map((p) => p.x * 1200)) - pad),
    y = Math.max(0, Math.min(...pts.map((p) => p.y * 900)) - pad);
  const width = Math.min(
      1200 - x,
      Math.max(...pts.map((p) => p.x * 1200)) - x + pad,
    ),
    height = Math.min(
      900 - y,
      Math.max(...pts.map((p) => p.y * 900)) - y + pad,
    );
  const canvas = document.createElement("canvas");
  const ratio = Math.min(1, 1100 / Math.max(width, height));
  canvas.width = Math.max(1, Math.ceil(width * ratio));
  canvas.height = Math.max(1, Math.ceil(height * ratio));
  const ctx = canvas.getContext("2d")!;
  ctx.scale(ratio, ratio);
  ctx.translate(-x, -y);
  drawStroke(ctx, stroke);
  return { canvas, x, y, width, height };
}
export class Renderer2D {
  private cache = new Map<Stroke, Layer>();
  private pixels = 0;
  layer(stroke: Stroke) {
    let layer = this.cache.get(stroke);
    if (layer) {
      this.cache.delete(stroke);
      this.cache.set(stroke, layer);
      return layer;
    }
    layer = strokeLayer(stroke);
    this.cache.set(stroke, layer);
    this.pixels += layer.canvas.width * layer.canvas.height;
    while (this.pixels > 12e6 && this.cache.size > 1) {
      const first = this.cache.keys().next().value!;
      const old = this.cache.get(first)!;
      this.pixels -= old.canvas.width * old.canvas.height;
      old.canvas.width = 1;
      this.cache.delete(first);
    }
    return layer;
  }
  render(
    ctx: CanvasRenderingContext2D,
    project: Project,
    time: number,
    original = false,
  ) {
    ctx.fillStyle = project.background;
    ctx.fillRect(0, 0, 1200, 900);
    for (const stroke of project.strokes) {
      if (
        !original &&
        project.effects.some((e) => e.enabled && e.weights[stroke.id])
      )
        drawStroke(ctx, stroke, project.effects, time);
      else {
        const layer = this.layer(stroke);
        ctx.drawImage(
          layer.canvas,
          layer.x,
          layer.y,
          layer.width,
          layer.height,
        );
      }
    }
  }
  dispose() {
    for (const layer of this.cache.values()) layer.canvas.width = 1;
    this.cache.clear();
    this.pixels = 0;
  }
}
