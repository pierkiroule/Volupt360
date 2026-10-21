/** Bundled assets only; shared decoding and independent fallback for each image. */
export const LOCAL_TEXTURES = Object.freeze([
  {
    id: "Text1",
    name: "Text1.png",
    url: `${import.meta.env.BASE_URL}textures/Text1.png`,
  },
  {
    id: "rezo",
    name: "rezo.png",
    url: `${import.meta.env.BASE_URL}textures/rezo.png`,
  },
]);
const decoded = new Map();
let pending;
async function decode(source, retry) {
  if (decoded.has(source.id)) return decoded.get(source.id);
  try {
    const response = await fetch(source.url, {
      cache: retry ? "reload" : "default",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw Error("Texture indisponible");
    if (Number(response.headers.get("content-length")) > 16 * 1024 * 1024)
      throw Error("Texture trop lourde");
    const blob = await response.blob();
    if (blob.size > 16 * 1024 * 1024) throw Error("Texture trop lourde");
    const bitmap = await createImageBitmap(blob),
      canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    try {
      ctx.drawImage(bitmap, 0, 0, 256, 256);
    } finally {
      bitmap.close();
    }
    const height = document.createElement("canvas");
    height.width = height.height = 256;
    const pixels = ctx.getImageData(0, 0, 256, 256);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const value =
        0.2126 * pixels.data[i] +
        0.7152 * pixels.data[i + 1] +
        0.0722 * pixels.data[i + 2];
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
    }
    height.getContext("2d").putImageData(pixels, 0, 0);
    const result = { ...source, canvas, height, displacement: false };
    decoded.set(source.id, result);
    return result;
  } catch {
    return null;
  }
}
export function loadLocalTextures({ retry = false } = {}) {
  if (retry) pending = null;
  if (!pending)
    pending = Promise.all(
      LOCAL_TEXTURES.map((source) => decode(source, retry)),
    ).then((items) => items.filter(Boolean));
  return pending;
}
export function localTextureStatus(items) {
  return items.length === LOCAL_TEXTURES.length
    ? "ready"
    : items.length
      ? "partial"
      : "unavailable";
}
