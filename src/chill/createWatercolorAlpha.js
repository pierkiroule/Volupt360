/** Seeded RGBA pigment plate: diffuse edges, tide rings, cauliflower blooms and paper tooth. */
export function createWatercolorAlpha(
  kind = "wash",
  seed = 811,
  size = 256,
  continuous = false,
) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d"),
    image = ctx.createImageData(size, size);
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const stains = Array.from({ length: 7 }, (_, i) => ({
    x: 0.5 + (random() - 0.5) * 0.42,
    y: 0.5 + (random() - 0.5) * 0.42,
    r: i ? 0.12 + random() * 0.19 : 0.32,
    phase: random() * 6.283,
    stretch: 0.75 + random() * 0.5,
  }));
  const hash = (x, y) => {
    let h = Math.imul(x + seed, 374761393) ^ Math.imul(y, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const smooth = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = x / size,
        v = y / size,
        tooth = hash(x, y),
        grain = hash(Math.floor(x / 2), Math.floor(y / 2));
      let alpha = 0;
      for (const stain of stains) {
        const dx = (u - stain.x) * stain.stretch,
          dy = (v - stain.y) / stain.stretch,
          angle = Math.atan2(dy, dx);
        const edge =
          stain.r *
          (1 +
            0.075 * Math.sin(angle * 5 + stain.phase) +
            0.045 * Math.sin(angle * 11 - stain.phase));
        const r = Math.hypot(dx, dy),
          inside = 1 - smooth(edge - 0.055, edge + 0.018, r);
        const rim = Math.exp(-Math.pow((r - edge + 0.016) / 0.013, 2));
        const bloom = Math.exp(
          -Math.abs(
            Math.sin(dx * 37 + Math.sin(dy * 29 + stain.phase)) *
              Math.cos(dy * 23),
          ) * 17,
        );
        const pigment =
          inside * (0.23 + grain * 0.17 + rim * 0.55 + bloom * 0.22);
        alpha = 1 - (1 - alpha) * (1 - pigment);
      }
      const fibres = 0.5 + 0.5 * Math.sin(u * 410 + Math.sin(v * 28) * 1.6);
      if (kind === "dry")
        alpha *= smooth(0.24, 0.7, tooth * 0.5 + fibres * 0.5);
      if (kind === "fiber") alpha *= 0.4 + 0.6 * smooth(0.25, 0.65, fibres);
      if (kind === "splatter") alpha *= smooth(0.15, 0.55, grain);
      if (kind === "stamp")
        alpha *= smooth(0.18, 0.65, tooth * 0.6 + grain * 0.4);
      if (continuous) {
        const backbone =
          Math.exp(-Math.pow((u - 0.5) / 0.18, 2)) *
          (0.26 + 0.08 * Math.sin(v * 6.2831853 + seed));
        alpha = 1 - (1 - alpha) * (1 - backbone);
      }
      alpha *= 0.7 + tooth * 0.3;
      const k = (y * size + x) * 4;
      image.data[k] = image.data[k + 1] = image.data[k + 2] = 255;
      image.data[k + 3] = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
    }
  ctx.putImageData(image, 0, 0);
  return canvas;
}
