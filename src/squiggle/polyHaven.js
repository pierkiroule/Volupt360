const API = "https://api.polyhaven.com";
const cache = new Map();
let catalog;
const validId = (id) =>
  typeof id === "string" && /^[a-z0-9_-]{1,100}$/.test(id);
const timeout = (signal) =>
  signal
    ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
    : AbortSignal.timeout(15000);
async function json(url, signal) {
  const r = await fetch(url, {
    signal: timeout(signal),
    mode: "cors",
    cache: "force-cache",
  });
  if (!r.ok) throw Error(`Poly Haven : HTTP ${r.status}`);
  return r.json();
}
export async function searchPolyHaven(query, signal) {
  if (!catalog) {
    const data = await json(`${API}/assets?t=textures`, signal);
    catalog = Object.entries(data)
      .filter(
        ([id, item]) => validId(id) && item && typeof item.name === "string",
      )
      .map(([id, item]) => ({
        id,
        name: item.name,
        categories: Array.isArray(item.categories)
          ? item.categories.filter((c) => typeof c === "string")
          : [],
        source: `https://polyhaven.com/a/${id}`,
        thumbnail: `https://cdn.polyhaven.com/asset_img/thumbs/${id}.png?width=256`,
      }));
  }
  const q = query.toLowerCase().trim();
  return catalog
    .filter((a) =>
      `${a.id} ${a.name} ${a.categories.join(" ")}`.toLowerCase().includes(q),
    )
    .slice(0, 24);
}
function mapFile(files, types) {
  for (const type of types)
    for (const resolution of ["1k", "2k"])
      for (const format of ["jpg", "png"]) {
        const file = files[type]?.[resolution]?.[format];
        if (!file?.url || file.size > 8 * 1024 * 1024) continue;
        try {
          const u = new URL(file.url);
          if (
            u.protocol === "https:" &&
            ["dl.polyhaven.org", "cdn.polyhaven.com"].includes(u.hostname)
          )
            return u.href;
        } catch {
          /* invalid provider URL */
        }
      }
  return null;
}
async function image(url, signal) {
  const response = await fetch(url, {
    signal: timeout(signal),
    mode: "cors",
    cache: "force-cache",
  });
  if (!response.ok) throw Error(`Texture : HTTP ${response.status}`);
  if (Number(response.headers.get("content-length")) > 8 * 1024 * 1024)
    throw Error("Texture trop lourde");
  const blob = await response.blob();
  if (blob.size > 8 * 1024 * 1024) throw Error("Texture trop lourde");
  return createImageBitmap(blob);
}
export async function loadPolyHaven(asset, callerSignal) {
  const signal = timeout(callerSignal);
  if (!validId(asset.id)) throw Error("Texture invalide");
  if (cache.has(asset.id)) return cache.get(asset.id);
  const files = await json(`${API}/files/${asset.id}`, signal),
    diff = mapFile(files, ["diff", "albedo", "color", "basecolor"]);
  if (!diff) throw Error("Carte de couleur légère indisponible");
  const bitmap = await image(diff, signal);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  try {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 256, 256);
    ctx.drawImage(bitmap, 0, 0, 256, 256);
  } finally {
    bitmap.close();
  }
  const height = document.createElement("canvas");
  height.width = height.height = 256;
  const h = height.getContext("2d");
  let displacement = false;
  const disp = mapFile(files, ["disp"]);
  if (disp) {
    try {
      const bump = await image(disp, signal);
      try {
        h.drawImage(bump, 0, 0, 256, 256);
        displacement = true;
      } finally {
        bump.close();
      }
    } catch (error) {
      if (signal?.aborted) throw error;
    }
  }
  if (!displacement) {
    const pixels = ctx.getImageData(0, 0, 256, 256);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const value =
        0.2126 * pixels.data[i] +
        0.7152 * pixels.data[i + 1] +
        0.0722 * pixels.data[i + 2];
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
    }
    h.putImageData(pixels, 0, 0);
  }
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const result = { ...asset, canvas, height, displacement, license: "CC0" };
  if (cache.size >= 4) cache.delete(cache.keys().next().value);
  cache.set(asset.id, result);
  return result;
}
