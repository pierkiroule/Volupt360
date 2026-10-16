import {
  apiJson,
  query,
  reply,
  recordings,
  soundResponse,
} from "../server/inaturalist.js";
export default async function handler(req, res) {
  if (req.method !== "GET") return reply(res, 405, { error: "GET uniquement" });
  const params = query(req),
    observation = params.get("observation"),
    sound = params.get("sound");
  if (
    !/^[1-9]\d{0,11}$/.test(observation || "") ||
    !/^[1-9]\d{0,11}$/.test(sound || "")
  )
    return reply(res, 400, { error: "Identifiants invalides" });
  try {
    const data = await apiJson(`observations/${observation}`);
    const item = recordings(data.results || []).find(
      (item) => item.sound === Number(sound),
    );
    if (!item)
      return reply(res, 403, {
        error: "Chant absent, hôte non autorisé ou licence incompatible",
      });
    const { bytes, type } = await soundResponse(item.url);
    res.statusCode = 200;
    res.setHeader("Content-Type", type);
    res.setHeader("Content-Length", String(bytes.byteLength));
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, s-maxage=86400");
    res.end(Buffer.from(bytes));
  } catch {
    reply(res, 502, { error: "Enregistrement iNaturalist indisponible" });
  }
}
