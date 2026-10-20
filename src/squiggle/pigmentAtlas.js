// Local seeded RGBA alphas, generated once and shared by Canvas and WebGL.
export const PIGMENT_CELL = 256;
export const ALPHA_TYPES = Object.freeze([
  "Auréoles",
  "Capillarités",
  "Granulation",
  "Fibres",
  "Craquelures",
  "Diffusion",
  "Projections",
  "Encre sèche",
]);
export const PIGMENT_COLUMNS = ALPHA_TYPES.length;
let shared;
const clamp = (n) => Math.max(0, Math.min(1, n));
const fract = (n) => n - Math.floor(n);
function hash(x, y, seed) {
  return fract(Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453);
}
function noise(x, y, seed) {
  const ix = Math.floor(x),
    iy = Math.floor(y);
  let u = x - ix,
    v = y - iy;
  u = u * u * (3 - 2 * u);
  v = v * v * (3 - 2 * v);
  return (
    (hash(ix, iy, seed) * (1 - u) + hash(ix + 1, iy, seed) * u) * (1 - v) +
    (hash(ix, iy + 1, seed) * (1 - u) + hash(ix + 1, iy + 1, seed) * u) * v
  );
}
export function pigmentAtlas() {
  if (shared) return shared;
  const canvas = document.createElement("canvas");
  canvas.width = PIGMENT_CELL * PIGMENT_COLUMNS;
  canvas.height = PIGMENT_CELL;
  const ctx = canvas.getContext("2d"),
    pixels = ctx.createImageData(canvas.width, canvas.height);
  for (let tile = 0; tile < PIGMENT_COLUMNS; tile++) {
    const seed = 17 + tile * 31;
    for (let y = 0; y < PIGMENT_CELL; y++)
      for (let x = 0; x < PIGMENT_CELL; x++) {
        const u = ((x + 0.5) / PIGMENT_CELL) * 2 - 1,
          v = ((y + 0.5) / PIGMENT_CELL) * 2 - 1;
        const n = noise(u * 3 + 5, v * 3 + 5, seed),
          fine = noise(x * 0.16, y * 0.16, seed + 2),
          grain = hash(x, y, seed);
        const radius = Math.hypot(
          u * (tile === 3 ? 0.83 : 1),
          v * (tile === 3 ? 1.18 : 1),
        );
        const distance = 0.8 + (n - 0.5) * 0.26 + (fine - 0.5) * 0.04 - radius;
        const envelope = clamp(distance / 0.085),
          rim = Math.exp(-Math.pow((distance - 0.055) * 31, 2));
        const veins = Math.exp(
          -Math.pow((noise(u * 8 + n, v * 8 + n, seed + 9) - 0.5) * 27, 2),
        );
        let density;
        switch (tile) {
          case 0:
            density =
              (0.14 + n * 0.22 + rim * 0.73) * (grain < 0.055 ? 0.12 : 1);
            break;
          case 1:
            density = 0.13 + veins * 0.72 + rim * 0.3;
            break;
          case 2:
            density =
              (0.2 + n * 0.65) *
              Math.pow(grain, 0.7) *
              clamp((fine - 0.27) * 3.4);
            break;
          case 3:
            density =
              (0.18 +
                0.55 * Math.pow(0.5 + 0.5 * Math.sin(y * 0.95 + n * 24), 6)) *
              (0.4 + fine * 0.6);
            break;
          case 4:
            density =
              (0.25 + n * 0.55) * (1 - veins * 0.93) * (grain < 0.12 ? 0.3 : 1);
            break;
          case 5:
            density = (0.14 + n * 0.56 + rim * 0.26) * (0.65 + fine * 0.35);
            break;
          case 6:
            density =
              clamp((noise(x * 0.22, y * 0.22, seed + 7) - 0.59) * 5.5) *
                (0.4 + grain * 0.6) +
              rim * 0.13;
            break;
          default:
            density =
              (0.09 + veins * 0.7 + rim * 0.3) * clamp((grain - 0.16) * 1.6);
            break;
        }
        const i = (y * canvas.width + x + tile * PIGMENT_CELL) * 4;
        pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
        pixels.data[i + 3] = Math.round(clamp(envelope * density) * 255);
      }
  }
  ctx.putImageData(pixels, 0, 0);
  shared = canvas;
  return shared;
}
