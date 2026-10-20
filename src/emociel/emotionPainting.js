import { EMOTIONS } from "./skyModel.js";
import { createProjectivePigment } from "../resonant/projectivePigment.js";
export const DISK_SIZE = 768,
  MAX_EMOTION_STROKES = 120;
export const EMOTION_BRUSHES = EMOTIONS.map((e, index) => ({
  ...e,
  index,
  color: {
    anger: "#ce6236",
    sadness: "#253b69",
    joy: "#d4ae5b",
    worry: "#76678e",
    peace: "#619caa",
    confusion: "#9786aa",
    affection: "#bb789b",
    tiredness: "#7e8b9c",
    frustration: "#a87151",
    wonder: "#84a3b4",
    hope: "#74966f",
    uncertainty: "#a1adb0",
  }[e.id],
}));
export const brushFor = (id) =>
  EMOTION_BRUSHES.find((e) => e.id === id) || EMOTION_BRUSHES[0];
/** A disk is an azimuthal map: center zenith, rim nadir, every azimuth retained. */
export function diskUV(p) {
  const x = (p.x - 0.5) * 2,
    y = (p.y - 0.5) * 2;
  return {
    u: (((Math.atan2(y, x) / (2 * Math.PI)) % 1) + 1) % 1,
    v: 0.04 + Math.min(1, Math.hypot(x, y)) * 0.92,
  };
}
export function diskWorld(p, radius = 9) {
  const { u, v } = diskUV(p),
    a = u * Math.PI * 2,
    t = v * Math.PI;
  return [
    -Math.cos(a) * Math.sin(t) * radius,
    Math.cos(t) * radius,
    20 + Math.sin(a) * Math.sin(t) * radius,
  ];
}
export function strokeCenter(s) {
  const p = s.points;
  return p[Math.floor(p.length / 2)];
}
export function emotionalBridges(strokes) {
  const fire = strokes.filter(
      (s) => s.emotionId === "anger" || s.emotionId === "frustration",
    ),
    rain = strokes.filter(
      (s) => s.emotionId === "sadness" || s.emotionId === "worry",
    );
  const out = [];
  for (const a of fire.slice(-3)) {
    const p = strokeCenter(a);
    let nearest = null,
      d = Infinity;
    for (const b of rain) {
      const q = strokeCenter(b),
        distance = Math.hypot(q.x - p.x, q.y - p.y);
      if (distance > 0.06 && distance < d) {
        nearest = b;
        d = distance;
      }
    }
    if (nearest)
      out.push({ a: p, b: strokeCenter(nearest), seed: a.id * 0.73 });
  }
  return out;
}
export function createDiskPainter() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = DISK_SIZE;
  const ctx = canvas.getContext("2d"),
    pigment = createProjectivePigment(DISK_SIZE, DISK_SIZE);
  function stroke(s) {
    const b = brushFor(s.emotionId);
    ctx.save();
    ctx.beginPath();
    ctx.arc(DISK_SIZE / 2, DISK_SIZE / 2, DISK_SIZE / 2 - 1, 0, Math.PI * 2);
    ctx.clip();
    pigment.render(ctx, {
      tool: "watercolor",
      color: b.color,
      size: s.size,
      opacity: s.opacity,
      variant: s.id % 12,
      points: s.points.map((p) => ({ x: p.x * DISK_SIZE, y: p.y * DISK_SIZE })),
    });
    ctx.restore();
  }
  return {
    canvas,
    stroke,
    setDocument(strokes) {
      ctx.clearRect(0, 0, DISK_SIZE, DISK_SIZE);
      for (const s of strokes) stroke(s);
    },
    dispose() {
      pigment.dispose();
      canvas.width = 1;
    },
  };
}
export function projectDiskToSky(source) {
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = 768;
  const ctx = canvas.getContext("2d"),
    dst = ctx.createImageData(1536, 768),
    src = source
      .getContext("2d")
      .getImageData(0, 0, source.width, source.height).data;
  for (let y = 0; y < 768; y++) {
    const r = Math.max(0, Math.min(1, (y / 767 - 0.04) / 0.92));
    for (let x = 0; x < 1536; x++) {
      const angle = (x / 1535) * Math.PI * 2,
        sx = Math.min(
          source.width - 1,
          Math.max(
            0,
            Math.round((0.5 + Math.cos(angle) * r * 0.5) * (source.width - 1)),
          ),
        ),
        sy = Math.min(
          source.height - 1,
          Math.max(
            0,
            Math.round((0.5 + Math.sin(angle) * r * 0.5) * (source.height - 1)),
          ),
        ),
        a = (sy * source.width + sx) * 4,
        b = (y * 1536 + x) * 4;
      dst.data[b] = src[a];
      dst.data[b + 1] = src[a + 1];
      dst.data[b + 2] = src[a + 2];
      dst.data[b + 3] = src[a + 3];
    }
  }
  ctx.putImageData(dst, 0, 0);
  return canvas;
}
/** Symbols are never stamped: these are metaphorical material effects along gestures. */
export function drawEmotionLife(ctx, strokes, time, reduced = false) {
  for (const s of strokes) {
    const b = brushFor(s.emotionId),
      budget = Math.max(
        3,
        Math.min(20, Math.floor(600 / Math.max(1, strokes.length))),
      ),
      step = Math.max(1, Math.ceil(s.points.length / budget));
    ctx.save();
    ctx.strokeStyle = ctx.fillStyle = b.color;
    ctx.lineCap = "round";
    for (let i = 0; i < s.points.length; i += step) {
      const p = s.points[i],
        x = p.x * DISK_SIZE,
        y = p.y * DISK_SIZE,
        w = s.size,
        phase = s.id * 0.97 + i * 0.73,
        t = reduced ? 0 : time;
      if (["anger", "frustration"].includes(s.emotionId)) {
        const sway = Math.sin(t * 1.5 + phase) * w * 0.12,
          h = w * (0.45 + 0.17 * Math.sin(t * 1.2 + phase));
        ctx.globalAlpha = s.opacity * 0.65;
        ctx.fillStyle = "#d56836";
        ctx.beginPath();
        ctx.moveTo(x - w * 0.15, y + w * 0.08);
        ctx.quadraticCurveTo(x - w * 0.22, y - h * 0.35, x + sway, y - h);
        ctx.quadraticCurveTo(
          x + w * 0.3,
          y - h * 0.25,
          x + w * 0.15,
          y + w * 0.08,
        );
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha *= 0.8;
        ctx.fillStyle = "#f3c276";
        ctx.beginPath();
        ctx.ellipse(
          x + sway * 0.3,
          y - h * 0.2,
          w * 0.06,
          h * 0.25,
          -0.2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        const age = (((t * 0.25 + phase) % 1) + 1) % 1;
        ctx.globalAlpha = Math.sin(age * Math.PI) * 0.65;
        ctx.fillStyle = "#c88a43";
        ctx.beginPath();
        ctx.arc(
          x + Math.sin(phase * 3) * w * 0.45,
          y - age * w * 1.4,
          1.1,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      } else if (["sadness", "worry"].includes(s.emotionId)) {
        const age = (((t * 0.4 + phase) % 1) + 1) % 1;
        ctx.globalAlpha = Math.sin(age * Math.PI) * s.opacity * 0.6;
        ctx.strokeStyle = "#4b719c";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(
          x + Math.sin(phase) * w * 0.4 - age * w * 0.12,
          y + age * w * 1.5,
        );
        ctx.lineTo(
          x + Math.sin(phase) * w * 0.4 - age * w * 0.12 - w * 0.06,
          y + age * w * 1.5 + w * 0.2,
        );
        ctx.stroke();
      } else if (["joy", "wonder", "hope", "affection"].includes(s.emotionId)) {
        const a = phase + t * 0.2,
          r = w * (0.2 + 0.15 * Math.sin(t * 0.4 + phase));
        ctx.globalAlpha = (0.25 + 0.2 * Math.sin(t * 0.6 + phase)) * s.opacity;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.ellipse(
          x + Math.cos(a) * r,
          y + Math.sin(a) * r,
          2.1,
          1.3,
          a,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      } else {
        ctx.globalAlpha = s.opacity * 0.13;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(
          x,
          y,
          w * (0.3 + 0.05 * Math.sin(t * 0.4 + phase)),
          w * 0.15,
          phase + t * 0.04,
          0.3,
          Math.PI * 1.6,
        );
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  for (const bridge of emotionalBridges(strokes)) {
    ctx.save();
    const fade =
      0.5 + 0.5 * Math.sin((reduced ? 0 : time) * 0.48 + bridge.seed);
    ctx.globalAlpha = 0.12 + fade * 0.23;
    ctx.strokeStyle = "#9b84ba";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const t = i / 12,
        dx = bridge.b.x - bridge.a.x,
        dy = bridge.b.y - bridge.a.y,
        jitter = Math.sin(i * 4.7 + bridge.seed) * Math.sin(t * Math.PI) * 10;
      const x = (bridge.a.x + dx * t) * DISK_SIZE - dy * jitter,
        y = (bridge.a.y + dy * t) * DISK_SIZE + dx * jitter;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }
}
