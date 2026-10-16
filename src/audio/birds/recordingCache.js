import { withTimeout } from "./network.js";
const NAME = "sonoizo-birds-v1";
const LIMIT = 64 * 1024 * 1024;
export const MAX_RECORDING_BYTES = 8 * 1024 * 1024;
export async function boundedBytes(response, max = MAX_RECORDING_BYTES) {
  if (!response.ok || response.type === "opaque")
    throw new Error(`Enregistrement inaccessible (${response.status}).`);
  if (Number(response.headers.get("content-length")) > max)
    throw new Error("Enregistrement trop volumineux.");
  if (!response.body?.getReader) {
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > max)
      throw new Error("Enregistrement trop volumineux.");
    return buffer;
  }
  const reader = response.body.getReader(),
    chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) throw new Error("Enregistrement trop volumineux.");
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes.buffer;
}
export async function recordingBytes(
  recording,
  { signal, request = fetch } = {},
) {
  const key = `${location.origin}/__bird-cache/${recording.observation}/${recording.sound}`;
  let cache;
  try {
    cache = await caches.open(NAME);
    const hit = await cache.match(key);
    if (hit) return await boundedBytes(hit);
  } catch {
    /* Private browsing / quota: memory playback still works. */
  }
  const bytes = await withTimeout(signal, async (timedSignal) => {
    try {
      return await boundedBytes(
        await request(recording.url, {
          mode: "cors",
          credentials: "omit",
          signal: timedSignal,
        }),
      );
    } catch (error) {
      if (signal?.aborted) throw error;
      return boundedBytes(
        await request(
          `/api/bird-recording?observation=${recording.observation}&sound=${recording.sound}`,
          { signal: timedSignal },
        ),
      );
    }
  });
  if (cache && !signal?.aborted) {
    try {
      // Serialize writes to keep the total bounded even when requests overlap.
      await cacheWrite(async () => {
        const keys = await cache.keys();
        let total = 0;
        for (const item of keys) {
          const entry = await cache.match(item);
          total +=
            Number(entry?.headers.get("content-length")) || MAX_RECORDING_BYTES;
        }
        for (const item of keys) {
          if (
            total + bytes.byteLength <= LIMIT &&
            (await cache.keys()).length < 24
          )
            break;
          const entry = await cache.match(item);
          total -=
            Number(entry?.headers.get("content-length")) || MAX_RECORDING_BYTES;
          await cache.delete(item);
        }
        await cache.put(
          key,
          new Response(bytes, {
            headers: {
              "content-length": String(bytes.byteLength),
              "content-type": "application/octet-stream",
            },
          }),
        );
      });
    } catch {
      /* Quota failure never prevents listening. */
    }
  }
  return bytes;
}
let writes = Promise.resolve();
function cacheWrite(action) {
  const result = writes.catch(() => {}).then(action);
  writes = result;
  return result;
}
