/** Artistic associations, never an interpretation of the visitor. Edit this table freely. */
export const ART_QUERIES: Record<string, string> = {
  warm: "Robert Delaunay",
  water: "Wassily Kandinsky",
  air: "Paul Klee",
  soft: "Paul Klee",
  night: "Wassily Kandinsky",
  spark: "Robert Delaunay",
  wonder: "Robert Delaunay",
  surprise: "Piet Mondrian",
  confused: "Paul Klee",
  tired: "Piet Mondrian",
  trust: "Piet Mondrian",
  longing: "Paul Klee",
};
export interface Artwork {
  id: number;
  title: string;
  artist: string;
  image: string;
  source: string;
  role: string;
  license?: string;
  licenseUrl?: string;
}
const roles = ["Écho", "Nuance", "Ouverture"];
export async function loadArtworks(
  ids: string[],
  signal: AbortSignal,
): Promise<Artwork[]> {
  const choices = ids.filter((id) => ART_QUERIES[id]).slice(0, 3);
  if (!choices.length) choices.push("warm");
  const key = "emociel-commons-v1:" + choices.join(",");
  try {
    const cached = JSON.parse(localStorage.getItem(key) || "null");
    if (cached?.expires > Date.now() && cached.items?.length === 3)
      return cached.items;
  } catch {
    /* Storage is optional. */
  }
  const queries = [...new Set(choices.map((id) => ART_QUERIES[id]))];
  const text = (html: string | undefined) => {
    const document = new DOMParser().parseFromString(html || "", "text/html");
    return document.body.textContent?.trim() || "";
  };
  const safeUrl = (value: unknown, host: string) => {
    try {
      const url = new URL(String(value));
      return url.protocol === "https:" && url.hostname === host ? url.href : "";
    } catch {
      return "";
    }
  };
  async function search(q: string): Promise<Artwork[]> {
    const query = new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      generator: "search",
      gsrsearch: q + " painting filetype:bitmap",
      gsrnamespace: "6",
      gsrlimit: "30",
      prop: "imageinfo",
      iiprop: "url|extmetadata|mime",
      iiurlwidth: "843",
      iiextmetadatalanguage: "fr",
    });
    try {
      const response = await fetch(
        `https://commons.wikimedia.org/w/api.php?${query}`,
        {
          signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]),
        },
      );
      if (!response.ok) return [];
      const json = await response.json();
      return Object.values(json.query?.pages || {}).flatMap((page: any) => {
        const info = page.imageinfo?.[0],
          meta = info?.extmetadata;
        if (!meta || !/^image\/(jpeg|png|webp)$/.test(info.mime || ""))
          return [];
        const license = text(meta.LicenseShortName?.value);
        // Do not mistake a general free licence or a public-domain artwork
        // with a restricted photograph for a CC0/public-domain image.
        if (
          !/^(CC0(?: 1\.0)?|Public domain|Domaine public|PDM(?: 1\.0)?)$/i.test(
            license,
          )
        )
          return [];
        if (text(meta.Restrictions?.value)) return [];
        const image = safeUrl(
          info.thumburl || info.url,
          "upload.wikimedia.org",
        );
        const source = safeUrl(info.descriptionurl, "commons.wikimedia.org");
        if (!image || !source || typeof page.pageid !== "number") return [];
        return [
          {
            id: page.pageid,
            title:
              text(meta.ObjectName?.value) || page.title.replace(/^File:/, ""),
            artist: text(meta.Artist?.value) || "Artiste non renseigné",
            image,
            source,
            role: "",
            license,
            licenseUrl: safeUrl(meta.LicenseUrl?.value, "creativecommons.org"),
          },
        ];
      });
    } catch {
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      return [];
    }
  }
  // One unavailable artist must not discard the other successful searches.
  const pools = await Promise.all(queries.map(search));
  if (new Set(pools.flat().map((a: any) => a.id)).size < 3) {
    pools.push(await search("abstract painting"));
  }
  const picked: Artwork[] = [];
  for (let i = 0; i < 3; i++) {
    const preferred = pools[Math.min(i, pools.length - 1)] || [];
    const pool = [...preferred, ...pools.flat()].filter(
      (a) => !picked.some((p) => p.id === a.id),
    );
    // Search ranking follows the selected artist. Prefer abstract composition
    // titles over portraits; do not claim a colour analysis without metadata.
    pool.sort(
      (a, b) =>
        Number(
          /composition|abstract|improvisation|rhythm|color|colour|form|circle|square/i.test(
            b.title,
          ),
        ) -
        Number(
          /composition|abstract|improvisation|rhythm|color|colour|form|circle|square/i.test(
            a.title,
          ),
        ),
    );
    const candidate = pool[0];
    if (!candidate) throw new Error("Not enough verified public-domain works");
    picked.push({ ...candidate, role: roles[i] });
  }
  try {
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith("emociel-commons-v1:"),
    );
    while (keys.length >= 12) {
      const oldest = keys.shift();
      if (oldest) localStorage.removeItem(oldest);
    }
    localStorage.setItem(
      key,
      JSON.stringify({ expires: Date.now() + 86400000 * 7, items: picked }),
    );
  } catch {
    /* optional */
  }
  return picked;
}
