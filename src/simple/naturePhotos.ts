export interface PhotoCredit {
  title: string;
  author: string;
  license: string;
  licenseUrl: string;
  source: string;
  thumbnail: string;
}
export interface NaturePhoto {
  credit: PhotoCredit;
  bitmap: ImageBitmap;
}
const QUERIES: Record<string, string> = {
  warm: "sunlight forest",
  water: "rain leaves",
  air: "grass wind",
  soft: "fog forest",
  night: "storm clouds landscape",
  spark: "sunbeams trees",
  wonder: "rainbow landscape",
  surprise: "snow forest",
  confused: "aurora landscape",
  tired: "moon night landscape",
  trust: "clouds mountains",
  longing: "rain water reflections",
};
const cache = new Map<string, { at: number; photos: PhotoCredit[] }>();
const TTL = 24 * 60 * 60 * 1000;
function plain(value: unknown) {
  return typeof value === "string"
    ? new DOMParser()
        .parseFromString(value, "text/html")
        .body.textContent?.trim()
        .slice(0, 280) || ""
    : "";
}
/** Validate untrusted API metadata; HTML is never inserted into the interface. */
export function parseCommons(data: unknown): PhotoCredit[] {
  const pages = (data as { query?: { pages?: Record<string, unknown> } })?.query
    ?.pages;
  if (!pages) return [];
  const output: PhotoCredit[] = [];
  for (const item of Object.values(pages)) {
    const page = item as {
      title?: string;
      imageinfo?: {
        thumburl?: string;
        descriptionurl?: string;
        mime?: string;
        width?: number;
        height?: number;
        extmetadata?: Record<string, { value?: unknown }>;
      }[];
    };
    if (!page || typeof page !== "object") continue;
    const info = page.imageinfo?.[0],
      m = info?.extmetadata;
    if (
      !info ||
      !m ||
      !/^image\/(jpeg|png|webp)$/.test(info.mime || "") ||
      (info.width || 0) < 256 ||
      (info.height || 0) < 256
    )
      continue;
    const license = plain(m.LicenseShortName?.value),
      licenseUrl = plain(m.LicenseUrl?.value).replace(/^http:/, "https:");
    const pd = /public domain|cc0|pdm/i.test(license);
    if (
      !pd &&
      !/^https:\/\/creativecommons.org\/licenses\/by(?:-sa)?\/[\d.]+\/?$/i.test(
        licenseUrl,
      )
    )
      continue;
    const author =
      plain(m.Attribution?.value) ||
      plain(m.Artist?.value) ||
      plain(m.Credit?.value);
    if (!pd && !author) continue;
    try {
      const thumbnail = new URL(info.thumburl || ""),
        source = new URL(info.descriptionurl || "");
      if (
        thumbnail.protocol !== "https:" ||
        thumbnail.hostname !== "upload.wikimedia.org" ||
        source.protocol !== "https:" ||
        source.hostname !== "commons.wikimedia.org"
      )
        continue;
      output.push({
        title: plain(page.title).replace(/^File:/, ""),
        author: author || "Auteur indiqué sur la source",
        license: license || "Domaine public",
        licenseUrl: pd
          ? /^https:\/\/creativecommons.org\/publicdomain\/(?:zero|mark)\/1.0\/?$/i.test(
              licenseUrl,
            )
            ? licenseUrl
            : /cc0/i.test(license)
              ? "https://creativecommons.org/publicdomain/zero/1.0/"
              : "https://creativecommons.org/publicdomain/mark/1.0/"
          : licenseUrl,
        source: source.href,
        thumbnail: thumbnail.href,
      });
    } catch {
      /* Ignore missing or unsafe media URLs. */
    }
  }
  return output;
}
async function metadata(id: string, signal: AbortSignal) {
  const key = QUERIES[id] || QUERIES.trust,
    hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.photos;
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: "12",
    gsrsearch: `filetype:bitmap ${key} -intitle:map -intitle:diagram -intitle:logo`,
    prop: "imageinfo",
    iiprop: "url|mime|size|extmetadata",
    iiurlwidth: "512",
  });
  const response = await fetch(
    "https://commons.wikimedia.org/w/api.php?" + params,
    { signal },
  );
  if (!response.ok) throw Error("Commons " + response.status);
  const photos = parseCommons(await response.json());
  if (photos.length) {
    cache.set(key, { at: Date.now(), photos });
    if (cache.size > 12) cache.delete(cache.keys().next().value!);
  }
  return photos;
}
export async function loadNaturePhotos(
  ids: string[],
  signal: AbortSignal,
): Promise<NaturePhoto[]> {
  const controller = new AbortController(),
    abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  const timer = setTimeout(abort, 18000);
  const loaded: { index: number; photo: NaturePhoto }[] = [];
  try {
    const results = await Promise.allSettled(
      [...new Set(ids)]
        .slice(0, 3)
        .map((id) => metadata(id, controller.signal)),
    );
    const groups = results
      .filter(
        (r): r is PromiseFulfilledResult<PhotoCredit[]> =>
          r.status === "fulfilled",
      )
      .map((r) => r.value);
    const pool: PhotoCredit[] = [],
      seen = new Set<string>();
    for (let round = 0; round < 12; round++)
      for (const group of groups) {
        const photo = group[round];
        if (photo && !seen.has(photo.source)) {
          pool.push(photo);
          seen.add(photo.source);
        }
      }
    let next = 0;
    await Promise.all(
      Array.from({ length: 3 }, async () => {
        while (
          next < pool.length &&
          loaded.length < 6 &&
          !controller.signal.aborted
        ) {
          const index = next++,
            credit = pool[index];
          try {
            const response = await fetch(credit.thumbnail, {
              signal: controller.signal,
              mode: "cors",
              cache: "force-cache",
            });
            if (
              !response.ok ||
              !response.headers.get("content-type")?.startsWith("image/")
            )
              continue;
            const blob = await response.blob();
            if (blob.size > 3 * 1024 * 1024) continue;
            const bitmap = await createImageBitmap(blob);
            loaded.push({ index, photo: { credit, bitmap } });
          } catch {
            /* CORS, missing thumbnail or decode error: try another licensed photo. */
          }
        }
      }),
    );
    if (signal.aborted) {
      for (const p of loaded) p.photo.bitmap.close();
      throw new DOMException("Annulé", "AbortError");
    }
    loaded.sort((a, b) => a.index - b.index);
    for (const p of loaded.slice(6)) p.photo.bitmap.close();
    if (!loaded.length)
      throw Error("Photographies indisponibles pour le moment.");
    return loaded.slice(0, 6).map((p) => p.photo);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}
