import { apiJson, query, reply } from "../server/commons.js";
import { searchParams } from "../src/audio/birds/catalog.js";
export default async function handler(req, res) {
  if (req.method !== "GET") return reply(res, 405, { error: "GET uniquement" });
  const p = query(req);
  let params;
  try {
    params = searchParams(
      p.get("kind"),
      p.get("theme"),
      Number(p.get("offset") || 0),
    );
  } catch {
    return reply(res, 400, { error: "Recherche invalide" });
  }
  try {
    const data = await apiJson(params);
    res.setHeader("Cache-Control", "public, s-maxage=900");
    reply(res, 200, data);
  } catch {
    reply(res, 502, { error: "Wikimedia Commons indisponible" });
  }
}
