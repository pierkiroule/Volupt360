import * as THREE from "three";

async function decodeImage(file) {
  if (typeof createImageBitmap === "function") {
    try {
      const image = await createImageBitmap(file);
      return { image, close: () => image.close() };
    } catch {
      /* Some browsers decode raster images here but require Image for SVG. */
    }
  }
  const url = URL.createObjectURL(file),
    image = new Image();
  image.src = url;
  try {
    await image.decode();
    return {
      image,
      close() {
        image.src = "";
        URL.revokeObjectURL(url);
      },
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function thresholdFor(histogram, count) {
  let sum = 0;
  histogram.forEach((amount, value) => {
    sum += value * amount;
  });
  let weight = 0,
    partial = 0,
    best = -1,
    threshold = 128;
  for (let value = 0; value < 255; value++) {
    weight += histogram[value];
    partial += value * histogram[value];
    if (!weight || weight === count) continue;
    const difference = partial / weight - (sum - partial) / (count - weight);
    const variance = weight * (count - weight) * difference ** 2;
    if (variance > best) {
      best = variance;
      threshold = value;
    }
  }
  return threshold;
}
const clamp = (value) => Math.min(1, Math.max(0, value));

/** Local image -> alpha pigment mask: Otsu luminance threshold, Sobel contours,
 * original transparency and automatic light/dark background interpretation.
 */
export async function importBrushTexture(file) {
  const decoded = await decodeImage(file);
  const bitmap = decoded.image;
  try {
    const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0, width, height);
    const source = ctx.getImageData(0, 0, width, height);
    const luminance = new Float32Array(width * height),
      histogram = new Uint32Array(256);
    let count = 0,
      borderSum = 0,
      borderCount = 0,
      transparent = 0;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const i = y * width + x,
          k = i * 4;
        const value =
          source.data[k] * 0.2126 +
          source.data[k + 1] * 0.7152 +
          source.data[k + 2] * 0.0722;
        luminance[i] = value;
        if (source.data[k + 3] > 20) {
          histogram[Math.round(value)]++;
          count++;
          if (x < 3 || y < 3 || x >= width - 3 || y >= height - 3) {
            borderSum += value;
            borderCount++;
          }
        } else transparent++;
      }
    if (!count) throw new Error("L’image est entièrement transparente.");
    const split = thresholdFor(histogram, count);
    let nextTone = split + 1;
    while (nextTone < 255 && histogram[nextTone] === 0) nextTone++;
    const threshold = (split + nextTone) / 2;
    const darkInk = borderCount ? borderSum / borderCount >= threshold : true;
    const hasAlpha = transparent / (width * height) > 0.02;
    const output = ctx.createImageData(width, height);
    const at = (x, y) =>
      luminance[
        Math.min(height - 1, Math.max(0, y)) * width +
          Math.min(width - 1, Math.max(0, x))
      ];
    let visible = 0;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const i = y * width + x,
          k = i * 4;
        const gx =
          -at(x - 1, y - 1) +
          at(x + 1, y - 1) -
          2 * at(x - 1, y) +
          2 * at(x + 1, y) -
          at(x - 1, y + 1) +
          at(x + 1, y + 1);
        const gy =
          -at(x - 1, y - 1) -
          2 * at(x, y - 1) -
          at(x + 1, y - 1) +
          at(x - 1, y + 1) +
          2 * at(x, y + 1) +
          at(x + 1, y + 1);
        const edge = clamp(Math.hypot(gx, gy) / 420);
        const ink = clamp(
          0.5 +
            (darkInk ? threshold - luminance[i] : luminance[i] - threshold) /
              24,
        );
        const opacity =
          (source.data[k + 3] / 255) *
          clamp((hasAlpha ? 0.22 : 0) + ink * 0.72 + edge * 0.85);
        output.data[k] = output.data[k + 1] = output.data[k + 2] = 255;
        output.data[k + 3] = Math.round(opacity * 255);
        if (opacity > 0.05) visible++;
      }
    if (!visible)
      throw new Error(
        "Cette image ne contient pas assez de contraste pour créer une texture.",
      );
    ctx.putImageData(output, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = texture.magFilter = THREE.LinearFilter;
    return {
      texture,
      aspect: width / height,
      preview: canvas.toDataURL("image/png"),
      name: file.name,
    };
  } finally {
    decoded.close();
  }
}
