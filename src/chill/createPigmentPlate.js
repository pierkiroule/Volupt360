/** RGBA data plate: pigment load, paper tooth, tide deposits, coverage.
 * Generated once per palette entry. Periodic Y fields join along a continuous stroke.
 */
export function createPigmentPlate(kind, seed, size, continuous, dry = false) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d"),
    pixels = ctx.createImageData(size, size);
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const smooth = (a, b, x) => {
    const t = clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const hash = (x, y) => {
    let h = Math.imul(x + seed, 374761393) ^ Math.imul(y, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const noise = (u, v, sx, sy) => {
    const x = u * sx,
      y = v * sy,
      ix = Math.floor(x),
      iy = Math.floor(y);
    const fx = x - ix,
      fy = y - iy,
      a = fx * fx * (3 - 2 * fx),
      b = fy * fy * (3 - 2 * fy);
    const y0 = ((iy % sy) + sy) % sy,
      y1 = (y0 + 1) % sy;
    const l = hash(ix, y0) * (1 - a) + hash(ix + 1, y0) * a;
    const r = hash(ix, y1) * (1 - a) + hash(ix + 1, y1) * a;
    return l * (1 - b) + r * b;
  };
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = x / (size - 1),
        v = y / (size - 1);
      const broad = noise(u, v, 5, 7),
        middle = noise(u, v, 19, 23),
        fine = noise(u, v, 71, 101);
      const tooth = noise(u, v, 193, 251),
        fibre = noise(u, v, 113, 17);
      // Nested blooms, mineral sediment and paper fibres at independent scales.
      const bloom = noise(u + (middle - 0.5) * 0.08, v, 11, 13);
      const sediment = smooth(0.38, 0.68, fine * 0.6 + tooth * 0.4);
      const field = broad * 0.46 + middle * 0.29 + bloom * 0.17 + fine * 0.08;
      const edge = 0.83 + (broad - 0.5) * 0.3 + (middle - 0.5) * 0.12;
      const distance = continuous
        ? Math.abs(u * 2 - 1)
        : Math.hypot((u - 0.5) * 2, (v - 0.5) * 2);
      const body = 1 - smooth(edge - 0.045, edge + 0.045, distance);
      const rim = Math.exp(-Math.pow((distance - edge + 0.03) / 0.023, 2));
      const inner =
        Math.exp(-Math.pow((field - 0.49) / 0.022, 2)) *
        smooth(0.2, 0.7, middle);
      let load = clamp(
        0.08 + field * 0.67 + sediment * 0.24 + rim * 0.46 + inner * 0.32,
      );
      let tide = clamp(rim * 0.85 + inner * 0.7 + sediment * 0.12);
      let coverage = body * (0.73 + field * 0.27);
      // Broken dry pigment follows paper fibres; wet washes preserve connected pools.
      if (kind === "dry" || dry)
        coverage *= 0.16 + 0.84 * smooth(0.23, 0.66, tooth * 0.5 + fibre * 0.5);
      if (dry) coverage *= 0.45 + 0.55 * smooth(0.25, 0.75, sediment);
      if (kind === "fiber") coverage *= 0.35 + 0.65 * smooth(0.18, 0.7, fibre);
      if (kind === "splatter" || kind === "stamp")
        coverage *= 0.45 + 0.55 * smooth(0.2, 0.65, fine);
      // Each family changes pigment deposition, not just the seed or tint.
      if (kind === "bloom") {
        const backrun = Math.exp(-Math.pow((bloom - 0.52) / 0.035, 2));
        tide = clamp(tide + backrun * 0.7);
        load = clamp(load * 0.7 + backrun * 0.48);
        coverage *= 0.45 + bloom * 0.55;
      }
      if (kind === "mineral") {
        load = clamp(load * 0.55 + sediment * 0.65);
        coverage *= 0.25 + smooth(0.3, 0.7, fine) * 0.75;
      }
      if (kind === "splatter") {
        coverage *= smooth(0.4, 0.61, middle) * 0.9 + 0.1;
        load = clamp(load + smooth(0.55, 0.7, fine) * 0.3);
      }
      const salt =
        Math.exp(-Math.pow((fine - 0.76) / 0.025, 2)) *
        smooth(0.65, 0.85, tooth);
      coverage *= (1 - salt * 0.85) * (0.72 + sediment * 0.28);
      const k = (y * size + x) * 4;
      pixels.data[k] = Math.round(load * 255);
      pixels.data[k + 1] = Math.round((tooth * 0.65 + fine * 0.35) * 255);
      pixels.data[k + 2] = Math.round(tide * 255);
      pixels.data[k + 3] = Math.round(clamp(coverage) * 255);
    }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}
