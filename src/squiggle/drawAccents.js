import { createPhotoStrokeLayer } from "./photoStrokeLayer.js";
import { pigmentAtlas, PIGMENT_CELL } from "./pigmentAtlas.js";
import { SQUIGGLE_BRUSHES } from "./brushes.js";
const families = new Map(SQUIGGLE_BRUSHES.map((b, i) => [b.id, i]));
/** Precomputed anchors, bounded tinted masks, no figurative marks. */
export function createWatercolorMotion({ mobile = false } = {}) {
  const atlas = pigmentAtlas(),
    masks = new Map(),
    photoLayer = createPhotoStrokeLayer({ mobile });
  let anchors = [],
    photos = null,
    strokesDoc = [];
  function tinted(color) {
    if (masks.has(color)) return masks.get(color);
    const c = document.createElement("canvas");
    c.width = atlas.width;
    c.height = atlas.height;
    const ctx = c.getContext("2d");

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, c.width, c.height);
    if (photos) {
      ctx.globalCompositeOperation = "soft-light";
      ctx.globalAlpha = 0.7;
      ctx.drawImage(photos.canvas, 0, 0, c.width, c.height);
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = 0.2;
      ctx.drawImage(photos.canvas, 0, 0, c.width, c.height);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(atlas, 0, 0);
    if (masks.size >= 12) {
      const key = masks.keys().next().value;
      masks.get(key).width = 1;
      masks.delete(key);
    }
    masks.set(color, c);
    return c;
  }
  return {
    setPhotoMatter(value) {
      photos = value;
      photoLayer.setPhotoMatter(value);
      for (const c of masks.values()) c.width = 1;
      masks.clear();
      this.setDocument(strokesDoc);
    },
    setDocument(strokes) {
      strokesDoc = strokes;
      photoLayer.setDocument(strokes);
      anchors = [];
      const capacity = mobile ? 600 : 1000;
      const per = Math.max(
        2,
        Math.floor(capacity / Math.max(1, strokes.length)),
      );
      for (const s of strokes) {
        if (!s.points.length) continue;
        const points = s.points,
          family = families.get(s.emotionId) ?? 0;
        let length = 0;
        for (let i = 1; i < points.length; i++)
          length +=
            Math.hypot(
              points[i].x - points[i - 1].x,
              points[i].y - points[i - 1].y,
            ) * 768;
        const count = Math.min(
          per,
          Math.max(1, Math.ceil(length / Math.max(5, s.size * 0.21))),
        );
        let segment = 1,
          walked = 0;
        for (let i = 0; i < count && anchors.length < capacity; i++) {
          const target = count === 1 ? 0 : (i / (count - 1)) * length;
          while (segment < points.length - 1) {
            const d =
              Math.hypot(
                points[segment].x - points[segment - 1].x,
                points[segment].y - points[segment - 1].y,
              ) * 768;
            if (walked + d >= target) break;
            walked += d;
            segment++;
          }
          const a = points[Math.max(0, segment - 1)],
            b = points[Math.min(points.length - 1, segment)];
          const distance = Math.hypot(b.x - a.x, b.y - a.y) * 768;
          const t = distance ? Math.min(1, (target - walked) / distance) : 0;
          anchors.push({
            x: (a.x + (b.x - a.x) * t) * 768,
            y: (a.y + (b.y - a.y) * t) * 768,
            angle: Math.atan2(b.y - a.y, b.x - a.x),
            seed: i * 2.399 + s.id * 7.13,
            size: s.size,
            opacity: s.opacity,
            mask: tinted(s.color || "#466c86"),
            family,
            tile: family % 4,
          });
        }
      }
    },
    draw(ctx, time) {
      photoLayer.draw(ctx);
      for (const a of anchors) {
        const phase = a.seed + time * (0.16 + a.family * 0.018);
        const drift = a.size * (0.035 + (a.family === 7 ? 0.055 : 0));
        const w = a.size * (1.05 + 0.12 * Math.sin(phase));
        ctx.save();
        ctx.translate(
          a.x + Math.sin(phase) * drift,
          a.y + Math.cos(phase * 0.73) * drift,
        );
        ctx.rotate(a.angle + Math.sin(phase * 0.7) * 0.18);
        ctx.globalAlpha =
          a.opacity * (photos ? 0.1 : a.family === 7 ? 0.2 : 0.34);
        ctx.drawImage(
          a.mask,
          a.tile * PIGMENT_CELL,
          0,
          PIGMENT_CELL,
          PIGMENT_CELL,
          -w * 0.6,
          -w * 0.42,
          w * 1.2,
          w * 0.84,
        );
        // Fine pigment dust follows a continuous orbit, never symbolic sprites.
        ctx.fillStyle = "#304b5d";
        ctx.globalAlpha = a.opacity * 0.35;
        for (let j = 0; j < 2; j++) {
          const p = phase + j * 3.1,
            r = a.size * (0.25 + 0.1 * Math.sin(a.seed));
          ctx.beginPath();
          ctx.ellipse(
            Math.cos(p) * r,
            Math.sin(p * 0.8) * r * 0.65,
            0.5 + (a.family % 3) * 0.22,
            0.6,
            p,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.restore();
      }
    },
    get stats() {
      return { anchors: anchors.length, masks: masks.size };
    },
    dispose() {
      photoLayer.dispose();
      for (const c of masks.values()) c.width = 1;
      masks.clear();
      anchors = [];
    },
  };
}
