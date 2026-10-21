import * as THREE from "three";
const SIZE = 128;
const hash = (x, y, seed) => {
  let n = Math.imul(x + seed, 374761393) ^ Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};
function periodic(x, y, cells, seed) {
  x *= cells;
  y *= cells;
  const ix = Math.floor(x),
    iy = Math.floor(y);
  let u = x - ix,
    v = y - iy;
  u = u * u * (3 - 2 * u);
  v = v * v * (3 - 2 * v);
  const at = (a, b) => hash((a + cells) % cells, (b + cells) % cells, seed);
  return (
    (at(ix, iy) * (1 - u) + at(ix + 1, iy) * u) * (1 - v) +
    (at(ix, iy + 1) * (1 - u) + at(ix + 1, iy + 1) * u) * v
  );
}
/** Tileable displacement and grain fields. One owned GPU resource per veil engine. */
export function createDisplacementNoise() {
  const data = new Uint8Array(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const u = x / SIZE,
        v = y / SIZE,
        i = (y * SIZE + x) * 4;
      data[i] = Math.round(
        255 *
          (periodic(u, v, 4, 17) * 0.55 +
            periodic(u, v, 8, 37) * 0.3 +
            periodic(u, v, 16, 73) * 0.15),
      );
      data[i + 1] = Math.round(
        255 * (periodic(u, v, 32, 107) * 0.65 + periodic(u, v, 64, 191) * 0.35),
      );
      data[i + 2] = Math.round(255 * periodic(u, v, 8, 293));
      data[i + 3] = 255;
    }
  const texture = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
  texture.name = "TEX_Displace_Noise_Base";
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}
