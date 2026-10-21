import { SQUIGGLE_BRUSHES } from "./brushes.js";
export const OBJECT_SIZE = 768;
export function objectProfile(item) {
  const family = Math.max(
    0,
    SQUIGGLE_BRUSHES.findIndex((b) => b.id === item.emotionId),
  );
  const seed = item.id * 1.731 + family * 2.37;
  return {
    family,
    seed,
    stretch: [
      [1, 0.82],
      [0.72, 1.25],
      [1.25, 0.65],
      [1, 1],
      [0.8, 1.12],
      [1.14, 0.82],
      [0.68, 1.2],
      [1.2, 0.85],
    ][family],
  };
}
export function objectRadius(theta, phi, seed, family) {
  return (
    1 +
    0.1 * Math.sin(theta * (3 + (family % 3)) + seed) * Math.sin(phi) ** 2 +
    0.05 * Math.sin(phi * 7 + theta * 2 + seed)
  );
}
/** CPU-generated once per object: shared color surface and shaded 2.5D thumbnail. */
export function createObjectMatter(item, source) {
  const n = 256,
    { family, seed, stretch } = objectProfile(item);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = n;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (source) ctx.drawImage(source.canvas, 0, 0, n, n);
  const photo = ctx.getImageData(0, 0, n, n).data;
  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = colorCanvas.height = 1;
  const cc = colorCanvas.getContext("2d");
  cc.fillStyle = item.color;
  cc.fillRect(0, 0, 1, 1);
  const rgb = cc.getImageData(0, 0, 1, 1).data;
  const pixels = ctx.createImageData(n, n);
  const hash = (x, y) => {
    const v = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
    return v - Math.floor(v);
  };
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4,
        u = x / n,
        v = y / n;
      const flow = Math.sin(u * 32 + Math.sin(v * 19 + seed) * 2 + seed);
      const fissure = Math.abs(
        Math.sin(u * 48 + Math.sin(v * 13 + seed) * 3 + seed),
      );
      const grain = hash(x, y),
        coarse = hash(Math.floor(x / 4), Math.floor(y / 4));
      const sample = source
        ? (photo[i] + photo[i + 1] + photo[i + 2]) / 765
        : 0.5;
      const erosion = grain < 0.065 || (coarse < 0.1 && grain < 0.5);
      const shade =
        (fissure < 0.065 ? 0.18 : 0.48 + 0.28 * flow + 0.27 * sample) *
        (erosion ? 0.35 : 0.85 + grain * 0.3);
      const edge = fissure > 0.065 && fissure < 0.1 ? 0.36 : 0;
      for (let c = 0; c < 3; c++)
        pixels.data[i + c] = Math.min(255, rgb[c] * shade + edge * 220);
      pixels.data[i + 3] = 255;
    }
  ctx.putImageData(pixels, 0, 0);
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = n;
  const sc = sprite.getContext("2d"),
    image = sc.createImageData(n, n);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const px = ((x / n - 0.5) * 2.65) / stretch[0],
        py = ((0.5 - y / n) * 2.65) / stretch[1];
      const angle = Math.atan2(py, px);
      const boundary = objectRadius(angle, Math.PI / 2, seed, family);
      const r = Math.hypot(px, py) / boundary;
      if (r >= 1) continue;
      const z = Math.sqrt(1 - r * r),
        nx = px / boundary,
        ny = py / boundary;
      const u = 0.5 + Math.atan2(nx, z) / (2 * Math.PI),
        v = Math.acos(Math.max(-1, Math.min(1, ny))) / Math.PI;
      const sample =
        (Math.min(n - 1, Math.floor(v * n)) * n +
          Math.min(n - 1, Math.floor(u * n))) *
        4;
      const i = (y * n + x) * 4,
        light = 0.4 + 0.7 * Math.max(0, -nx * 0.4 + ny * 0.5 + z * 0.7),
        rim = Math.pow(1 - z, 2) * 0.38;
      for (let c = 0; c < 3; c++)
        image.data[i + c] = Math.min(
          255,
          pixels.data[sample + c] * light + rgb[c] * rim,
        );
      image.data[i + 3] = Math.min(1, (1 - r) * 60) * 255;
    }
  sc.putImageData(image, 0, 0);
  return {
    canvas,
    sprite,
    dispose() {
      canvas.width = sprite.width = 1;
    },
  };
}
export function createObjectPainter() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = OBJECT_SIZE;
  const ctx = canvas.getContext("2d"),
    entries = new Map();
  let items = [],
    materials = {};
  function sync() {
    const ids = new Set(items.map((s) => s.id));
    for (const [id, entry] of entries)
      if (!ids.has(id)) {
        entry.matter.dispose();
        entries.delete(id);
      }
    for (const item of items) {
      const key = [item.emotionId, item.color].join(":");
      if (entries.get(item.id)?.key !== key) {
        entries.get(item.id)?.matter.dispose();
        entries.set(item.id, {
          key,
          matter: createObjectMatter(item, materials[item.emotionId]),
        });
      }
    }
  }
  function draw(time = 0) {
    ctx.clearRect(0, 0, OBJECT_SIZE, OBJECT_SIZE);
    for (const item of items) {
      const p = item.points.at(-1);
      if (!p) continue;
      const { seed } = objectProfile(item),
        size = item.size * 2.4;
      ctx.save();
      ctx.translate(p.x * OBJECT_SIZE, p.y * OBJECT_SIZE);
      ctx.rotate(Math.sin(time * 0.15 + seed) * 0.065);
      ctx.globalAlpha = item.opacity;
      ctx.drawImage(
        entries.get(item.id).matter.sprite,
        -size / 2,
        -size / 2,
        size,
        size,
      );
      ctx.restore();
    }
  }
  return {
    canvas,
    draw,
    setDocument(value) {
      items = value;
      sync();
      draw();
    },
    setMaterials(value) {
      materials = value;
      for (const e of entries.values()) e.matter.dispose();
      entries.clear();
      sync();
      draw();
    },
    dispose() {
      for (const e of entries.values()) e.matter.dispose();
      entries.clear();
      canvas.width = 1;
    },
  };
}
