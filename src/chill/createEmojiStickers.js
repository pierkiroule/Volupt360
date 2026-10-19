import * as THREE from "three";
import { paintingToWorld } from "./paintingToWorld.js";

/** Camera-facing emoji planes placed in real 3D, sharing one texture per symbol. */
export function createEmojiStickers() {
  const group = new THREE.Group(),
    textures = new Map(),
    items = [];
  function textureFor(emoji) {
    if (textures.has(emoji)) return textures.get(emoji);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.font =
      '190px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, 128, 139);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.set(emoji, texture);
    return texture;
  }
  function clear() {
    for (const item of items) item.sprite.material.dispose();
    items.length = 0;
    group.clear();
  }
  return {
    group,
    get count() {
      return items.length;
    },
    add(sticker, layer, total, aspect) {
      // Bound scene objects independently of painting complexity.
      if (items.length >= 256) return;
      const material = new THREE.SpriteMaterial({
        map: textureFor(sticker.emoji),
        opacity: sticker.opacity,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      });
      const sprite = new THREE.Sprite(material);
      const origin = paintingToWorld(
        sticker.points[0],
        layer,
        total,
        sticker.size,
      );
      const size = Math.max(0.12, sticker.size * (aspect > 1 ? 2.5 : 1) * 25);
      sprite.position.copy(origin);
      sprite.scale.setScalar(size);
      group.add(sprite);
      items.push({ sprite, origin, size, phase: layer * 1.73 });
    },
    update(time, energy = 0) {
      for (const { sprite, origin, size, phase } of items) {
        sprite.position.copy(origin);
        sprite.position.y += Math.sin(time * 0.45 + phase) * 0.16;
        sprite.scale.setScalar(
          size *
            (1 + Math.sin(time * 0.6 + phase) * Math.min(1, energy) * 0.06),
        );
      }
    },
    clear,
    dispose() {
      clear();
      for (const texture of textures.values()) texture.dispose();
      textures.clear();
    },
  };
}
