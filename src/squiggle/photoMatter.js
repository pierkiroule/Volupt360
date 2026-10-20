const API = "https://commons.wikimedia.org/w/api.php";
const QUERIES = [
  "water surface texture",
  "lichen texture macro",
  "mineral texture",
  "tree bark texture",
  "abstract texture nature",
];
let session;
const plain = (value) =>
  new DOMParser()
    .parseFromString(String(value || ""), "text/html")
    .body.textContent.trim()
    .slice(0, 300);
const safeURL = (value, hosts) => {
  try {
    const u = new URL(
      String(value).startsWith("//") ? `https:${value}` : value,
    );
    if (u.protocol === "http:" && u.hostname === "creativecommons.org")
      u.protocol = "https:";
    return u.protocol === "https:" && hosts.includes(u.hostname)
      ? u.href
      : null;
  } catch {
    return null;
  }
};
export function allowedPhoto(page) {
  const info = page.imageinfo?.[0],
    meta = info?.extmetadata;
  if (!info || !meta) return null;
  const name = plain(meta.LicenseShortName?.value),
    licenseURL = safeURL(
      meta.LicenseUrl?.value ||
        (/^CC0/i.test(name)
          ? "https://creativecommons.org/publicdomain/zero/1.0/"
          : name === "Public domain"
            ? "https://creativecommons.org/publicdomain/mark/1.0/"
            : ""),
      ["creativecommons.org"],
    );
  if (!/^(CC BY(?: [1-4]\.\d)?|CC0(?: 1\.0)?|Public domain)$/i.test(name))
    return null;
  if (
    !licenseURL ||
    !/^\/(?:licenses\/by\/[1-4]\.\d|publicdomain\/(?:zero|mark)\/1\.0)(?:\/deed(?:\.[a-z-]+)?)?$/.test(
      new URL(licenseURL).pathname.replace(/\/$/, ""),
    )
  )
    return null;
  const url = safeURL(info.thumburl || info.url, ["upload.wikimedia.org"]);
  const source = safeURL(info.descriptionurl, ["commons.wikimedia.org"]);
  if (!url || !source) return null;
  return {
    url,
    source,
    title: plain(page.title).replace(/^File:/, ""),
    artist: plain(meta.Artist?.value) || "Auteur : voir la source",
    license: name,
    licenseURL,
  };
}
/** One request per session, four bounded thumbnails, HTTP cache and safe canvas reads. */
export function loadPhotoMatter({ retry = false } = {}) {
  if (retry) session = null;
  if (session) return session;
  session = (async () => {
    const signal = AbortSignal.timeout(10000);
    const url = new URL(API);
    url.search = new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      generator: "search",
      gsrsearch: `${QUERIES[Math.floor(Math.random() * QUERIES.length)]} filetype:bitmap`,
      gsrnamespace: "6",
      gsrlimit: "12",
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: "512",
      iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl",
    });
    let candidates = [];
    const start = Math.floor(Math.random() * QUERIES.length);
    for (let attempt = 0; attempt < 3 && !candidates.length; attempt++) {
      url.searchParams.set(
        "gsrsearch",
        `${QUERIES[(start + attempt) % QUERIES.length]} filetype:bitmap`,
      );
      const response = await fetch(url, {
        signal,
        mode: "cors",
        cache: "force-cache",
      });
      if (!response.ok) throw Error("Commons indisponible");
      const json = await response.json();
      candidates = Object.values(json.query?.pages || {})
        .map(allowedPhoto)
        .filter(Boolean)
        .sort(() => Math.random() - 0.5)
        .slice(0, 4);
    }
    if (!candidates.length) throw Error("Aucune matière libre disponible");
    const decoded = await Promise.all(
      candidates.map(async (credit) => {
        try {
          const result = await fetch(credit.url, {
            signal,
            mode: "cors",
            cache: "force-cache",
          });
          if (!result.ok) throw Error("Image indisponible");
          const blob = await result.blob();
          if (blob.size > 3 * 1024 * 1024) throw Error("Image trop lourde");
          const bitmap = await createImageBitmap(blob);
          return { bitmap, credit };
        } catch {
          return null;
        }
      }),
    );
    const images = decoded.filter(Boolean);
    if (!images.length) throw Error("Images non accessibles");
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    for (let i = 0; i < 4; i++) {
      const bitmap = images[i % images.length].bitmap;
      const edge = Math.min(bitmap.width, bitmap.height);
      ctx.save();
      ctx.translate(i * 256 + 128, 128);
      ctx.rotate(i % 2 ? Math.PI / 2 : 0);
      ctx.drawImage(
        bitmap,
        (bitmap.width - edge) / 2,
        (bitmap.height - edge) / 2,
        edge,
        edge,
        -128,
        -128,
        256,
        256,
      );
      ctx.restore();
    }
    for (const image of images) image.bitmap.close();
    const pixels = ctx.getImageData(0, 0, 1024, 256),
      data = pixels.data,
      luminance = new Float32Array(1024 * 256);
    for (let i = 0; i < luminance.length; i++)
      luminance[i] =
        (0.2126 * data[i * 4] +
          0.7152 * data[i * 4 + 1] +
          0.0722 * data[i * 4 + 2]) /
        255;
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 1024; x++) {
        const i = y * 1024 + x,
          l = luminance[i];
        const contour = Math.abs(
          l - luminance[y * 1024 + Math.max(Math.floor(x / 256) * 256, x - 2)],
        );
        // Preserve the photograph: restrained colour grading, not a luminance mask.
        for (let channel = 0; channel < 3; channel++) {
          const original = data[i * 4 + channel];
          const graded = original * 0.78 + l * 255 * 0.22;
          data[i * 4 + channel] = Math.max(
            0,
            Math.min(255, 128 + (graded - 128) * 1.12 - contour * 35),
          );
        }
        data[i * 4 + 3] = 255;
      }
    ctx.putImageData(pixels, 0, 0);
    return { canvas, credits: images.map((image) => image.credit) };
  })().catch(() => null);
  return session;
}
