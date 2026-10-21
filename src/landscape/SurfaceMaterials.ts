import * as THREE from "three";
import { rng } from "./types";
/** Small local albedo/bump grain; no image download and no allocations while rendering. */
export function surfaceGrain(seed: number, repeat = 1) {
  const r = rng(seed),
    data = new Uint8Array(128 * 128 * 4);
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++) {
      const k = (y * 128 + x) * 4,
        value = 226 + Math.floor(r() * 25) + Math.floor(Math.sin(x * 0.2) * 2);
      data[k] = data[k + 1] = data[k + 2] = value;
      data[k + 3] = 255;
    }
  const texture = new THREE.DataTexture(data, 128, 128, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.setScalar(repeat);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
