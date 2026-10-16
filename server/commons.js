import { API, mediaUrl } from "../src/audio/birds/catalog.js";
import {
  boundedBytes,
  MAX_RECORDING_BYTES,
} from "../src/audio/birds/recordingCache.js";
export function reply(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}
export function query(req) {
  return new URL(req.url, "https://local.invalid").searchParams;
}
export async function apiJson(params) {
  const response = await fetch(`${API}?${params}`, {
    signal: AbortSignal.timeout(12000),
    redirect: "error",
    headers: {
      Accept: "application/json",
      "User-Agent": "SUNOIZO/1.0 (https://github.com/pierkiroule/Volupt360)",
    },
  });
  const data = JSON.parse(
    new TextDecoder().decode(await boundedBytes(response, 3 * 1024 * 1024)),
  );
  if (data.error) throw new Error("Commons API error");
  return data;
}
export async function mediaResponse(url, kind) {
  for (let i = 0; i < 3; i++) {
    if (!mediaUrl(url)) throw new Error("Hôte non autorisé");
    const response = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      redirect: "manual",
      headers: {
        "User-Agent": "SUNOIZO/1.0 (https://github.com/pierkiroule/Volupt360)",
      },
    });
    if (response.status >= 300 && response.status < 400) {
      url = new URL(response.headers.get("location"), url).href;
      await response.body?.cancel();
      continue;
    }
    const type =
      response.headers.get("content-type") || "application/octet-stream";
    if (
      !(
        kind === "image"
          ? /^image\/(jpeg|png|webp)(;|$)/i
          : /^(audio\/|application\/ogg|application\/octet-stream)/i
      ).test(type)
    )
      throw new Error("Format non autorisé");
    return { bytes: await boundedBytes(response, MAX_RECORDING_BYTES), type };
  }
  throw new Error("Trop de redirections");
}
