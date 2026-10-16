import { API, recordings, mediaUrl } from "../src/audio/birds/catalog.js";
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
export async function apiJson(path) {
  const response = await fetch(`${API}/${path}`, {
    signal: AbortSignal.timeout(12000),
    redirect: "error",
    headers: { Accept: "application/json" },
  });
  return JSON.parse(
    new TextDecoder().decode(await boundedBytes(response, 2 * 1024 * 1024)),
  );
}
export async function soundResponse(url) {
  for (let i = 0; i < 3; i++) {
    if (!mediaUrl(url)) throw new Error("Hôte audio non autorisé");
    const response = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      redirect: "manual",
    });
    if (response.status >= 300 && response.status < 400) {
      url = new URL(response.headers.get("location"), url).href;
      await response.body?.cancel();
      continue;
    }
    const type =
      response.headers.get("content-type") || "application/octet-stream";
    if (!/^(audio\/|application\/octet-stream)/i.test(type))
      throw new Error("Format non audio");
    const bytes = await boundedBytes(response, MAX_RECORDING_BYTES);
    return {
      bytes,
      type: response.headers.get("content-type") || "application/octet-stream",
    };
  }
  throw new Error("Trop de redirections");
}
export { recordings };
