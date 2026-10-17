import * as THREE from "three";

/** Decode locally, keep RGBA alpha; opaque images become dark-ink masks. */
export async function loadAlphaTexture(file, size = 256) {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml")
    throw new Error("Choisissez une image PNG, WebP ou JPEG.");
  if (file.size > 8 * 1024 * 1024)
    throw new Error("Choisissez une texture de 8 Mo maximum.");
  const bitmap = await createImageBitmap(file, {
    resizeWidth: size,
    resizeHeight: size,
    resizeQuality: "high",
  });
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  try {
    ctx.drawImage(bitmap, 0, 0, size, size);
  } finally {
    bitmap.close();
  }
  const image = ctx.getImageData(0, 0, size, size),
    data = image.data;
  let transparent = false;
  for (let i = 3; i < data.length; i += 4)
    if (data[i] < 250) {
      transparent = true;
      break;
    }
  for (let i = 0; i < data.length; i += 4) {
    if (!transparent)
      data[i + 3] =
        255 - (data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722);
    data[i] = data[i + 1] = data[i + 2] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.wrapT = THREE.RepeatWrapping;
  return {
    texture,
    aspect: 1,
    repeat: 1,
    photograph: false,
    importedAlpha: true,
  };
}
