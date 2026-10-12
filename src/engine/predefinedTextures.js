import * as THREE from "three";

export const PREDEFINED_TEXTURES = [
  { id: "mycelium", name: "Mycélium", glyph: "⌁" },
  { id: "cells", name: "Cellules", glyph: "◉" },
  { id: "veins", name: "Nervures", glyph: "⋈" },
  { id: "ink", name: "Encre éclatée", glyph: "✺" },
  { id: "scales", name: "Écailles", glyph: "≋" },
];

const masks = new Map();

/** Five repeatable organic, high-contrast RGBA masks. Never read a user file. */
function maskFor(id) {
  if (masks.has(id)) return masks.get(id);
  const preset = PREDEFINED_TEXTURES.find((item) => item.id === id);
  if (!preset) throw new Error("Texture inconnue.");
  const size = 256,
    canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d"),
    image = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2,
        v = (y / size) * Math.PI * 2;
      const warp = Math.sin(v * 3 + Math.sin(u * 2)) * 0.65;
      let field;
      if (id === "mycelium")
        field = Math.min(
          Math.abs(Math.sin(u * 3 + warp + Math.cos(v * 2))),
          Math.abs(Math.sin(v * 4 + Math.sin(u * 3) * 0.6)),
        );
      if (id === "cells")
        field = Math.abs(
          Math.sin(u * 3 + Math.sin(v) * 0.5) *
            Math.sin(v * 3 + Math.cos(u) * 0.5),
        );
      if (id === "veins")
        field = Math.abs(
          Math.sin(v * 5 + Math.sin(u * 2) * 1.4 + Math.sin(u * 5) * 0.35),
        );
      if (id === "ink")
        field =
          Math.sin(u * 3 + Math.sin(v * 4)) *
            Math.cos(v * 2 + Math.cos(u * 5)) +
          Math.sin(u * 7 + v * 5) * 0.32;
      if (id === "scales")
        field = Math.abs(
          Math.cos(u * 4 + Math.sin(v * 3) * 0.8) +
            Math.cos(v * 4 + Math.sin(u * 2) * 0.5),
        );
      const threshold =
        id === "ink"
          ? 0.12
          : id === "cells"
            ? 0.23
            : id === "scales"
              ? 0.25
              : 0.18;
      const alpha = THREE.MathUtils.clamp((threshold - field) * 30 + 0.5, 0, 1);
      const index = (y * size + x) * 4;
      image.data[index] = image.data[index + 1] = image.data[index + 2] = 255;
      image.data[index + 3] = Math.round(alpha * 255);
    }
  ctx.putImageData(image, 0, 0);
  const mask = { canvas, preview: canvas.toDataURL("image/png"), preset };
  masks.set(id, mask);
  return mask;
}
export function predefinedTexturePreview(id) {
  return maskFor(id).preview;
}
export function createPredefinedTexture(id) {
  const { canvas, preview, preset } = maskFor(id);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  return {
    texture,
    aspect: 1,
    repeat: 3,
    preview,
    name: preset.name,
    id,
  };
}
