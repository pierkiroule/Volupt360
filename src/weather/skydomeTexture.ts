import * as THREE from "three";
import {
  WEATHER,
  pigment,
  random,
  skyPosition,
  type Zone,
} from "./weatherModel";
/** Common paper tone keeps the painted horizon, terrain and distance fog continuous. */
export function skyPaperColor(zones: Zone[]) {
  const paper = new THREE.Color("#eff1ec"),
    average = new THREE.Color(0, 0, 0);
  let total = 0;
  for (const z of zones) {
    const w = WEATHER.find((w) => w.id === z.kind);
    if (!w) continue;
    const weight = z.size * z.size * z.opacity;
    const color = new THREE.Color(w.color);
    average.r += color.r * weight;
    average.g += color.g * weight;
    average.b += color.b * weight;
    total += weight;
  }
  if (total > 0) paper.lerp(average.multiplyScalar(1 / total), 0.13);
  return paper;
}
/** Generated once per composition; every wash is repeated across the longitude seam. */
export function createSkyCanvas(zones: Zone[], width = 1024) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = width / 2;
  const ctx = c.getContext("2d")!,
    height = c.height;
  ctx.fillStyle = skyPaperColor(zones).getStyle();
  ctx.fillRect(0, 0, width, height);
  for (const z of zones) {
    const w = WEATHER.find((w) => w.id === z.kind);
    if (!w) continue;
    const r = random(z.seed ^ 85193),
      p = skyPosition(z),
      u = Math.atan2(p[2], p[0]) / (Math.PI * 2) + 0.5,
      x = u * width,
      y = (0.28 + z.y * 0.17) * height,
      spread = width * (0.19 + z.size * 0.3);
    const a = pigment(z.seed, w.color),
      b = pigment(z.seed ^ 931, w.secondary);
    for (let n = 0; n < 5; n++) {
      const px = x + (r() - 0.5) * spread,
        py = y + (r() - 0.5) * height * 0.2,
        sx = spread * (0.65 + r() * 0.8),
        sy = height * (0.15 + r() * 0.16),
        angle = (r() - 0.5) * 0.5;
      ctx.globalAlpha = z.opacity * (0.24 + z.size * 0.4);
      for (const wrap of [-width, 0, width]) {
        ctx.save();
        ctx.translate(px + wrap, py);
        ctx.rotate(angle);
        ctx.drawImage(n % 3 ? a : b, -sx / 2, -sy / 2, sx, sy);
        ctx.restore();
      }
    }
    if (z.kind === "aurora" || z.kind === "wind" || z.kind === "prism") {
      for (let n = 0; n < 6; n++) {
        ctx.strokeStyle = n % 2 ? w.color : w.secondary;
        ctx.globalAlpha = z.opacity * 0.12;
        ctx.lineWidth = 2 + n * 0.7;
        for (const wrap of [-width, 0, width]) {
          ctx.beginPath();
          for (let k = 0; k <= 60; k++) {
            const xx = x + wrap + (k / 60 - 0.5) * spread * 1.6,
              yy =
                y +
                Math.sin(k * 0.09 + n * 0.3) * height * 0.035 +
                n * height * 0.012;
            k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
          }
          ctx.stroke();
        }
      }
    }
    a.width = b.width = 1;
  }
  // Fine paper fibers, stable across reloads; no costly generation in the animation loop.
  const grain = random(91827);
  ctx.globalAlpha = 0.035;
  for (let i = 0; i < width * 18; i++) {
    ctx.fillStyle = i % 3 ? "#fffdf2" : "#46635c";
    ctx.fillRect(
      grain() * width,
      grain() * height,
      0.5 + grain(),
      0.5 + grain(),
    );
  }
  ctx.globalAlpha = 1;
  // Identical edge texels avoid a visible line under RepeatWrapping + linear filtering.
  ctx.putImageData(ctx.getImageData(0, 0, 1, height), width - 1, 0);
  return c;
}
