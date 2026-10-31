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
}
// Hue/lightness targets are editorial choices, not universal emotional meanings.
const TONES: Record<string, [number, number]> = {
  warm: [42, 65],
  water: [220, 30],
  air: [260, 35],
  soft: [105, 35],
  night: [8, 35],
  spark: [345, 70],
  wonder: [285, 60],
  surprise: [55, 70],
  confused: [270, 45],
  tired: [225, 25],
  trust: [175, 65],
  longing: [30, 45],
};
const roles = ["Écho", "Nuance", "Ouverture"];
export async function loadArtworks(
  ids: string[],
  signal: AbortSignal,
): Promise<Artwork[]> {
  const choices = ids.filter((id) => ART_QUERIES[id]).slice(0, 3);
  if (!choices.length) choices.push("warm");
  const key = "emociel-art-v3:" + choices.join(",");
  try {
    const cached = JSON.parse(localStorage.getItem(key) || "null");
    if (cached?.expires > Date.now() && cached.items?.length === 3)
      return cached.items;
  } catch {
    /* Storage is optional. */
  }
  const queries = [...new Set(choices.map((id) => ART_QUERIES[id]))];
  async function search(q: string) {
    const query = new URLSearchParams({
      q,
      limit: "40",
      fields: "id,title,artist_display,is_public_domain,image_id,color",
      // Filter before pagination: filtering just the first search page can
      // otherwise discard every result although eligible works exist later.
      "query[term][is_public_domain]": "true",
    });
    const params = JSON.stringify({
      query: {
        bool: {
          must: [
            { multi_match: { query: q, fields: ["title", "artist_title"] } },
          ],
          filter: [{ term: { is_public_domain: true } }],
        },
      },
    });
    query.delete("query[term][is_public_domain]");
    query.set("params", params);
    const endpoints = import.meta.env.PROD
      ? [
          "/museum-api/artworks/search",
          "https://api.artic.edu/api/v1/artworks/search",
        ]
      : ["https://api.artic.edu/api/v1/artworks/search"];
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${endpoint}?${query}`, {
          signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
        });
        if (!response.ok) throw new Error("Museum unavailable");
        const json = await response.json();
        if (!Array.isArray(json.data))
          throw new Error("Invalid museum response");
        return json.data.filter(
          (a: any) =>
            a.is_public_domain === true &&
            typeof a.image_id === "string" &&
            /^[a-zA-Z0-9-]+$/.test(a.image_id) &&
            typeof a.id === "number" &&
            typeof a.title === "string",
        );
      } catch {
        if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      }
    }
    return [];
  }
  // One unavailable artist must not discard the other successful searches.
  const pools = await Promise.all(queries.map(search));
  if (new Set(pools.flat().map((a: any) => a.id)).size < 3) {
    pools.push(await search("abstract composition color rhythm"));
  }
  const picked: Artwork[] = [];
  for (let i = 0; i < 3; i++) {
    const primary = TONES[choices[Math.min(i, choices.length - 1)]];
    const targetLight = Math.min(80, primary[1] + (i === 2 ? 12 : 0));
    const score = (a: any) => {
      const hueDistance =
        typeof a.color?.h === "number"
          ? Math.min(
              Math.abs(a.color.h - primary[0]),
              360 - Math.abs(a.color.h - primary[0]),
            ) / 180
          : 0.5;
      const lightDistance =
        typeof a.color?.l === "number"
          ? Math.abs(a.color.l - targetLight) / 100
          : 0.5;
      const abstract =
        /composition|abstract|improvisation|rhythm|color|colour|form|circle|square/i.test(
          a.title,
        )
          ? 0.65
          : 0;
      const figurative = /portrait|self-portrait|photograph|nude/i.test(a.title)
        ? 1
        : 0;
      return abstract - hueDistance - lightDistance * 0.6 - figurative;
    };
    const pool = pools
      .flat()
      .filter((a: any) => !picked.some((p) => p.id === a.id));
    pool.sort((a: any, b: any) => score(b) - score(a) || a.id - b.id);
    const candidate = pool[0];
    if (!candidate) throw new Error("Not enough verified public-domain works");
    picked.push({
      id: candidate.id,
      title: candidate.title,
      artist: candidate.artist_display,
      image: `${import.meta.env.PROD ? "/museum-images" : "https://www.artic.edu/iiif/2"}/${candidate.image_id}/full/843,/0/default.jpg`,
      source: `https://www.artic.edu/artworks/${candidate.id}`,
      role: roles[i],
    });
  }
  try {
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith("emociel-art-v3:"),
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
