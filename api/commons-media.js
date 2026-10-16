import { apiJson, query, reply, mediaResponse } from "../server/commons.js";
import { recordings } from "../src/audio/birds/catalog.js";
export default async function handler(req, res) {
  if (req.method !== "GET") return reply(res, 405, { error: "GET uniquement" });
  const p = query(req),
    id = p.get("pageid"),
    kind = p.get("kind");
  if (!/^[1-9]\d{0,11}$/.test(id || "") || !["audio", "image"].includes(kind))
    return reply(res, 400, { error: "Identifiant ou type invalide" });
  try {
    const data = await apiJson(
      new URLSearchParams({
        action: "query",
        format: "json",
        formatversion: "2",
        pageids: id,
        prop: "imageinfo",
        iiprop: "url|mime|size|extmetadata",
        iiurlwidth: "384",
        iiurlheight: "384",
      }),
    );
    const item = recordings(data.query?.pages || [], kind).find(
      (item) => item.pageid === Number(id),
    );
    if (!item)
      return reply(res, 403, { error: "Média absent ou licence incompatible" });
    const { bytes, type } = await mediaResponse(item.url, kind);
    res.statusCode = 200;
    res.setHeader("Content-Type", type);
    res.setHeader("Content-Length", String(bytes.byteLength));
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, s-maxage=86400");
    res.end(Buffer.from(bytes));
  } catch {
    reply(res, 502, { error: "Média Commons indisponible" });
  }
}
