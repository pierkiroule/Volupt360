import * as THREE from "three";
/** Four seeded pigment families in one 512² atlas. Built once, never per frame. */
export function watercolorPixels(seed = 9182, tile = 256) {
  const size = tile * 2,
    pixels = new Uint8ClampedArray(size * size * 4);
  const hash = (x: number, y: number, salt: number) => {
    let n = Math.imul(x + salt, 374761393) ^ Math.imul(y + seed, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const noise = (x: number, y: number, salt: number) => {
    const ix = Math.floor(x),
      iy = Math.floor(y);
    let u = x - ix,
      v = y - iy;
    u = u * u * (3 - 2 * u);
    v = v * v * (3 - 2 * v);
    const a = hash(ix, iy, salt),
      b = hash(ix + 1, iy, salt),
      c = hash(ix, iy + 1, salt),
      d = hash(ix + 1, iy + 1, salt);
    return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
  };
  for (let family = 0; family < 4; family++)
    for (let y = 0; y < tile; y++)
      for (let x = 0; x < tile; x++) {
        const u = x / tile,
          v = y / tile,
          salt = family * 193;
        const warp = noise(u * 3, v * 3, salt) * 2;
        const broad = noise(u * 5 + warp, v * 5 - warp, salt + 31);
        const medium = noise(u * 15 + warp, v * 15, salt + 63);
        const fine = noise(u * 55, v * 55, salt + 91),
          grain = hash(x, y, salt + 117);
        const field = broad * 0.6 + medium * 0.28 + fine * 0.12;
        const tide = Math.exp(-Math.abs(field - 0.49) * 55);
        const fiber = noise(u * 8, v * 70 + warp, salt + 71);
        const density =
          family === 0
            ? field
            : family === 1
              ? field * 0.7 + tide * 0.3
              : family === 2
                ? medium * 0.35 + fiber * 0.45 + field * 0.2
                : field * 0.65 + fine * 0.35;
        const index =
          (((family >> 1) * tile + y) * size + (family % 2) * tile + x) * 4;
        pixels[index] = Math.min(255, 120 + field * 90 + tide * 28);
        pixels[index + 1] = Math.round(grain * 255);
        pixels[index + 2] = Math.round(medium * 255);
        pixels[index + 3] = Math.max(
          0,
          Math.min(245, (density - 0.15) * 310 + (grain - 0.5) * 25),
        );
      }
  return { pixels, size };
}
export function makeWatercolorAtlas() {
  const { pixels, size } = watercolorPixels();
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  canvas
    .getContext("2d")!
    .putImageData(new ImageData(pixels, size, size), 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}
