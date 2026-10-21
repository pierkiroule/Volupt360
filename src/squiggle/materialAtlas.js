import * as THREE from "three";
import { SQUIGGLE_BRUSHES } from "./brushes.js";
/** Lazy pair of bounded shared atlases; no per-frame downloads or allocations. */
export function createMaterialAtlas() {
  const placeholder = new THREE.DataTexture(
    new Uint8Array([255, 255, 255, 0]),
    1,
    1,
  );
  placeholder.needsUpdate = true;
  const release = (t) => {
    if (t) {
      t.dispose();
      t.image.width = 1;
    }
  };
  let color = null,
    height = null;
  return {
    get color() {
      return color || placeholder;
    },
    get height() {
      return height || placeholder;
    },
    setMaterials(materials) {
      release(color);
      release(height);
      color = height = null;
      if (!Object.values(materials).some(Boolean)) return;
      const make = (key, size) => {
        const canvas = document.createElement("canvas");
        canvas.width = size * 8;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        SQUIGGLE_BRUSHES.forEach((b, i) => {
          if (materials[b.id])
            ctx.drawImage(materials[b.id][key], i * size, 0, size, size);
        });
        const t = new THREE.CanvasTexture(canvas);
        t.name = `PolyHaven_${key}`;
        if (key === "canvas") t.colorSpace = THREE.SRGBColorSpace;
        return t;
      };
      color = make("canvas", 256);
      height = make("height", 128);
    },
    dispose() {
      release(color);
      release(height);
      placeholder.dispose();
    },
  };
}
