import * as THREE from "three";
export const IMAGE_BRUSH_ID = "voiles";

export async function createImageBrush(file) {
  if (!file || !/^image\/(jpeg|png|webp|avif|gif)$/.test(file.type))
    throw new Error("Choisissez une photo JPEG, PNG, WebP, AVIF ou GIF.");
  if (file.size > 15 * 1024 * 1024)
    throw new Error("L’image doit faire moins de 15 Mo.");
  const bitmap = await createImageBitmap(file, {
    resizeWidth: 256,
    resizeHeight: 256,
    resizeQuality: "high",
    imageOrientation: "from-image",
  });
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0, 256, 256);
    const thumbnail = canvas.toDataURL("image/jpeg", 0.75);
    const image = ctx.getImageData(0, 0, 256, 256),
      pixels = image.data;
    const light = new Float32Array(256 * 256),
      cells = Array.from({ length: 256 }, () => ({
        r: 0,
        g: 0,
        b: 0,
        light: 0,
        edge: 0,
        saturation: 0,
        count: 0,
      }));
    for (let i = 0; i < light.length; i++)
      light[i] =
        (pixels[i * 4] * 0.2126 +
          pixels[i * 4 + 1] * 0.7152 +
          pixels[i * 4 + 2] * 0.0722) /
        255;
    let mean = 0,
      variance = 0,
      edges = 0;
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 256; x++) {
        const i = y * 256 + x,
          cell = cells[Math.floor(y / 16) * 16 + Math.floor(x / 16)],
          l = light[i];
        const edge = Math.min(
          1,
          (Math.abs(l - light[y * 256 + Math.min(255, x + 1)]) +
            Math.abs(l - light[Math.min(255, y + 1) * 256 + x])) *
            3,
        );
        const r = pixels[i * 4] / 255,
          g = pixels[i * 4 + 1] / 255,
          b = pixels[i * 4 + 2] / 255;
        cell.r += r;
        cell.g += g;
        cell.b += b;
        cell.light += l;
        cell.edge += edge;
        cell.saturation += Math.max(r, g, b) - Math.min(r, g, b);
        cell.count++;
        mean += l;
        variance += l * l;
        edges += edge;
        // A photographic alpha, with a floor so pale images still deposit matter.
        pixels[i * 4] = pixels[i * 4 + 1] = pixels[i * 4 + 2] = 255;
        pixels[i * 4 + 3] = Math.round(
          (0.1 + 0.65 * (1 - l) + 0.25 * edge) *
            (pixels[i * 4 + 3] / 255) *
            255,
        );
      }
    for (const cell of cells) {
      for (const key of ["r", "g", "b", "light", "edge", "saturation"])
        cell[key] /= cell.count;
      cell.color = new THREE.Color().setRGB(
        cell.r,
        cell.g,
        cell.b,
        THREE.SRGBColorSpace,
      );
    }
    mean /= light.length;
    const stats = {
      light: mean,
      contrast: Math.sqrt(Math.max(0, variance / light.length - mean * mean)),
      edge: edges / light.length,
    };
    ctx.putImageData(image, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    return {
      thumbnail,
      stats,
      binding: { texture, aspect: 1, repeat: 2 },
      sample(position) {
        const u =
          (((Math.atan2(position.z, position.x) / (Math.PI * 2)) % 1) + 1) % 1;
        const v = 0.5 + Math.sin(position.y * 0.045) * 0.49;
        return cells[
          Math.min(255, Math.floor(v * 16) * 16 + Math.floor(u * 16))
        ];
      },
    };
  } finally {
    bitmap.close();
  }
}
