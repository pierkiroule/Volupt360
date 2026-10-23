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
        // Secondary pools and small capillary breaks enrich the dry pigment.
        const cells = noise(u * 10 + medium * 2, v * 10 - broad, salt + 149);
        const speck = noise(u * 110, v * 110, salt + 173);
        const blooms = Math.exp(-Math.abs(cells - 0.47) * 24);
        const fissure = Math.exp(-Math.abs(medium - 0.51) * 85);
        const density =
          family === 0
            ? broad * 0.6 + cells * 0.25 + fine * 0.15
            : family === 1
              ? field * 0.55 + tide * 0.28 + blooms * 0.17
              : family === 2
                ? fiber * 0.5 + medium * 0.3 + fine * 0.2
                : cells * 0.45 + fine * 0.2 + speck * 0.2 + broad * 0.15;
        const index =
          (((family >> 1) * tile + y) * size + (family % 2) * tile + x) * 4;
        pixels[index] = Math.min(
          255,
          65 + field * 125 + tide * 42 + blooms * 22,
        );
        pixels[index + 1] = Math.round(
          (grain * 0.5 + speck * 0.3 + fine * 0.2) * 255,
        );
        pixels[index + 2] = Math.round(
          Math.min(1, cells * 0.55 + blooms * 0.3 + fissure * 0.15) * 255,
        );
        pixels[index + 3] = Math.max(
          0,
          Math.min(245, (density - 0.19) * 390 + (grain - 0.5) * 32),
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
