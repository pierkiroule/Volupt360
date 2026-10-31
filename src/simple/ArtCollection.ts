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
  const key = "emociel-art-v2:" + choices.join(",");
  try {
    const cached = JSON.parse(localStorage.getItem(key) || "null");
    if (cached?.expires > Date.now() && cached.items?.length === 3)
      return cached.items;
  } catch {
    /* Storage is optional. */
  }
  const queries = [...new Set(choices.map((id) => ART_QUERIES[id]))];
  const pools = await Promise.all(
    queries.map(async (q) => {
      const url = new URL("https://api.artic.edu/api/v1/artworks/search");
      url.searchParams.set("q", q);
      url.searchParams.set("limit", "30");
      url.searchParams.set(
        "fields",
        "id,title,artist_display,is_public_domain,image_id,color",
      );
      const response = await fetch(url, {
        signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]),
      });
      if (!response.ok) throw new Error("Museum unavailable");
      const json = await response.json();
      // Only the museum’s explicit public-domain flag authorizes image use.
      return (json.data || []).filter(
        (a: any) =>
          a.is_public_domain === true &&
          typeof a.image_id === "string" &&
          /^[a-zA-Z0-9-]+$/.test(a.image_id) &&
          typeof a.id === "number" &&
          typeof a.title === "string",
      );
    }),
  );
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
      image: `https://www.artic.edu/iiif/2/${candidate.image_id}/full/843,/0/default.jpg`,
      source: `https://www.artic.edu/artworks/${candidate.id}`,
      role: roles[i],
    });
  }
  try {
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith("emociel-art-v2:"),
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
