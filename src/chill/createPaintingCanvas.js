import { createPigmentPlate } from "./createPigmentPlate.js";
import { WORKSHOP_BRUSHES, DEFAULT_WORKSHOP_BRUSH } from "./workshopBrushes.js";

/** Vector strokes are the source; the paper is only a reproducible raster preview. */
export function createPaintingCanvas(container, onChange = () => {}) {
  const canvas = document.createElement("canvas");
  canvas.className = "painting-paper";
  canvas.setAttribute("aria-label", "Tableau aquarelle 2D");
  const width = innerWidth,
    height = innerHeight,
    ratio = Math.min(devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  container.append(canvas);
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  const strokes = [],
    cache = new Map();
  let active = null,
    config = {
      brush: DEFAULT_WORKSHOP_BRUSH.id,
      color: DEFAULT_WORKSHOP_BRUSH.color,
      size: 18,
      opacity: 0.9,
    },
    enabled = true;
  const hash = (n) => {
    let h = Math.imul(n + 123, 374761393);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  function stamp(brush, color) {
    const key = brush.id + color;
    if (cache.has(key)) return cache.get(key);
    const image = createPigmentPlate(brush.textureKind, brush.seed, 128, false),
      c = image.getContext("2d"),
      data = c.getImageData(0, 0, 128, 128);
    const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
    for (let k = 0; k < data.data.length; k += 4) {
      const load = data.data[k] / 255,
        tide = data.data[k + 2] / 255;
      for (let j = 0; j < 3; j++)
        data.data[k + j] = rgb[j] * (1.1 - load * 0.45 - tide * 0.3);
    }
    c.putImageData(data, 0, 0);
    cache.set(key, image);
    if (cache.size > 16) cache.delete(cache.keys().next().value);
    return image;
  }
  function dot(stroke, p, index) {
    const brush =
      WORKSHOP_BRUSHES.find((b) => b.id === stroke.brush) ||
      DEFAULT_WORKSHOP_BRUSH;
    const base = stroke.size * Math.min(width, height),
      x = p.u * width,
      y = p.v * height;
    const n = index + stroke.seed,
      texture = stamp(brush, stroke.color);
    ctx.globalAlpha = stroke.opacity;
    if (brush.id === "lucioles") {
      if (index % 3) return;
      for (let i = 0; i < 3; i++) {
        const r = n * 7 + i * 31;
        ctx.save();
        ctx.translate(
          x + (hash(r) - 0.5) * base * 1.6,
          y + (hash(r + 1) - 0.5) * base * 1.6,
        );
        ctx.rotate(hash(r + 2) * 6.28);
        const s = base * (0.12 + hash(r + 3) * 0.18);
        ctx.drawImage(texture, -s / 2, -s / 2, s, s);
        ctx.restore();
      }
    } else {
      if (brush.id === "lagons" && index % 5) return;
      const s =
        base *
        (brush.id === "calligraphie" ? 0.28 : brush.id === "lagons" ? 1.3 : 1);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((hash(n) - 0.5) * 0.7);
      ctx.drawImage(texture, -s / 2, -s / 2, s, s);
      ctx.restore();
    }
  }
  function segment(stroke, a, b, index) {
    const distance = Math.hypot((b.u - a.u) * width, (b.v - a.v) * height),
      step = Math.max(1, stroke.size * Math.min(width, height) * 0.16),
      count = Math.max(1, Math.ceil(distance / step));
    for (let i = 1; i <= count; i++) {
      dot(
        stroke,
        {
          u: a.u + ((b.u - a.u) * i) / count,
          v: a.v + ((b.v - a.v) * i) / count,
        },
        index.value++,
      );
    }
  }
  function redraw() {
    ctx.clearRect(0, 0, width, height);
    for (const s of strokes) {
      const index = { value: 0 };
      dot(s, s.points[0], index.value++);
      for (let i = 1; i < s.points.length; i++)
        segment(s, s.points[i - 1], s.points[i], index);
    }
  }
  function point(e) {
    const r = canvas.getBoundingClientRect(),
      scale = Math.min(r.width / width, r.height / height);
    return {
      u: Math.max(
        0,
        Math.min(
          1,
          (e.clientX - r.left - (r.width - width * scale) / 2) /
            (width * scale),
        ),
      ),
      v: Math.max(
        0,
        Math.min(
          1,
          (e.clientY - r.top - (r.height - height * scale) / 2) /
            (height * scale),
        ),
      ),
    };
  }
  function end() {
    if (!active) return;
    active = null;
    onChange(strokes.length);
    canvas.dataset.strokeCount = String(strokes.length);
  }
  const down = (e) => {
    if (!enabled || !e.isPrimary || e.button > 0) return;
    const p = point(e);
    const stroke = {
      ...config,
      size: config.size / Math.min(width, height),
      seed: strokes.length * 971 + 811,
      points: [p],
    };
    strokes.push(stroke);
    active = { id: e.pointerId, stroke, index: { value: 1 } };
    dot(stroke, p, 0);
    canvas.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    if (!active || e.pointerId !== active.id) return;
    for (const event of e.getCoalescedEvents?.().length
      ? e.getCoalescedEvents()
      : [e]) {
      const p = point(event),
        last = active.stroke.points.at(-1);
      if (Math.hypot(p.u - last.u, p.v - last.v) < 0.0005) continue;
      active.stroke.points.push(p);
      segment(active.stroke, last, p, active.index);
    }
  };
  const up = (e) => {
    if (active?.id === e.pointerId) end();
  };
  const listeners = [
    ["pointerdown", down],
    ["pointermove", move],
    ["pointerup", up],
    ["pointercancel", up],
    ["lostpointercapture", up],
  ];
  for (const [name, fn] of listeners) canvas.addEventListener(name, fn);
  return {
    canvas,
    setConfig(next) {
      config = { ...config, ...next };
    },
    setVisible(value) {
      end();
      canvas.hidden = !value;
    },
    setEnabled(value) {
      enabled = value;
      if (!value) end();
    },
    getDocument() {
      end();
      return { width, height, strokes: JSON.parse(JSON.stringify(strokes)) };
    },
    undo() {
      end();
      strokes.pop();
      redraw();
      onChange(strokes.length);
      canvas.dataset.strokeCount = String(strokes.length);
    },
    clear() {
      end();
      strokes.length = 0;
      canvas.dataset.strokeCount = "0";
      redraw();
      onChange(0);
    },
    dispose() {
      for (const [n, f] of listeners) canvas.removeEventListener(n, f);
      cache.clear();
      canvas.remove();
    },
  };
}
