import { drawMedia } from "../audio/birds/catalog.js";
import { mediaBytes, forgetMedia } from "../audio/birds/recordingCache.js";

export function analyzeNaturePixels(pixels, width, height) {
  const histogram = Array.from({ length: 64 }, () => ({
      r: 0,
      g: 0,
      b: 0,
      n: 0,
    })),
    light = new Float32Array(width * height),
    field = new Uint8Array(width * height * 2);
  let mean = 0,
    squared = 0,
    saturation = 0,
    edges = 0;
  for (let i = 0; i < light.length; i++) {
    const r = pixels[i * 4],
      g = pixels[i * 4 + 1],
      b = pixels[i * 4 + 2],
      bucket = histogram[(r >> 6) * 16 + (g >> 6) * 4 + (b >> 6)];
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    bucket.n++;
    light[i] = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
    mean += light[i];
    squared += light[i] ** 2;
    saturation += (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
  }
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x,
        edge = Math.min(
          1,
          (Math.abs(light[i] - light[y * width + Math.min(width - 1, x + 1)]) +
            Math.abs(
              light[i] - light[Math.min(height - 1, y + 1) * width + x],
            )) *
            3,
        );
      edges += edge;
      field[i * 2] = Math.round(light[i] * 255);
      field[i * 2 + 1] = Math.round(edge * 255);
    }
  const palette = histogram
    .filter((bucket) => bucket.n)
    .sort((a, b) => b.n - a.n)
    .slice(0, 6)
    .map((bucket) => [
      bucket.r / bucket.n / 255,
      bucket.g / bucket.n / 255,
      bucket.b / bucket.n / 255,
    ]);
  mean /= light.length;
  return {
    palette,
    field,
    width,
    height,
    light: mean,
    contrast: Math.sqrt(Math.max(0, squared / light.length - mean ** 2)),
    edge: edges / light.length,
    saturation: saturation / light.length,
  };
}
export async function drawNature(
  excluded,
  { signal, request = fetch, random, onCandidate = () => {} } = {},
) {
  const photo = await drawMedia("image", excluded, { signal, request, random });
  onCandidate(photo.pageid);
  const bytes = await mediaBytes(photo, { signal, request });
  let bitmap;
  try {
    bitmap = await createImageBitmap(new Blob([bytes], { type: photo.mime }));
  } catch (cause) {
    await forgetMedia(photo);
    throw cause;
  }
  try {
    if (bitmap.width * bitmap.height > 16000000)
      throw new Error("Photo trop grande.");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0, 64, 64);
    return {
      photo,
      visual: analyzeNaturePixels(ctx.getImageData(0, 0, 64, 64).data, 64, 64),
    };
  } finally {
    bitmap.close();
  }
}
export function combineNatureProfile(profile, nature) {
  const { visual, photo } = nature,
    seed = (profile.seed ^ Math.imul(photo.pageid, 2246822519)) >>> 0;
  const families =
    visual.edge > 0.22
      ? [
          "filaments",
          "calligraphie",
          "plumes",
          "hachures",
          "racines",
          "network",
        ]
      : visual.contrast > 0.16
        ? [
            "corolles",
            "feuilles",
            "echo",
            "filamentslibres",
            "falaises",
            "lucioles",
          ]
        : ["voiles", "dilution", "brumes", "lagons", "aurore", "bulles"];
  const color = visual.palette[0].map((value) => Math.round(value * 255));
  return {
    ...profile,
    seed,
    baseId: families[seed % families.length],
    color: `rgb(${color.join(",")})`,
    width: 0.65 + visual.contrast * 2,
    opacity: 0.6 + Math.min(0.3, visual.edge + visual.contrast),
    visual,
    photo,
  };
}
