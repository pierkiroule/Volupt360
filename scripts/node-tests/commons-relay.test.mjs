import test from "node:test";
import assert from "node:assert/strict";
import media from "../../api/commons-media.js";
import search from "../../api/commons-search.js";
import {
  mediaUrl,
  licenseInfo,
  recordings,
} from "../../src/audio/birds/catalog.js";
import { commonsPage } from "../../tests/helpers/birdFixtures.js";
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
test("media relay checks Commons licenses for both images and recordings", async () => {
  const original = globalThis.fetch;
  try {
    for (const kind of ["image", "audio"]) {
      let calls = 0;
      globalThis.fetch = async (url) => {
        calls++;
        return url.includes("w/api.php")
          ? Response.json({ query: { pages: [commonsPage(1, kind)] } })
          : new Response(new Uint8Array([1, 2, 3]), {
              headers: {
                "content-type": kind === "image" ? "image/png" : "audio/wav",
              },
            });
      };
      const res = await call(media, `/?pageid=1&kind=${kind}`);
      assert.equal(res.statusCode, 200);
      assert.deepEqual([...res.body], [1, 2, 3]);
      assert.equal(calls, 2);
    }
    globalThis.fetch = async () =>
      Response.json({
        query: { pages: [commonsPage(1, "image", "cc-by-nc")] },
      });
    assert.equal((await call(media, "/?pageid=1&kind=image")).statusCode, 403);
  } finally {
    globalThis.fetch = original;
  }
});
test("relay rejects open URLs, invalid IDs, MIME types and redirects outside Commons", async () => {
  assert.equal(mediaUrl("https://127.0.0.1/private"), null);
  assert.equal(mediaUrl("https://upload.wikimedia.org.evil.example/a"), null);
  assert.equal(mediaUrl("https://upload.wikimedia.org/other/private"), null);
  assert.equal(
    (await call(media, "/?pageid=https://evil.example&kind=image")).statusCode,
    400,
  );
  assert.equal((await call(media, "/?pageid=1&kind=script")).statusCode, 400);
  assert.equal(
    (await call(media, "/?pageid=1&kind=image", "POST")).statusCode,
    405,
  );
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url) =>
      url.includes("w/api.php")
        ? Response.json({ query: { pages: [commonsPage(1, "image")] } })
        : new Response(null, {
            status: 302,
            headers: { location: "https://evil.example" },
          });
    assert.equal((await call(media, "/?pageid=1&kind=image")).statusCode, 502);
    globalThis.fetch = async (url) =>
      url.includes("w/api.php")
        ? Response.json({ query: { pages: [commonsPage(1, "image")] } })
        : new Response("<html>bad</html>", {
            headers: { "content-type": "text/html" },
          });
    assert.equal((await call(media, "/?pageid=1&kind=image")).statusCode, 502);
  } finally {
    globalThis.fetch = original;
  }
});
test("search relay only exposes bounded nature and birdsong searches", async () => {
  assert.equal(
    (await call(search, "/?kind=image&theme=arbitrary&offset=0")).statusCode,
    400,
  );
  assert.equal(
    (await call(search, "/?kind=image&theme=moss&offset=9000")).statusCode,
    400,
  );
  const original = globalThis.fetch;
  let called;
  try {
    globalThis.fetch = async (url) => {
      called = url;
      return Response.json({ query: { pages: [] } });
    };
    const res = await call(
      search,
      "/?kind=image&theme=moss&offset=20&gsrlimit=9999",
    );
    assert.equal(res.statusCode, 200);
    assert.equal(new URL(called).searchParams.get("gsrlimit"), "20");
    assert.match(new URL(called).searchParams.get("gsrsearch"), /moss/);
    globalThis.fetch = async () => {
      throw new Error("offline");
    };
    assert.equal(
      (await call(search, "/?kind=audio&theme=birdsong&offset=0")).statusCode,
      502,
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("exact CC BY license version is preserved, incompatible rights are excluded", () => {
  assert.equal(
    licenseInfo({
      LicenseUrl: { value: "http://creativecommons.org/licenses/by/3.0/" },
    }).licenseName,
    "CC BY 3.0",
  );
  assert.equal(
    licenseInfo({
      LicenseUrl: { value: "https://creativecommons.org/licenses/by-sa/4.0/" },
    }),
    null,
  );
  const photo = commonsPage(1, "image");
  photo.imageinfo[0].extmetadata.ImageDescription = {
    value: "Generated with Stable Diffusion",
  };
  assert.equal(recordings([photo], "image").length, 0);
});
test("streaming size limits work even without Content-Length", async () => {
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
