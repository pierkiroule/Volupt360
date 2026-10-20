// Seeded pigment masks: diffuse water, broken edges, sediment and drying rims.
// Built once outside animation loops; shared by Canvas and WebGL.
export const PIGMENT_CELL = 192;
let shared;
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
  canvas.width = PIGMENT_CELL * 4;
  canvas.height = PIGMENT_CELL;
  const ctx = canvas.getContext("2d"),
    pixels = ctx.createImageData(canvas.width, canvas.height);
  for (let tile = 0; tile < 4; tile++) {
    const seed = 17 + tile * 31;
    for (let y = 0; y < PIGMENT_CELL; y++)
      for (let x = 0; x < PIGMENT_CELL; x++) {
        const u = ((x + 0.5) / PIGMENT_CELL) * 2 - 1,
          v = ((y + 0.5) / PIGMENT_CELL) * 2 - 1;
        const n = noise(u * 3 + 5, v * 3 + 5, seed),
          fine = noise(x * 0.16, y * 0.16, seed + 2);
        const radius = Math.hypot(
          u * (tile === 1 ? 0.82 : 1),
          v * (tile === 1 ? 1.28 : 1),
        );
        const edge = 0.77 + (n - 0.5) * 0.3 + (fine - 0.5) * 0.035;
        const distance = edge - radius;
        const envelope = Math.max(0, Math.min(1, distance / 0.12));
        const rim = Math.exp(-Math.pow((distance - 0.055) * 24, 2));
        const grain = hash(x, y, seed);
        const holes =
          tile === 2
            ? Math.max(0.05, Math.min(1, (fine - 0.31) * 3))
            : 0.65 + fine * 0.35;
        const density =
          (0.17 + n * 0.37 + rim * 0.33) * holes * (0.64 + grain * 0.36);
        const i = (y * canvas.width + x + tile * PIGMENT_CELL) * 4;
        pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
        pixels.data[i + 3] = Math.round(
          255 * envelope * density * (grain < 0.035 ? 0.15 : 1),
        );
      }
  }
  ctx.putImageData(pixels, 0, 0);
  shared = canvas;
  return shared;
}
