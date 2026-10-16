import test from "node:test";
import assert from "node:assert/strict";
import recording from "../../api/bird-recording.js";
import catalog from "../../api/bird-catalog.js";
import { mediaUrl } from "../../src/audio/birds/catalog.js";

const observation = (license) => ({
  id: 1,
  taxon: { id: 3, rank: "species", name: "Test bird" },
  user: { login: "recorder" },
  sounds: [
    {
      id: 9,
      license_code: license,
      file_url: "https://static.inaturalist.org/sounds/9.wav",
    },
  ],
});
async function call(handler, url, method = "GET") {
  const res = {
    headers: {},
    setHeader(key, value) {
      this.headers[key] = value;
    },
    end(body) {
      this.body = body;
    },
  };
  await handler({ url, method }, res);
  return res;
}
test("recording relay verifies the sound license before fetching bytes", async () => {
  const original = globalThis.fetch,
    calls = [];
  try {
    globalThis.fetch = async (url) => {
      calls.push(url);
      return url.includes("api.inaturalist")
        ? Response.json({ results: [observation("cc-by")] })
        : new Response(new Uint8Array([1, 2, 3]), {
            headers: { "content-type": "audio/wav" },
          });
    };
    const res = await call(
      recording,
      "/api/bird-recording?observation=1&sound=9",
    );
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers["Content-Type"], "audio/wav");
    assert.deepEqual([...res.body], [1, 2, 3]);
    assert.equal(calls.length, 2);
    calls.length = 0;
    globalThis.fetch = async (url) => {
      calls.push(url);
      return Response.json({ results: [observation("cc-by-nc")] });
    };
    const rejected = await call(
      recording,
      "/api/bird-recording?observation=1&sound=9",
    );
    assert.equal(rejected.statusCode, 403);
    assert.equal(calls.length, 1);
  } finally {
    globalThis.fetch = original;
  }
});
test("relay rejects arbitrary URLs, IDs, methods, redirected hosts and non audio bodies", async () => {
  assert.equal(mediaUrl("https://127.0.0.1/internal"), null);
  assert.equal(mediaUrl("https://static.inaturalist.org.evil.example/a"), null);
  assert.equal(mediaUrl("http://static.inaturalist.org/a"), null);
  const invalid = await call(
    recording,
    "/?observation=https://evil.example&sound=9",
  );
  assert.equal(invalid.statusCode, 400);
  const wrongMethod = await call(recording, "/?observation=1&sound=9", "POST");
  assert.equal(wrongMethod.statusCode, 405);
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url) =>
      url.includes("api.inaturalist")
        ? Response.json({ results: [observation("cc0")] })
        : new Response(null, {
            status: 302,
            headers: { location: "https://evil.example/private" },
          });
    assert.equal(
      (await call(recording, "/?observation=1&sound=9")).statusCode,
      502,
    );
    globalThis.fetch = async (url) =>
      url.includes("api.inaturalist")
        ? Response.json({ results: [observation("cc0")] })
        : new Response("<html>bad</html>", {
            headers: { "content-type": "text/html" },
          });
    assert.equal(
      (await call(recording, "/?observation=1&sound=9")).statusCode,
      502,
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("catalog relay only exposes bounded bird queries and propagates upstream failure", async () => {
  assert.equal((await call(catalog, "/?page=400")).statusCode, 400);
  const original = globalThis.fetch;
  let called;
  try {
    globalThis.fetch = async (url) => {
      called = url;
      return Response.json({ results: [] });
    };
    const result = await call(
      catalog,
      "/?page=2&threatened=true&taxon_id=evil",
    );
    assert.equal(result.statusCode, 200);
    assert.match(called, /taxon_id=3/);
    assert.match(called, /threatened=true/);
    assert.match(called, /per_page=100/);
    globalThis.fetch = async () => {
      throw new Error("offline");
    };
    assert.equal((await call(catalog, "/?page=1")).statusCode, 502);
  } finally {
    globalThis.fetch = original;
  }
});

test("recording byte limits work without Content-Length", async () => {
  const { boundedBytes } =
    await import("../../src/audio/birds/recordingCache.js");
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(4));
      controller.enqueue(new Uint8Array(4));
      controller.close();
    },
  });
  await assert.rejects(boundedBytes(new Response(stream), 6), /volumineux/);
});
