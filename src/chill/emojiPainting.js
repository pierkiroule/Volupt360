import { emojiById } from "./sensoryEmojiCatalog.js";

export const MAX_PAINT_STROKES = 80;
export const MAX_STROKE_POINTS = 256;

const geometryCache = new WeakMap();

/** Geometry is shared by the paper preview and the immersive world. */
export function createEmojiPainting(strokes) {
  const paths = [],
    dots = [],
    nodes = [];
  const path = (points, e, width, opacity, layer) =>
    paths.push({
      points,
      color: e.color,
      band: e.band,
      width,
      opacity,
      layer,
      emojiId: e.id,
    });
  for (const [layer, stroke] of strokes.slice(0, MAX_PAINT_STROKES).entries()) {
    const cached = geometryCache.get(stroke);
    if (cached?.layer === layer) {
      paths.push(...cached.paths);
      dots.push(...cached.dots);
      if (nodes.length < 24) nodes.push(cached.node);
      continue;
    }
    const firstPath = paths.length,
      firstDot = dots.length;
    const e = emojiById(stroke.emojiId),
      source = stroke.points.slice(0, MAX_STROKE_POINTS),
      points = [];
    for (let i = 0; i < source.length; i++) {
      if (i === 0) {
        points.push(source[i]);
        continue;
      }
      const a = source[i - 1],
        b = source[i],
        steps = Math.min(
          64,
          Math.max(
            1,
            Math.ceil(
              Math.hypot(b.x - a.x, b.y - a.y) /
                Math.max(0.002, stroke.size / 8),
            ),
          ),
        );
      for (let j = 1; j <= steps && points.length < 1024; j++)
        points.push({
          x: a.x + ((b.x - a.x) * j) / steps,
          y: a.y + ((b.y - a.y) * j) / steps,
        });
    }
    if (!points.length) continue;
    const size = stroke.size,
      opacity = stroke.opacity;
    const samples = [];
    let distance = 0;
    for (let i = 0; i < points.length; i++) {
      const p = points[i],
        prev = points[Math.max(0, i - 1)],
        next = points[Math.min(points.length - 1, i + 1)];
      if (i) distance += Math.hypot(p.x - prev.x, p.y - prev.y);
      const dx = next.x - prev.x,
        dy = next.y - prev.y,
        len = Math.hypot(dx, dy) || 1;
      samples.push({
        ...p,
        nx: len === 1 && dx === 0 ? 0 : -dy / len,
        ny: len === 1 && dy === 0 ? 1 : dx / len,
        d: distance,
      });
    }
    const ribbon = (offset, width, alpha = 1) =>
      path(
        samples.map((p) => ({
          x: p.x + p.nx * offset(p),
          y: p.y + p.ny * offset(p),
        })),
        e,
        width,
        opacity * alpha,
        layer,
      );
    const stamp = (p, r, vertices = 24, phase = 0) =>
      Array.from({ length: vertices + 1 }, (_, j) => {
        const a = (j / vertices) * Math.PI * 2;
        return {
          x: p.x + Math.cos(a) * r * (1 + 0.12 * Math.sin(a * 5 + phase)),
          y: p.y + Math.sin(a) * r,
        };
      });
    if (e.id === "water") {
      for (let k = 0; k < 3; k++)
        ribbon(
          (p) =>
            Math.sin((p.d / size) * 3) * size * 0.42 + (k - 1) * size * 0.18,
          size * (k === 1 ? 0.35 : 0.12),
          k === 1 ? 0.9 : 0.6,
        );
    } else if (e.id === "thread") {
      for (let k = 0; k < 4; k++)
        ribbon(
          (p) =>
            Math.sin((p.d / size) * 4 + k * 0.7) * size * 0.12 +
            (k - 1.5) * size * 0.17,
          size * 0.055,
          0.85,
        );
    } else if (e.id === "feather") {
      ribbon(() => 0, size * 0.055);
    } else if (e.id === "mist") {
      for (let k = 0; k < 3; k++)
        ribbon(
          (p) => Math.sin((p.d / size) * 0.8 + k) * size * 0.15,
          size * (1.2 - k * 0.25),
          0.12 + k * 0.06,
        );
    } else if (e.id === "spark") {
      ribbon(
        (p) => (Math.sin((p.d / size) * 8) > 0 ? size * 0.28 : -size * 0.28),
        size * 0.085,
        0.95,
      );
      ribbon(() => 0, size * 0.45, 0.13);
    } else if (e.id === "warm") {
      for (let k = 0; k < 3; k++)
        ribbon(
          (p) => Math.sin((p.d / size) * 3 + k) * size * 0.25,
          size * (0.55 - k * 0.14),
          0.3 + k * 0.18,
        );
    } else if (e.id === "stone") {
      ribbon(() => 0, size * 0.65, 0.22);
    } else if (e.id === "shoot") {
      ribbon((p) => Math.sin(p.d / size) * size * 0.08, size * 0.07, 0.8);
    } else if (e.id === "sun") {
      ribbon(() => 0, size * 0.3, 0.17);
    } else if (e.id === "swirl") {
      ribbon((p) => Math.sin((p.d / size) * 3) * size * 0.2, size * 0.1, 0.7);
    } else if (e.id === "cold") {
      ribbon(() => 0, size * 0.06, 0.65);
    } else if (e.id === "bubbles") {
      ribbon(() => 0, size * 0.35, 0.1);
    }
    let last = -Infinity;
    for (let i = 0; i < samples.length; i++) {
      const p = samples[i];
      if (p.d - last < Math.max(size * 0.65, samples.at(-1).d / 48)) continue;
      last = p.d;
      if (e.id === "bubbles") {
        const r = size * (0.2 + (i % 3) * 0.09),
          offset = Math.sin(i * 2.4) * size * 0.25;
        path(
          stamp({ x: p.x + p.nx * offset, y: p.y + p.ny * offset }, r),
          e,
          size * 0.06,
          opacity * 0.8,
          layer,
        );
      } else if (e.id === "swirl") {
        const spiral = Array.from({ length: 33 }, (_, j) => {
          const a = (j / 32) * Math.PI * 3,
            r = (j / 32) * size * 0.45;
          return { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r };
        });
        path(spiral, e, size * 0.065, opacity * 0.8, layer);
      } else if (e.id === "cold" || e.id === "sun") {
        const rays = e.id === "cold" ? 6 : 8;
        for (let k = 0; k < rays; k++) {
          const a = (k / rays) * Math.PI * 2,
            r = size * (e.id === "sun" ? 0.38 : 0.32);
          path(
            [
              { x: p.x, y: p.y },
              { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r },
            ],
            e,
            size * 0.045,
            opacity * 0.8,
            layer,
          );
        }
      } else if (e.id === "feather" || e.id === "shoot") {
        for (const side of [-1, 1])
          path(
            [
              { x: p.x - p.ny * size * 0.15, y: p.y + p.nx * size * 0.15 },
              {
                x: p.x + p.nx * size * 0.4 * side + p.ny * size * 0.2,
                y: p.y + p.ny * size * 0.4 * side - p.nx * size * 0.2,
              },
            ],
            e,
            size * (e.id === "shoot" ? 0.1 : 0.035),
            opacity * 0.8,
            layer,
          );
      } else if (e.id === "stone") {
        path(
          stamp(p, size * (0.22 + (i % 4) * 0.035), 7, i),
          e,
          size * 0.23,
          opacity * 0.65,
          layer,
        );
      } else if (e.id === "warm") {
        path(
          [
            { x: p.x, y: p.y },
            { x: p.x + Math.sin(i) * size * 0.2, y: p.y - size * 0.65 },
            { x: p.x + size * 0.06, y: p.y - size * 0.28 },
          ],
          e,
          size * 0.14,
          opacity * 0.5,
          layer,
        );
      }
      // Reproducible satellite pigment, not repeated emoji images.
      const angle = i * 2.399 + layer * 0.7,
        radius = size * (0.35 + (i % 5) * 0.08);
      dots.push({
        x: p.x + Math.cos(angle) * radius,
        y: p.y + Math.sin(angle) * radius,
        size: size * 0.035,
        color: e.color,
        band: e.band,
        layer,
        opacity: opacity * 0.5,
      });
    }
    if (samples.length === 1)
      path(stamp(samples[0], size * 0.12), e, size * 0.2, opacity * 0.7, layer);
    {
      const p = points[Math.floor(points.length / 2)];
      const node = {
        id: `paint-${layer}`,
        emojiId: e.id,
        u: p.x + 0.5,
        v: p.y + 0.5,
        size: size * 2,
        opacity,
      };
      if (nodes.length < 24) nodes.push(node);
      geometryCache.set(stroke, {
        layer,
        paths: paths.slice(firstPath),
        dots: dots.slice(firstDot),
        node,
      });
    }
  }
  return { kind: "emoji-painting", strokes, paths, dots, nodes, links: [] };
}
