import * as THREE from "three";
let canvas: HTMLCanvasElement | null = null;
const hash = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
function noise(x: number, y: number) {
  const i = Math.floor(x),
    j = Math.floor(y);
  let u = x - i,
    v = y - j;
  u = u * u * (3 - 2 * u);
  v = v * v * (3 - 2 * v);
  return (
    (hash(i, j) * (1 - u) + hash(i + 1, j) * u) * (1 - v) +
    (hash(i, j + 1) * (1 - u) + hash(i + 1, j + 1) * u) * v
  );
}
/** Four density/illumination impostors. CPU generation once, never during rendering. */
export function makeCloudAtlas() {
  if (!canvas) {
    const tile = 128,
      size = tile * 2,
      pixels = new Uint8ClampedArray(size * size * 4);
    for (let type = 0; type < 4; type++)
      for (let y = 0; y < tile; y++)
        for (let x = 0; x < tile; x++) {
          const px = ((x + 0.5) / tile) * 2 - 1,
            py = ((y + 0.5) / tile) * 2 - 1;
          const macro = noise(px * 2.4 + type * 17, py * 2.4 + type * 13),
            medium = noise(px * 7.5 + type * 9, py * 7.5 + 3),
            fine = noise(px * 24 + type, py * 24 + 12);
          const radial = Math.hypot(px, py * (0.9 + type * 0.04));
          const rim = 0.7 + (macro - 0.5) * 0.35 + (medium - 0.5) * 0.11;
          const column = Math.sqrt(Math.max(0, 1 - (radial / rim) ** 2));
          const density = column * (0.65 + macro * 0.45 + medium * 0.15);
          const edge = THREE.MathUtils.smoothstep(rim - radial, 0, 0.17);
          const light = THREE.MathUtils.clamp(
            0.68 -
              py * 0.18 +
              column * 0.12 +
              (macro - 0.5) * 0.22 +
              (fine - 0.5) * 0.045,
            0.2,
            1,
          );
          const i =
            ((Math.floor(type / 2) * tile + y) * size + (type % 2) * tile + x) *
            4;
          pixels[i] = pixels[i + 1] = pixels[i + 2] = Math.round(light * 255);
          pixels[i + 3] = Math.round(
            (1 - Math.exp(-density * 1.65)) * edge * 255,
          );
        }
    canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    canvas
      .getContext("2d")!
      .putImageData(new ImageData(pixels, size, size), 0, 0);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}
