import * as THREE from "three";

export const LAND_RADIUS = 14;
export const LAND_BRUSHES = [
  {
    emoji: "🔥",
    name: "Braises",
    color: "#b85d3f",
    relief: 3.4,
    kind: "ridge",
  },
  {
    emoji: "🌊",
    name: "Courants",
    color: "#3e9caa",
    relief: -1.1,
    kind: "water",
  },
  { emoji: "☁️", name: "Brumes", color: "#949db4", relief: 0.65, kind: "soft" },
  { emoji: "✨", name: "Éclats", color: "#c0a04c", relief: 1.8, kind: "grain" },
  {
    emoji: "🌧️",
    name: "Lavis",
    color: "#566eaa",
    relief: -1.5,
    kind: "water",
  },
  { emoji: "🌀", name: "Plis", color: "#89739f", relief: 2.2, kind: "ridge" },
  {
    emoji: "🌸",
    name: "Éclosions",
    color: "#c57c91",
    relief: 1.8,
    kind: "soft",
  },
  {
    emoji: "☀️",
    name: "Ondes dorées",
    color: "#ce9b53",
    relief: 2.6,
    kind: "soft",
  },
  {
    emoji: "🌙",
    name: "Encres nocturnes",
    color: "#68769a",
    relief: -1.0,
    kind: "soft",
  },
  {
    emoji: "🍃",
    name: "Souffles",
    color: "#6c9981",
    relief: 1.3,
    kind: "ridge",
  },
  {
    emoji: "❄️",
    name: "Cristaux",
    color: "#739bab",
    relief: 3.7,
    kind: "grain",
  },
  {
    emoji: "🫧",
    name: "Sources",
    color: "#87b6b5",
    relief: -0.7,
    kind: "water",
  },
];
const SIZE = 768;
const paper = "#f3ecdc";
const fade = (x) => x * x * (3 - 2 * x);
export function createLandscape(strokes, materials = {}, mobile = false) {
  const cells = mobile ? 112 : 160,
    side = cells + 1;
  const heights = new Float32Array(side * side);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, SIZE, SIZE);
  // Fixed grain: a new stroke never changes the paper beneath older strokes.
  let seed = 73613;
  const rand = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 12000; i++) {
    ctx.fillStyle = i % 2 ? "#76694d0a" : "#ffffff22";
    ctx.fillRect(rand() * SIZE, rand() * SIZE, 1 + rand(), 1 + rand());
  }
  for (let z = 0; z <= cells; z++)
    for (let x = 0; x <= cells; x++) {
      const wx = ((x / cells) * 2 - 1) * LAND_RADIUS;
      const wz = ((z / cells) * 2 - 1) * LAND_RADIUS;
      heights[z * side + x] = 0.12 * Math.sin(wx * 0.37) * Math.cos(wz * 0.29);
    }
  const stamps = new Map();
  function stampFor(brush) {
    if (stamps.has(brush.emoji)) return stamps.get(brush.emoji);
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const p = c.getContext("2d");
    p.fillStyle = brush.color;
    p.fillRect(0, 0, 128, 128);
    const source = materials[brush.emoji]?.canvas;
    if (source) {
      p.globalAlpha = 0.8;
      p.globalCompositeOperation = "soft-light";
      p.drawImage(source, 0, 0, 128, 128);
      p.globalAlpha = 0.35;
      p.globalCompositeOperation = "multiply";
      p.drawImage(source, 0, 0, 128, 128);
    }
    p.globalAlpha = 1;
    p.globalCompositeOperation = "destination-in";
    const mask = p.createRadialGradient(64, 64, 16, 64, 64, 62);
    mask.addColorStop(0, "#ffffffc9");
    mask.addColorStop(0.56, "#ffffffaa");
    mask.addColorStop(0.88, "#ffffff45");
    mask.addColorStop(1, "#ffffff00");
    p.fillStyle = mask;
    p.fillRect(0, 0, 128, 128);
    p.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 450; i++) {
      p.fillStyle = `rgba(0,0,0,${0.08 + rand() * 0.32})`;
      p.fillRect(
        rand() * 128,
        rand() * 128,
        0.5 + rand() * 2,
        0.5 + rand() * 2,
      );
    }
    stamps.set(brush.emoji, c);
    return c;
  }
  for (const stroke of strokes) {
    const brush =
      LAND_BRUSHES.find((b) => b.emoji === stroke.emoji) || LAND_BRUSHES[0];
    const radius = stroke.size || 1,
      opacity = stroke.opacity ?? 0.7;
    // Fixed arc-length deposition: relief does not depend on pointer event frequency.
    const samples = stroke.points.length ? [stroke.points[0]] : [];
    const spacing = radius * 0.35;
    let remaining = spacing;
    for (let i = 1; i < stroke.points.length; i++) {
      let start = stroke.points[i - 1];
      const end = stroke.points[i];
      let distance = Math.hypot(end.x - start.x, end.z - start.z);
      while (distance >= remaining && distance > 0) {
        const t = remaining / distance;
        start = {
          x: start.x + (end.x - start.x) * t,
          z: start.z + (end.z - start.z) * t,
        };
        samples.push(start);
        distance -= remaining;
        remaining = spacing;
      }
      remaining -= distance;
    }
    const stamp = stampFor(brush);
    for (const point of samples) {
      const gx = ((point.x / LAND_RADIUS + 1) * cells) / 2;
      const gz = ((point.z / LAND_RADIUS + 1) * cells) / 2;
      const reach = Math.ceil((radius * cells) / (LAND_RADIUS * 2));
      for (
        let z = Math.max(0, Math.floor(gz - reach));
        z <= Math.min(cells, Math.ceil(gz + reach));
        z++
      )
        for (
          let x = Math.max(0, Math.floor(gx - reach));
          x <= Math.min(cells, Math.ceil(gx + reach));
          x++
        ) {
          const wx = ((x - gx) * LAND_RADIUS * 2) / cells,
            wz = ((z - gz) * LAND_RADIUS * 2) / cells;
          const distance = Math.hypot(wx, wz) / radius;
          if (distance >= 1) continue;
          let shape = Math.pow(1 - distance * distance, 2);
          if (brush.kind === "ridge")
            shape *= 0.75 + 0.25 * Math.cos(wx * 4 + wz * 2);
          if (brush.kind === "grain")
            shape *=
              0.68 +
              0.32 * Math.sin(wx * 7 + point.x) * Math.sin(wz * 6 + point.z);
          const index = z * side + x;
          heights[index] +=
            shape *
            brush.relief *
            opacity *
            0.22 *
            (0.78 + 0.22 * Math.sin(point.x * 1.4 + point.z * 0.85));
        }
      ctx.globalAlpha = opacity * 0.45;
      const scale = SIZE / (LAND_RADIUS * 2),
        r = radius * scale;
      ctx.drawImage(
        stamp,
        (point.x + LAND_RADIUS) * scale - r,
        (point.z + LAND_RADIUS) * scale - r,
        r * 2,
        r * 2,
      );
    }
  }
  ctx.globalAlpha = 1;
  for (let z = 0; z <= cells; z++)
    for (let x = 0; x <= cells; x++) {
      const radius = Math.hypot((x / cells) * 2 - 1, (z / cells) * 2 - 1);
      heights[z * side + x] =
        5.5 *
        Math.tanh(heights[z * side + x] / 5.5) *
        (1 - fade(Math.min(1, Math.max(0, (radius - 0.88) / 0.12))));
    }
  const geometry = new THREE.PlaneGeometry(
    LAND_RADIUS * 2,
    LAND_RADIUS * 2,
    cells,
    cells,
  );
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) positions.setY(i, heights[i]);
  geometry.computeVertexNormals();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  function heightAt(x, z) {
    const gx = THREE.MathUtils.clamp(
      ((x / LAND_RADIUS + 1) * cells) / 2,
      0,
      cells - 0.0001,
    );
    const gz = THREE.MathUtils.clamp(
      ((z / LAND_RADIUS + 1) * cells) / 2,
      0,
      cells - 0.0001,
    );
    const ix = Math.floor(gx),
      iz = Math.floor(gz),
      u = gx - ix,
      v = gz - iz;
    return THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(
        heights[iz * side + ix],
        heights[iz * side + ix + 1],
        u,
      ),
      THREE.MathUtils.lerp(
        heights[(iz + 1) * side + ix],
        heights[(iz + 1) * side + ix + 1],
        u,
      ),
      v,
    );
  }
  return {
    geometry,
    texture,
    heightAt,
    heights,
    canvas,
    dispose() {
      geometry.dispose();
      texture.dispose();
      stamps.clear();
    },
  };
}
