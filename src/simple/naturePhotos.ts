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
const QUERIES: Record<string, readonly string[]> = {
  warm: ["sunlight forest", "sunlight landscape", "sunset nature"],
  water: ["rain leaves", "raindrops", "water drops"],
  air: ["grass wind", "wind trees", "grass meadow"],
  soft: ["fog forest", "mist landscape", "fog"],
  night: ["storm clouds landscape", "storm clouds", "cloudy sky"],
  spark: ["sunbeams trees", "sun rays landscape", "sunlight"],
  wonder: ["rainbow landscape", "rainbow sky", "rainbow"],
  surprise: ["snow forest", "snow landscape", "snow"],
  confused: ["aurora landscape", "aurora borealis", "night sky"],
  tired: ["moon night landscape", "moon landscape", "night sky"],
  trust: ["clouds mountains", "clouds sky", "clouds"],
  longing: ["rain water reflections", "water reflections", "raindrops"],
};
const HISTORY_KEY = "emociel.photos.recent.v1";
function history(key: string): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || "{}")[key];
    return Array.isArray(value)
      ? value.filter((v): v is string => typeof v === "string").slice(0, 12)
      : [];
  } catch {
    return [];
  }
}
function remember(key: string, photos: PhotoCredit[]) {
  try {
    const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) || "{}");
    const entries =
      stored && typeof stored === "object" && !Array.isArray(stored)
        ? Object.entries(stored)
            .filter(([k]) => k !== key)
            .slice(-11)
        : [];
    const recent = [
      ...new Set([...photos.map((p) => p.source), ...history(key)]),
    ].slice(0, 12);
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(Object.fromEntries([...entries, [key, recent]])),
    );
  } catch {
    /* Storage denial must not prevent loading new photographs. */
  }
}
/** Shuffle candidates, not the displayed atlas. New visits are not tied to API ordering. */
export function shuffleCandidates(photos: PhotoCredit[]): PhotoCredit[] {
  const shuffled = [...photos];
  const random = new Uint32Array(1);
  for (let i = shuffled.length - 1; i > 0; i--) {
    crypto.getRandomValues(random);
    const j = Math.floor((random[0] / 4294967296) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
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
async function metadata(key: string, signal: AbortSignal) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < (hit.photos.length ? TTL : 60000))
    return hit.photos;
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: "24",
    gsrsearch: `filetype:bitmap ${key} -intitle:map -intitle:diagram -intitle:logo`,
    prop: "imageinfo",
    iiprop: "url|mime|size|extmetadata",
    iiurlwidth: "512",
  });
  const request = new AbortController(),
    cancel = () => request.abort();
  signal.addEventListener("abort", cancel, { once: true });
  if (signal.aborted) cancel();
  const timeout = setTimeout(cancel, 6500);
  try {
    const response = await fetch(
      "https://commons.wikimedia.org/w/api.php?" + params,
      { signal: request.signal },
    );
    if (!response.ok) throw Error("Commons " + response.status);
    const photos = parseCommons(await response.json());
    cache.set(key, { at: Date.now(), photos });
    if (cache.size > 24) cache.delete(cache.keys().next().value!);
    return photos;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", cancel);
  }
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
  const selected = [...new Set(ids.filter((id) => Object.hasOwn(QUERIES, id)))]
    .sort()
    .slice(0, 3);
  if (!selected.length) selected.push("trust");
  const key = selected.join("|"),
    previous = new Set(history(key)),
    pool: PhotoCredit[] = [];
  const seen = new Set<string>(),
    attempted = new Set<string>();
  async function decode(candidates: PhotoCredit[]) {
    let next = 0;
    await Promise.all(
      Array.from({ length: 3 }, async () => {
        while (
          next < candidates.length &&
          loaded.length < 6 &&
          !controller.signal.aborted
        ) {
          const credit = candidates[next++];
          if (attempted.has(credit.source)) continue;
          attempted.add(credit.source);
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
            loaded.push({
              index: pool.indexOf(credit),
              photo: { credit, bitmap },
            });
          } catch {
            /* Decode/CORS/network failure: try the next licensed candidate. */
          }
        }
      }),
    );
  }
  try {
    for (
      let level = 0;
      level < 3 && loaded.length < 6 && !controller.signal.aborted;
      level++
    ) {
      const results = await Promise.allSettled(
        selected.map((id) => metadata(QUERIES[id][level], controller.signal)),
      );
      const groups = results
        .filter(
          (r): r is PromiseFulfilledResult<PhotoCredit[]> =>
            r.status === "fulfilled",
        )
        .map((r) => shuffleCandidates(r.value));
      // A complete service outage is not solved by sending more searches.
      if (!groups.length) break;
      for (let round = 0; round < 24; round++)
        for (const group of groups) {
          const photo = group[round];
          if (photo && !seen.has(photo.source)) {
            pool.push(photo);
            seen.add(photo.source);
          }
        }
      const fresh = pool.filter(
        (photo) => !previous.has(photo.source) && !attempted.has(photo.source),
      );
      await decode(fresh);
    }
    // Prefer unseen photos; only reuse older ones when all thematic searches are exhausted.
    if (loaded.length < 6 && !controller.signal.aborted)
      await decode(pool.filter((photo) => !attempted.has(photo.source)));
    if (signal.aborted) {
      for (const p of loaded) p.photo.bitmap.close();
      throw new DOMException("Annulé", "AbortError");
    }
    loaded.sort((a, b) => a.index - b.index);
    for (const p of loaded.slice(6)) p.photo.bitmap.close();
    if (!loaded.length)
      throw Error("Photographies indisponibles pour le moment.");
    const output = loaded.slice(0, 6).map((p) => p.photo);
    remember(
      key,
      output.map((p) => p.credit),
    );
    return output;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}
