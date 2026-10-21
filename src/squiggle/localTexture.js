/** Public asset only: no catalogue, remote image API or third-party request. */
export const LOCAL_TEXTURE_URL = `${import.meta.env.BASE_URL}textures/Text1.png`;
let pending;
export function loadLocalTexture({ retry = false } = {}) {
  if (retry) pending = null;
  if (pending) return pending;
  pending = (async () => {
    const response = await fetch(LOCAL_TEXTURE_URL, {
      cache: retry ? "reload" : "force-cache",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw Error("Text1.png indisponible");
    if (Number(response.headers.get("content-length")) > 16 * 1024 * 1024)
      throw Error("Texture trop lourde");
    const blob = await response.blob();
    if (blob.size > 16 * 1024 * 1024) throw Error("Texture trop lourde");
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
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
    return {
      id: "Text1",
      name: "Text1.png",
      canvas,
      height,
      displacement: false,
    };
  })().catch(() => null);
  return pending;
}
