import { createPigmentPlate } from "../chill/createPigmentPlate.js";
export const PROJECTIVE_TOOLS = [
  ["watercolor", "Lavis", "≋"],
  ["dry", "Pigments secs", "▧"],
  ["ink", "Encre", "〰"],
  ["splatch", "Taches", "◌"],
  ["eraser", "Gomme", "▱"],
];
/** A connected irregular wash, grouped opacity, dry mineral tooth and tide edges. */
export function createProjectivePigment(width, height) {
  const layer = document.createElement("canvas");
  layer.width = width;
  layer.height = height;
  const c = layer.getContext("2d"),
    cache = new Map();
  function texture(a) {
    const kind =
        a.tool === "dry" ? "mineral" : a.tool === "splatch" ? "bloom" : "wash",
      key = `${kind}:${a.color}:${a.variant}`;
    if (cache.has(key)) return cache.get(key);
    const map = createPigmentPlate(
        kind,
        8341 + a.variant * 953,
        256,
        true,
        a.tool === "dry",
      ),
      ctx = map.getContext("2d"),
      image = ctx.getImageData(0, 0, 256, 256);
    const rgb = a.color
      .slice(1)
      .match(/../g)
      .map((v) => parseInt(v, 16));
    for (let i = 0; i < image.data.length; i += 4) {
      const load = image.data[i] / 255,
        tooth = image.data[i + 1] / 255,
        tide = image.data[i + 2] / 255;
      for (let k = 0; k < 3; k++)
        image.data[i + k] = Math.min(
          255,
          rgb[k] * (1.2 - load * 0.67 - tide * 0.3),
        );
      // The outline already clips the wash: tile edges must not punch periodic holes.
      image.data[i + 3] =
        255 *
        (a.tool === "dry" ? 0.13 + 0.75 * tooth * load : 0.4 + 0.6 * load);
    }
    ctx.putImageData(image, 0, 0);
    if (cache.size >= 24) cache.delete(cache.keys().next().value);
    cache.set(key, map);
    return map;
  }
  const noise = (d, s) =>
    Math.sin(d * 0.067 + s) * 0.55 +
    Math.sin(d * 0.173 + s * 2.3) * 0.28 +
    Math.sin(d * 0.61 - s) * 0.14;
  return {
    render(ctx, a) {
      c.clearRect(0, 0, width, height);
      c.save();
      c.lineCap = c.lineJoin = "round";
      c.strokeStyle = c.fillStyle = a.color;
      const seed = a.variant * 1.713,
        size = a.size;
      const points = [];
      let totalLength = 0;
      for (let i = 1; i < a.points.length; i++)
        totalLength += Math.hypot(
          a.points[i].x - a.points[i - 1].x,
          a.points[i].y - a.points[i - 1].y,
        );
      const samplingStep = Math.max(3, totalLength / 2048);
      for (let i = 0; i < a.points.length; i++) {
        const p = a.points[i],
          prev = a.points[Math.max(0, i - 1)],
          distance = Math.hypot(p.x - prev.x, p.y - prev.y);
        if (i && distance < 0.2) continue;
        const steps = i ? Math.max(1, Math.ceil(distance / samplingStep)) : 1;
        for (let j = i ? 1 : 0; j <= steps && (i || j === 0); j++)
          points.push({
            x: prev.x + (p.x - prev.x) * (i ? j / steps : 0),
            y: prev.y + (p.y - prev.y) * (i ? j / steps : 0),
          });
      }
      const first = points[0];
      if (a.tool === "ink") {
        c.beginPath();
        c.moveTo(first.x, first.y);
        for (let i = 1; i < points.length; i++) {
          const p = points[i - 1],
            q = points[i];
          c.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
        }
        const last = points.at(-1);
        c.lineTo(last.x + 0.01, last.y);
        c.lineWidth = Math.max(0.8, size * 0.085);
        c.stroke();
      } else {
        const outline = [];
        let distance = 0;
        for (let i = 0; i < points.length; i++) {
          const p = points[i],
            prev = points[Math.max(0, i - 1)],
            next = points[Math.min(points.length - 1, i + 1)];
          distance += Math.hypot(p.x - prev.x, p.y - prev.y);
          const dx = next.x - prev.x,
            dy = next.y - prev.y,
            len = Math.hypot(dx, dy) || 1;
          const r =
            size *
            (0.58 + noise(distance, seed) * 0.22) *
            (a.tool === "dry" ? 0.72 : 1);
          outline.push({
            x: p.x,
            y: p.y,
            nx: len === 1 && dx === 0 && dy === 0 ? 1 : -dy / len,
            ny: dx / len,
            r,
          });
        }
        c.beginPath();
        if (
          a.tool === "splatch" ||
          Math.hypot(points.at(-1).x - first.x, points.at(-1).y - first.y) < 2
        ) {
          const center = points.at(-1);
          for (let j = 0; j < 64; j++) {
            const angle = (j / 64) * Math.PI * 2,
              r = size * (1.35 + noise(j * 2, seed) * 0.43),
              x = center.x + Math.cos(angle) * r,
              y = center.y + Math.sin(angle) * r * 0.8;
            if (j) c.lineTo(x, y);
            else c.moveTo(x, y);
          }
        } else {
          for (let i = 0; i < outline.length; i++) {
            const p = outline[i];
            if (i) c.lineTo(p.x + p.nx * p.r, p.y + p.ny * p.r);
            else c.moveTo(p.x + p.nx * p.r, p.y + p.ny * p.r);
          }
          for (let i = outline.length - 1; i >= 0; i--) {
            const p = outline[i];
            c.lineTo(p.x - p.nx * p.r, p.y - p.ny * p.r);
          }
        }
        c.closePath();
        c.fillStyle = a.color;
        c.globalAlpha = a.tool === "dry" ? 0.05 : 0.14;
        c.fill();
        c.globalAlpha = 1;
        const pattern = c.createPattern(texture(a), "repeat");
        pattern.setTransform(
          new DOMMatrix()
            .translate(seed * 47, seed * 31)
            .rotate(23 + seed * 13)
            .scale(0.83),
        );
        c.fillStyle = pattern;
        c.fill();
        // Pigment accumulates against the irregular water line; no smooth digital rim.
        c.strokeStyle = a.color;
        c.globalAlpha = 0.23;
        c.lineWidth = 0.8;
        c.setLineDash([2 + (seed % 4), 3]);
        c.stroke();
        c.setLineDash([]);
        c.globalAlpha = 1;
      }
      // Sparse ink specks and capillary tide marks retain spaces of untouched paper.
      c.fillStyle = c.strokeStyle = a.color;
      const spacing = a.tool === "ink" ? 31 : 19;
      for (let i = 0; i < points.length; i += spacing) {
        const p = points[i],
          n = noise(i * 0.8, seed),
          angle = i * 2.399 + seed,
          r = size * (0.45 + n * 0.18);
        c.globalAlpha = 0.28;
        c.beginPath();
        c.ellipse(
          p.x + Math.cos(angle) * r,
          p.y + Math.sin(angle) * r,
          Math.max(0.6, size * 0.035),
          Math.max(0.4, size * 0.02),
          angle,
          0,
          Math.PI * 2,
        );
        c.fill();
        if (a.tool !== "ink") {
          c.globalAlpha = 0.2;
          c.lineWidth = 0.6;
          c.beginPath();
          c.ellipse(
            p.x,
            p.y,
            size * (0.25 + n * 0.06),
            size * 0.16,
            angle,
            0.3,
            Math.PI * 1.5,
          );
          c.stroke();
        }
      }
      c.restore();
      ctx.save();
      ctx.globalAlpha = a.opacity;
      ctx.drawImage(layer, 0, 0);
      ctx.restore();
    },
    dispose() {
      cache.clear();
      layer.width = layer.height = 1;
    },
  };
}
