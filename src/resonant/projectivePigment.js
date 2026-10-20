export const PROJECTIVE_TOOLS = [
  ["watercolor", "Lavis", "≋"],
  ["dry", "Pigments secs", "▧"],
  ["ink", "Encre", "〰"],
  ["splatch", "Taches", "◌"],
  ["eraser", "Gomme", "▱"],
];
const clamp = (x) => Math.max(0, Math.min(1, x));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** Seeded wet-on-paper tips. No repeated rectangular texture or polygonal silhouette. */
export function createProjectivePigment(width, height) {
  const layer = document.createElement("canvas");
  layer.width = width;
  layer.height = height;
  const c = layer.getContext("2d"),
    cache = new Map(),
    resolution = 192;
  function tips(a) {
    const kind =
        a.tool === "dry" ? "dry" : a.tool === "splatch" ? "bloom" : "wash",
      key = `${kind}:${a.color}:${a.variant % 4}`;
    if (cache.has(key)) return cache.get(key);
    const rgb = a.color
      .slice(1)
      .match(/../g)
      .map((v) => parseInt(v, 16));
    const maps = Array.from({ length: 3 }, (_, tip) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = resolution;
      const ctx = canvas.getContext("2d"),
        image = ctx.createImageData(resolution, resolution),
        seed = (a.variant % 4) * 97 + tip * 349 + 7919;
      const hash = (x, y) => {
        let n = Math.imul(x + seed, 374761393) ^ Math.imul(y, 668265263);
        n = Math.imul(n ^ (n >>> 13), 1274126177);
        return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
      };
      const noise = (x, y, scale) => {
        const xx = x * scale,
          yy = y * scale,
          ix = Math.floor(xx),
          iy = Math.floor(yy),
          u = smooth(0, 1, xx - ix),
          v = smooth(0, 1, yy - iy);
        return (
          (hash(ix, iy) * (1 - u) + hash(ix + 1, iy) * u) * (1 - v) +
          (hash(ix, iy + 1) * (1 - u) + hash(ix + 1, iy + 1) * u) * v
        );
      };
      for (let y = 0; y < resolution; y++)
        for (let x = 0; x < resolution; x++) {
          const u = x / (resolution - 1),
            v = y / (resolution - 1),
            px = (u - 0.5) * 2,
            py = (v - 0.5) * 2,
            angle = Math.atan2(py, px),
            r = Math.hypot(px, py);
          const cloud = noise(u, v, 5),
            mineral = noise(u, v, 21),
            tooth = noise(u, v, 87),
            fine = hash(x, y);
          const edge =
            0.76 +
            Math.sin(angle * 3 + tip) * 0.055 +
            Math.sin(angle * 5 + seed) * 0.035 +
            (cloud - 0.5) * 0.12;
          const body = 1 - smooth(edge - 0.12, edge + 0.025, r),
            rim = Math.exp(-Math.pow((r - edge + 0.055) / 0.028, 2));
          const bloom = Math.exp(-Math.pow((cloud - 0.5) / 0.035, 2)) * mineral;
          let density =
            0.27 +
            cloud * 0.31 +
            mineral * 0.12 +
            rim * 0.25 +
            bloom * (kind === "bloom" ? 0.25 : 0.07);
          let coverage =
            body *
            (0.55 + cloud * 0.35) *
            (kind === "dry"
              ? 0.2 + smooth(0.26, 0.72, tooth * 0.6 + fine * 0.4) * 0.8
              : 1);
          // Tiny paper reserves and sediment clusters, never high-contrast television noise.
          coverage *= 1 - smooth(0.79, 0.96, tooth) * 0.55;
          const k = (y * resolution + x) * 4,
            shade = 1.1 - density * 0.43 - rim * 0.15;
          for (let ch = 0; ch < 3; ch++)
            image.data[k + ch] = Math.min(
              255,
              rgb[ch] * shade + (1 - cloud) * (ch === 0 ? 5 : 2),
            );
          image.data[k + 3] = Math.round(clamp(coverage) * 255);
        }
      ctx.putImageData(image, 0, 0);
      return canvas;
    });
    if (cache.size >= 16) cache.delete(cache.keys().next().value);
    cache.set(key, maps);
    return maps;
  }
  function resample(source, spacing) {
    const out = [{ ...source[0], d: 0 }],
      total = source
        .slice(1)
        .reduce(
          (s, p, i) => s + Math.hypot(p.x - source[i].x, p.y - source[i].y),
          0,
        ),
      step = Math.max(spacing, total / 1500);
    let walked = 0,
      next = step;
    for (let i = 1; i < source.length; i++) {
      const a = source[i - 1],
        b = source[i],
        length = Math.hypot(b.x - a.x, b.y - a.y);
      while (length && next <= walked + length) {
        const t = (next - walked) / length;
        out.push({
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
          d: next,
        });
        next += step;
      }
      walked += length;
    }
    if (walked) out.push({ ...source.at(-1), d: walked });
    return out;
  }
  function stamp(map, x, y, size, angle, alpha) {
    c.save();
    c.translate(x, y);
    c.rotate(angle);
    c.globalAlpha = alpha;
    c.drawImage(map, -size / 2, -size / 2, size, size);
    c.restore();
  }
  return {
    render(ctx, a) {
      c.clearRect(0, 0, width, height);
      c.save();
      c.lineCap = c.lineJoin = "round";
      const seed = a.variant * 2.399,
        size = a.size,
        points = resample(
          a.points,
          Math.max(1.2, size * (a.tool === "ink" ? 0.035 : 0.085)),
        );
      if (a.tool === "ink") {
        c.strokeStyle = a.color;
        if (points.length === 1) {
          c.fillStyle = a.color;
          c.beginPath();
          c.arc(
            points[0].x,
            points[0].y,
            Math.max(0.7, size * 0.04),
            0,
            Math.PI * 2,
          );
          c.fill();
        }
        for (let i = 1; i < points.length; i++) {
          const p = points[i - 1],
            q = points[i];
          c.lineWidth = Math.max(
            0.7,
            size * (0.032 + 0.023 * (0.5 + 0.5 * Math.sin(q.d * 0.018 + seed))),
          );
          c.globalAlpha = 0.88;
          c.beginPath();
          c.moveTo(p.x, p.y);
          c.lineTo(q.x, q.y);
          c.stroke();
        }
      } else {
        const maps = tips(a);
        if (a.tool === "splatch") {
          const p = points.at(-1);
          stamp(maps[0], p.x, p.y, size * 3.3, seed, 0.72);
          stamp(
            maps[1],
            p.x + size * 0.18,
            p.y - size * 0.1,
            size * 2.45,
            seed + 0.8,
            0.32,
          );
          for (let i = 0; i < 8; i++) {
            const angle = i * 2.399 + seed,
              r = size * (1.1 + ((i * 7) % 11) * 0.075);
            stamp(
              maps[i % 3],
              p.x + Math.cos(angle) * r,
              p.y + Math.sin(angle) * r,
              size * (0.055 + ((i * 3) % 7) * 0.025),
              angle,
              0.5,
            );
          }
        } else {
          for (let i = 0; i < points.length; i++) {
            const p = points[i],
              variation =
                0.94 +
                Math.sin(p.d * 0.019 + seed) * 0.09 +
                Math.sin(p.d * 0.043 + seed * 0.7) * 0.045;
            stamp(
              maps[i % 3],
              p.x,
              p.y,
              size * 1.65 * variation,
              seed + i * 2.399 + Math.sin(p.d * 0.015) * 0.3,
              a.tool === "dry" ? 0.17 : 0.12,
            );
          }
          // One pale backrun near a pause, with an off-centre mineral deposit.
          if (points.length > 4) {
            const p = points[Math.floor(points.length * 0.67)];
            stamp(
              maps[2],
              p.x + size * 0.12,
              p.y - size * 0.08,
              size * 1.5,
              seed + 1,
              0.12,
            );
          }
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
