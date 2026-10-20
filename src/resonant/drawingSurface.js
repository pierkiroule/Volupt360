import { createPigmentPlate } from "../chill/createPigmentPlate.js";
export const DRAWING_WIDTH = 1200,
  DRAWING_HEIGHT = 800;
export const DRAWING_TOOLS = [
  ["pencil", "Crayon", "✎"],
  ["paint", "Peinture", "▰"],
  ["watercolor", "Aquarelle", "≋"],
  ["eraser", "Gomme", "▱"],
  ["fill", "Remplir", "◒"],
  ["line", "Ligne", "╱"],
  ["rectangle", "Rectangle", "□"],
  ["ellipse", "Ellipse", "○"],
  ["stamp", "Tampon", "✦"],
];
export function createDrawingSurface(onChange = () => {}) {
  const canvas = document.createElement("canvas"),
    base = document.createElement("canvas");
  canvas.width = base.width = DRAWING_WIDTH;
  canvas.height = base.height = DRAWING_HEIGHT;
  const ctx = canvas.getContext("2d", { willReadFrequently: true }),
    back = base.getContext("2d");
  const textures = new Map();
  let actions = [],
    future = [],
    active = null;
  function texture(a) {
    const key = `${a.color}:${a.variant}`;
    if (textures.has(key)) return textures.get(key);
    const map = createPigmentPlate("wash", 7193 + a.variant * 953, 128, true);
    const c = map.getContext("2d"),
      image = c.getImageData(0, 0, 128, 128);
    const rgb = a.color
      .slice(1)
      .match(/../g)
      .map((v) => parseInt(v, 16));
    for (let i = 0; i < image.data.length; i += 4) {
      const load = image.data[i] / 255,
        tide = image.data[i + 2] / 255;
      for (let k = 0; k < 3; k++)
        image.data[i + k] = rgb[k] * (1.12 - load * 0.45 - tide * 0.25);
    }
    c.putImageData(image, 0, 0);
    if (textures.size >= 24) textures.delete(textures.keys().next().value);
    textures.set(key, map);
    return map;
  }
  function flood(a) {
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height),
      p = image.data;
    const x = Math.max(
        0,
        Math.min(canvas.width - 1, Math.round(a.points[0].x)),
      ),
      y = Math.max(0, Math.min(canvas.height - 1, Math.round(a.points[0].y)));
    const start = y * canvas.width + x,
      target = Array.from(p.slice(start * 4, start * 4 + 4));
    const rgb = a.color
      .slice(1)
      .match(/../g)
      .map((v) => parseInt(v, 16));
    const visited = new Uint8Array(canvas.width * canvas.height),
      queue = new Int32Array(visited.length);
    let head = 0,
      tail = 1;
    queue[0] = start;
    visited[start] = 1;
    while (head < tail) {
      const n = queue[head++],
        i = n * 4;
      if (
        Math.abs(p[i + 3] - target[3]) > 20 ||
        (target[3] > 0 &&
          rgb.some((_, k) => Math.abs(p[i + k] - target[k]) > 28))
      )
        continue;
      const alpha = a.opacity + (p[i + 3] / 255) * (1 - a.opacity);
      for (let k = 0; k < 3; k++)
        p[i + k] =
          (rgb[k] * a.opacity + p[i + k] * (p[i + 3] / 255) * (1 - a.opacity)) /
          Math.max(alpha, 0.001);
      p[i + 3] = alpha * 255;
      const col = n % canvas.width;
      for (const next of [
        col ? n - 1 : -1,
        col < canvas.width - 1 ? n + 1 : -1,
        n - canvas.width,
        n + canvas.width,
      ])
        if (next >= 0 && next < visited.length && !visited[next]) {
          visited[next] = 1;
          queue[tail++] = next;
        }
    }
    ctx.putImageData(image, 0, 0);
  }
  function render(a) {
    if (a.tool === "clear") {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    if (a.tool === "fill") {
      flood(a);
      return;
    }
    const first = a.points[0],
      end = a.points.at(-1),
      size = a.size;
    ctx.save();
    ctx.globalAlpha = a.opacity;
    ctx.fillStyle = ctx.strokeStyle = a.color;
    ctx.lineWidth = a.tool === "pencil" ? Math.max(1, size * 0.16) : size;
    ctx.lineCap = ctx.lineJoin = "round";
    if (a.tool === "eraser") ctx.globalCompositeOperation = "destination-out";
    if (a.tool === "watercolor")
      ctx.strokeStyle = ctx.createPattern(texture(a), "repeat");
    ctx.beginPath();
    if (a.tool === "rectangle")
      ctx.rect(first.x, first.y, end.x - first.x, end.y - first.y);
    else if (a.tool === "ellipse")
      ctx.ellipse(
        (first.x + end.x) / 2,
        (first.y + end.y) / 2,
        Math.max(0.5, Math.abs(end.x - first.x) / 2),
        Math.max(0.5, Math.abs(end.y - first.y) / 2),
        0,
        0,
        Math.PI * 2,
      );
    else if (a.tool === "stamp") {
      const r = size * 2;
      if (a.shape === "circle") ctx.arc(end.x, end.y, r, 0, Math.PI * 2);
      else if (a.shape === "square")
        ctx.rect(end.x - r, end.y - r, r * 2, r * 2);
      else {
        const count = a.shape === "triangle" ? 3 : 10;
        for (let i = 0; i < count; i++) {
          const radius = count === 10 && i % 2 ? r * 0.42 : r,
            angle = -Math.PI / 2 + (i * Math.PI * 2) / count;
          const x = end.x + Math.cos(angle) * radius,
            y = end.y + Math.sin(angle) * radius;
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.closePath();
      }
    } else if (a.tool === "line") {
      ctx.moveTo(first.x, first.y);
      ctx.lineTo(end.x, end.y);
    } else {
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < a.points.length; i++) {
        const p = a.points[i - 1],
          q = a.points[i];
        ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
      }
      ctx.lineTo(end.x, end.y);
      if (
        a.points.every((p) => Math.hypot(p.x - first.x, p.y - first.y) < 0.01)
      )
        ctx.lineTo(first.x + 0.01, first.y);
    }
    if (
      (a.tool === "stamp" && a.filled) ||
      (["rectangle", "ellipse"].includes(a.tool) && a.filled)
    )
      ctx.fill();
    else ctx.stroke();
    ctx.restore();
  }
  function notify() {
    onChange({
      canvas,
      count: actions.length,
      canUndo: !!actions.length,
      canRedo: !!future.length,
    });
  }
  function rebuild() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const a of actions) render(a);
    notify();
  }
  return {
    canvas,
    begin(point, tool) {
      if (actions.length >= 300) return false;
      back.clearRect(0, 0, base.width, base.height);
      back.drawImage(canvas, 0, 0);
      active = { ...tool, variant: actions.length % 12, points: [point] };
      this.move(point);
      return true;
    },
    move(point) {
      if (!active) return;
      if (active.points.length < 2048) active.points.push(point);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(base, 0, 0);
      if (active.tool !== "fill") render(active);
    },
    finish() {
      if (!active) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(base, 0, 0);
      render(active);
      actions.push(active);
      active = null;
      future = [];
      notify();
    },
    cancel() {
      if (!active) return;
      active = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(base, 0, 0);
    },
    undo() {
      this.cancel();
      if (actions.length) {
        future.push(actions.pop());
        rebuild();
      }
    },
    redo() {
      this.cancel();
      if (future.length) {
        actions.push(future.pop());
        rebuild();
      }
    },
    clear() {
      this.cancel();
      if (actions.length < 300) {
        actions.push({ tool: "clear" });
        future = [];
        rebuild();
      }
    },
    exportPNG() {
      const out = document.createElement("canvas");
      out.width = canvas.width;
      out.height = canvas.height;
      const c = out.getContext("2d");
      c.fillStyle = "#faf8f2";
      c.fillRect(0, 0, out.width, out.height);
      c.drawImage(canvas, 0, 0);
      return out.toDataURL("image/png");
    },
    dispose() {
      active = null;
      actions = [];
      future = [];
      textures.clear();
      canvas.width = base.width = 1;
    },
  };
}
