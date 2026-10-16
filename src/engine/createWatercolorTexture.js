import * as THREE from "three";

// Fixed seeded pigment fields: generated once per brush, never during flight.
export function createWatercolorTexture(
  brush,
  seed,
  size = 512,
  acoustic = null,
) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(size, size);
  const color = new THREE.Color(brush.color).convertLinearToSRGB();
  const channels = [color.r, color.g, color.b];
  const hash = (x, y) => {
    let n = Math.imul(x + seed * 101, 374761393) ^ Math.imul(y, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const noise = (x, y) => {
    const ix = Math.floor(x),
      iy = Math.floor(y);
    let u = x - ix,
      v = y - iy;
    u = u * u * (3 - 2 * u);
    v = v * v * (3 - 2 * v);
    return THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(hash(ix, iy), hash(ix + 1, iy), u),
      THREE.MathUtils.lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), u),
      v,
    );
  };
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = x / size,
        v = y / size;
      const grainScale = 5 + (acoustic?.brightness || 0) * 7;
      const broad = noise(u * grainScale, v * grainScale),
        flow = noise(u * 17 + broad * 3, v * 17);
      const fiber = noise(u * 110, v * 110);
      const radius = Math.hypot((u - 0.5) * 2, (v - 0.5) * 2);
      const edge = 0.79 + (broad - 0.5) * 0.28 + (flow - 0.5) * 0.08;
      const wet = THREE.MathUtils.smoothstep(edge - radius, 0, 0.16);
      const pool = Math.exp(-Math.pow((radius - edge + 0.065) / 0.035, 2));
      const blooms = Math.exp(-Math.abs(flow - 0.5) * 28);
      const pigment = Math.min(
        1,
        0.26 + broad * 0.5 + pool * 0.38 + blooms * 0.2,
      );
      const granulation = 0.15 + (acoustic?.contrast ?? 0.35) * 0.3;
      const grain = 1 - granulation + granulation * hash(x, y);
      const songEnvelope = acoustic
        ? 0.6 + acoustic.envelope[Math.min(31, Math.floor(u * 32))] * 0.4
        : 1;
      const k = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) {
        const base = channels[c];
        image.data[k + c] =
          255 *
          THREE.MathUtils.clamp(
            base * (1.2 - pigment * 0.55) +
              (1 - pigment) * 0.12 +
              (fiber - 0.5) * 0.045,
            0,
            1,
          );
      }
      image.data[k + 3] =
        255 *
        wet *
        (0.4 + pigment * 0.55) *
        grain *
        songEnvelope *
        (0.85 + fiber * 0.15);
    }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return { texture, aspect: 1, repeat: 1, photograph: true };
}
