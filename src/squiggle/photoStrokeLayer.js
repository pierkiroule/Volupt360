import { pigmentAtlas, PIGMENT_CELL } from "./pigmentAtlas.js";
import { SQUIGGLE_BRUSHES } from "./brushes.js";
const families = new Map(SQUIGGLE_BRUSHES.map((b, i) => [b.id, i]));
/** Coherent photograph within a pigment silhouette, cached outside animation. */
export function createPhotoStrokeLayer({ mobile = false } = {}) {
  const resolution = mobile ? 512 : 768,
    scale = resolution / 768;
  const make = () => {
    const c = document.createElement("canvas");
    c.width = c.height = resolution;
    return c;
  };
  let base = null,
    work = null,
    layer = null,
    photos = null,
    prefix = [];
  const clear = (ctx) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, resolution, resolution);
  };
  function render(target, stroke) {
    if (!stroke.points.length) return;
    const ctx = work.getContext("2d");
    clear(ctx);
    ctx.scale(scale, scale);
    const tile = (families.get(stroke.emotionId) ?? 0) % 4,
      size = stroke.size * 1.55;
    let minX = 768,
      minY = 768,
      maxX = 0,
      maxY = 0;
    const atlas = pigmentAtlas();
    const stamp = (x, y) => {
      minX = Math.min(minX, x - size / 2);
      minY = Math.min(minY, y - size / 2);
      maxX = Math.max(maxX, x + size / 2);
      maxY = Math.max(maxY, y + size / 2);
      ctx.drawImage(
        atlas,
        tile * PIGMENT_CELL,
        0,
        PIGMENT_CELL,
        PIGMENT_CELL,
        x - size / 2,
        y - size / 2,
        size,
        size,
      );
    };
    let previous = stroke.points[0];
    stamp(previous.x * 768, previous.y * 768);
    // Arc-length stamping, independent from the density of pointer events.
    let carry = 0;
    const spacing = Math.max(3, stroke.size * 0.16);
    for (let i = 1; i < stroke.points.length; i++) {
      const p = stroke.points[i],
        dx = (p.x - previous.x) * 768,
        dy = (p.y - previous.y) * 768,
        length = Math.hypot(dx, dy);
      let distance = spacing - carry;
      while (distance <= length) {
        stamp(
          previous.x * 768 + (dx * distance) / length,
          previous.y * 768 + (dy * distance) / length,
        );
        distance += spacing;
      }
      carry = (carry + length) % spacing;
      previous = p;
    }
    const w = Math.max(size, maxX - minX),
      h = Math.max(size, maxY - minY),
      edge = Math.max(w, h);
    ctx.globalCompositeOperation = "source-in";
    ctx.drawImage(
      photos.canvas,
      tile * 256,
      0,
      256,
      256,
      minX - (edge - w) / 2,
      minY - (edge - h) / 2,
      edge,
      edge,
    );
    ctx.globalCompositeOperation = "source-atop";
    ctx.globalAlpha = 0.13;
    ctx.fillStyle = stroke.color || "#54899a";
    ctx.fillRect(minX, minY, w, h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    const out = target.getContext("2d");
    out.save();
    out.globalAlpha = stroke.opacity * 0.92;
    out.drawImage(work, 0, 0);
    out.restore();
  }
  return {
    setPhotoMatter(value) {
      photos = value;
      prefix = [];
      if (base) clear(base.getContext("2d"));
    },
    setDocument(strokes) {
      if (!photos) return;
      if (!base) {
        base = make();
        work = make();
        layer = make();
      }
      const stable = strokes.slice(0, -1);
      if (
        prefix.length <= stable.length &&
        prefix.every((s, i) => s === stable[i])
      ) {
        for (let i = prefix.length; i < stable.length; i++)
          render(base, stable[i]);
      } else {
        clear(base.getContext("2d"));
        for (const s of stable) render(base, s);
      }
      prefix = stable;
      const ctx = layer.getContext("2d");
      clear(ctx);
      ctx.drawImage(base, 0, 0);
      if (strokes.length) render(layer, strokes.at(-1));
    },
    draw(ctx) {
      if (photos && layer) ctx.drawImage(layer, 0, 0, 768, 768);
    },
    dispose() {
      for (const c of [base, work, layer]) if (c) c.width = 1;
      base = work = layer = null;
      prefix = [];
      photos = null;
    },
  };
}
