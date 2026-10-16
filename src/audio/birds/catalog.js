import { withTimeout } from "./network.js";
export const API = "https://commons.wikimedia.org/w/api.php";
export const THEMES = [
  "moss",
  "feather",
  "bark",
  "water",
  "lichen",
  "flower",
  "foliage",
];
export const AUDIO_THEMES = ["bird song", "bird call", "birdsong"];
export const LICENSES = {
  cc0: {
    name: "CC0",
    url: "https://creativecommons.org/publicdomain/zero/1.0/",
  },
  "cc-by": {
    name: "CC BY",
    url: "https://creativecommons.org/licenses/by/4.0/",
  },
};
export function plainText(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(
      /&(?:nbsp|amp|quot|lt|gt|#39);/g,
      (m) =>
        ({
          "&nbsp;": " ",
          "&amp;": "&",
          "&quot;": '"',
          "&lt;": "<",
          "&gt;": ">",
          "&#39;": "'",
        })[m],
    )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
}
export function mediaUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname === "upload.wikimedia.org" &&
      !url.port &&
      !url.username &&
      !url.password &&
      url.pathname.startsWith("/wikipedia/commons/")
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function licenseInfo(metadata = {}) {
  const raw = metadata.LicenseUrl?.value || "";
  try {
    const url = new URL(raw);
    if (
      url.hostname !== "creativecommons.org" ||
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.port
    )
      return null;
    const cc0 = /^\/publicdomain\/zero\/1\.0\/?$/.test(url.pathname),
      by = /^\/licenses\/by\/(1\.0|2\.0|2\.5|3\.0|4\.0)\/?$/.exec(url.pathname);
    if (!cc0 && !by) return null;
    return {
      license: cc0 ? "cc0" : "cc-by",
      licenseName: cc0 ? "CC0 1.0" : `CC BY ${by[1]}`,
      licenseUrl: `https://creativecommons.org${url.pathname.endsWith("/") ? url.pathname : url.pathname + "/"}`,
    };
  } catch {
    return null;
  }
}
export function recordings(pages, kind = "audio") {
  return (Array.isArray(pages) ? pages : Object.values(pages || {})).flatMap(
    (page) => {
      const info = page.imageinfo?.[0],
        rights = licenseInfo(info?.extmetadata),
        original = mediaUrl(info?.url);
      if (
        !Number.isSafeInteger(page.pageid) ||
        page.pageid <= 0 ||
        page.ns !== 6 ||
        !info ||
        !rights ||
        !original
      )
        return [];
      if (
        kind === "audio"
          ? !/^audio\//.test(info.mime || "")
          : !/^image\/(jpeg|png|webp)$/.test(info.mime || "")
      )
        return [];
      if (
        kind === "image" &&
        !info.thumburl &&
        (!Number.isFinite(info.width) ||
          !Number.isFinite(info.height) ||
          info.width * info.height > 16000000)
      )
        return [];
      const description =
        plainText(info.extmetadata?.ImageDescription?.value || "") +
        " " +
        plainText(info.extmetadata?.Categories?.value || "");
      if (
        kind === "image" &&
        /AI.generated|stable diffusion|midjourney|DALL.E|vector illustration|diagram/i.test(
          description,
        )
      )
        return [];
      const label = plainText(
        page.title.replace(/^File:/, " ").replace(/\.[^.]+$/, ""),
      );
      return [
        {
          pageid: page.pageid,
          sound: page.pageid,
          taxon: page.pageid,
          title: page.title,
          commonName: label,
          species: "Enregistrement d’oiseau · Wikimedia Commons",
          ...rights,
          author: plainText(
            info.extmetadata?.Artist?.value || "Contributeur Wikimedia Commons",
          ),
          credit: plainText(info.extmetadata?.Credit?.value || ""),
          source: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
          url:
            kind === "image" ? mediaUrl(info.thumburl) || original : original,
          original,
          kind,
          mime: kind === "image" ? info.thumbmime || info.mime : info.mime,
        },
      ];
    },
  );
}
export function randomUnit() {
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return n[0] / 4294967296;
}
export function searchParams(kind, theme, offset = 0) {
  if (
    !["image", "audio"].includes(kind) ||
    !(kind === "image" ? THEMES : AUDIO_THEMES).includes(theme) ||
    ![0, 20, 40].includes(Number(offset))
  )
    throw new Error("Recherche non autorisée");
  return new URLSearchParams({
    action: "query",
    maxlag: "5",
    format: "json",
    formatversion: "2",
    origin: "*",
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: "20",
    gsroffset: String(offset),
    gsrsearch:
      kind === "image"
        ? `filetype:bitmap ${theme} nature -illustration -diagram -logo`
        : `filetype:audio ${theme}`,
    prop: "imageinfo",
    iiprop: "url|mime|size|extmetadata",
    iiurlwidth: "384",
    iiurlheight: "384",
    iiextmetadatafilter:
      "LicenseShortName|LicenseUrl|Artist|Credit|ImageDescription|Categories",
  });
}
export async function drawMedia(
  kind,
  excluded = [],
  { signal, request = fetch, random = randomUnit } = {},
) {
  const themes = [...(kind === "image" ? THEMES : AUDIO_THEMES)],
    skip = new Set(excluded);
  for (let i = themes.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [themes[i], themes[j]] = [themes[j], themes[i]];
  }
  for (const theme of themes.slice(0, 3))
    for (const offset of [0, 20, 40]) {
      const data = await withTimeout(signal, async (timedSignal) => {
        let response;
        try {
          response = await request(
            `${API}?${searchParams(kind, theme, offset)}`,
            { signal: timedSignal, credentials: "omit" },
          );
        } catch (error) {
          if (signal?.aborted) throw error;
          response = await request(
            `/api/commons-search?kind=${kind}&theme=${encodeURIComponent(theme)}&offset=${offset}`,
            { signal: timedSignal },
          );
        }
        if (!response.ok)
          throw new Error(
            `Wikimedia Commons indisponible (${response.status}).`,
          );
        const data = await response.json();
        if (data.error) throw new Error("La recherche Commons a échoué.");
        return data;
      });
      const items = recordings(data.query?.pages || [], kind).filter(
        (item) => !skip.has(item.pageid),
      );
      if (items.length)
        return { ...items[Math.floor(random() * items.length)], theme };
    }
  throw new Error(
    `Aucun ${kind === "image" ? "photographie" : "chant"} autorisé trouvé dans la sélection Commons.`,
  );
}
export const drawRecording = (excluded, options) =>
  drawMedia("audio", excluded, options);
export function assignRecordings(ids, candidates) {
  const unique = [
    ...new Map(candidates.map((item) => [item.sound, item])).values(),
  ];
  return Object.fromEntries(ids.map((id, i) => [id, unique[i] || null]));
}
export async function fetchCatalog(ids, options = {}) {
  const items = [];
  for (const id of ids) {
    try {
      items.push(
        await drawRecording(
          items.map((item) => item.sound),
          options,
        ),
      );
    } catch {
      if (!items.length) throw new Error("Chants Commons indisponibles.");
      break;
    }
  }
  return assignRecordings(ids, items);
}
