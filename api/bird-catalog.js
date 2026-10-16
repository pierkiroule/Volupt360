import { apiJson, query, reply } from "../server/inaturalist.js";
export default async function handler(req, res) {
  if (req.method !== "GET") return reply(res, 405, { error: "GET uniquement" });
  const params = query(req),
    page = params.get("page") || "1",
    threatened = params.get("threatened") === "true";
  if (!/^[1-3]$/.test(page)) return reply(res, 400, { error: "Page invalide" });
  const upstream = new URLSearchParams({
    sounds: "true",
    taxon_id: "3",
    rank: "species",
    per_page: "100",
    page,
    order_by: "id",
    order: "desc",
  });
  if (threatened) upstream.set("threatened", "true");
  try {
    const data = await apiJson(`observations?${upstream}`);
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=900, stale-while-revalidate=3600",
    );
    reply(res, 200, data);
  } catch {
    reply(res, 502, { error: "iNaturalist indisponible" });
  }
}
