import { spatialBrushPoint } from "./spatialBrushFrame.js";
import { emojiById, SENSORY_EMOJIS } from "./sensoryEmojiCatalog.js";
export const MAX_PAINT_STROKES = 80,
  MAX_STROKE_POINTS = 256;
const cache = new WeakMap();
// Width, dry grain, ink fibres, lateral diffusion, pigment pooling. No figurative stamps.
export const PROJECTIVE_MATERIALS = [
  [1.1, 0.4, 1, 0.8, 0.5],
  [1.5, 0.2, 2, 1.2, 0.6],
  [0.9, 0.6, 2, 0.5, 0.9],
  [0.6, 0.7, 3, 0.3, 0.4],
  [1.2, 1, 1, 0.4, 0.8],
  [0.35, 0.9, 5, 0.5, 0.3],
  [2, 0.1, 1, 1.7, 0.3],
  [0.55, 0.8, 3, 0.8, 0.9],
  [1.4, 0.4, 2, 1, 0.7],
  [0.25, 0.8, 6, 0.3, 0.5],
  [1.15, 0.3, 3, 1.2, 0.65],
  [1.6, 0.5, 1, 0.9, 0.8],
];
const noise = (x, seed) =>
  Math.sin(x * 1.73 + seed) * 0.5 +
  Math.sin(x * 3.17 + seed * 2.3) * 0.28 +
  Math.sin(x * 7.13 - seed) * 0.13;
export function createEmojiPainting(strokes) {
  const paths = [],
    dots = [],
    nodes = [];
  for (const [layer, stroke] of strokes.slice(0, MAX_PAINT_STROKES).entries()) {
    const cached = cache.get(stroke);
    if (cached?.layer === layer) {
      paths.push(...cached.paths);
      dots.push(...cached.dots);
      if (nodes.length < 24) nodes.push(cached.node);
      continue;
    }
    const first = paths.length,
      firstDot = dots.length,
      e = emojiById(stroke.emojiId),
      index = SENSORY_EMOJIS.findIndex((item) => item.id === e.id),
      profile = PROJECTIVE_MATERIALS[index],
      source = stroke.points.slice(0, MAX_STROKE_POINTS);
    if (!source.length) continue;
    const size = stroke.size,
      opacity = stroke.opacity,
      phase = stroke.phase ?? layer,
      seed = index * 3.71 + phase * 1.37;
    const samples = [];
    let distance = 0;
    for (let i = 0; i < source.length; i++) {
      const a = source[Math.max(0, i - 1)],
        b = source[i],
        length = Math.hypot(b.x - a.x, b.y - a.y),
        steps = i
          ? Math.min(
              48,
              Math.max(1, Math.ceil(length / Math.max(0.002, size / 6))),
            )
          : 1;
      const dx = b.x - a.x,
        dy = b.y - a.y,
        len = length || 1;
      for (
        let j = i ? 1 : 0;
        j <= steps && (i || j === 0) && samples.length < 1024;
        j++
      ) {
        const t = i ? j / steps : 0;
        samples.push({
          x: a.x + dx * t,
          y: a.y + dy * t,
          nx: -dy / len,
          ny: length ? dx / len : 1,
          d: distance + length * t,
        });
      }
      distance += length;
    }
    function add(points, width, alpha, radii) {
      paths.push({
        points,
        color: e.color,
        band: e.band,
        width,
        opacity: opacity * alpha,
        layer,
        phase,
        emojiId: e.id,
        frame: stroke.frame,
        radii,
        material: profile,
      });
    }
    // An irregular connected wash, with pigment-rich edges and broken dry companion fibres.
    for (let pass = 0; pass < 2; pass++) {
      const points = samples.map((p) => {
        const n = noise(p.d * 19, seed + pass) * size * profile[3] * 0.12;
        return { x: p.x + p.nx * n, y: p.y + p.ny * n };
      });
      const radii = samples.map(
        (p) => 0.6 + 0.4 * (0.5 + 0.5 * noise(p.d * 35, seed + pass)),
      );
      add(
        points,
        size * profile[0] * (pass ? 0.38 : 0.95),
        pass ? 0.45 : 0.34,
        radii,
      );
      paths.at(-1).primary = pass === 0;
    }
    for (let k = 0; k < profile[2]; k++) {
      const offset = (k - (profile[2] - 1) / 2) * size * 0.12;
      add(
        samples.map((p) => {
          const drift = offset + noise(p.d * 37, seed + k) * size * 0.07;
          return { x: p.x + p.nx * drift, y: p.y + p.ny * drift };
        }),
        size * (0.018 + profile[1] * 0.025),
        0.5 + profile[1] * 0.2,
      );
    }
    let last = -Infinity;
    for (const [i, p] of samples.entries()) {
      if (p.d - last < Math.max(size * 0.55, distance / 48)) continue;
      last = p.d;
      const n = noise(i * 0.618, seed),
        angle = i * 2.399 + seed,
        r = size * (0.25 + profile[3] * 0.26) * (1 + n * 0.3);
      dots.push({
        x: p.x + Math.cos(angle) * r,
        y: p.y + Math.sin(angle) * r,
        size: size * (0.018 + 0.04 * profile[4] * (0.5 + 0.5 * n)),
        color: e.color,
        band: e.band,
        opacity: opacity * 0.45,
        layer,
        phase,
        frame: stroke.frame,
      });
      // Capillary stain: an incomplete, asymmetrical tide mark, not a repeating symbol.
      if (i % 3 === 0) {
        const points = [];
        for (let j = 0; j <= 18; j++) {
          const a = (j / 18) * Math.PI * (1.25 + n * 0.3),
            radius =
              size *
              (0.18 + profile[4] * 0.15) *
              (1 + noise(a * 3, seed + i) * 0.22);
          points.push({
            x: p.x + Math.cos(a + angle) * radius,
            y: p.y + Math.sin(a + angle) * radius * 0.6,
          });
        }
        add(points, size * 0.024, 0.24);
      }
    }
    if (samples.length === 1) {
      const p = samples[0];
      add(
        [
          { x: p.x - size * 0.05, y: p.y },
          { x: p.x + size * 0.05, y: p.y },
        ],
        size * profile[0],
        0.5,
      );
    }
    const p = source[Math.floor(source.length / 2)],
      node = {
        id: `paint-${layer}`,
        emojiId: e.id,
        u: p.x + 0.5,
        v: p.y + 0.5,
        size: size * 2,
        opacity,
      };
    if (stroke.frame) node.worldPosition = spatialBrushPoint(p, stroke.frame);
    if (nodes.length < 24) nodes.push(node);
    cache.set(stroke, {
      layer,
      paths: paths.slice(first),
      dots: dots.slice(firstDot),
      node,
    });
  }
  return { kind: "emoji-painting", strokes, paths, dots, nodes, links: [] };
}
