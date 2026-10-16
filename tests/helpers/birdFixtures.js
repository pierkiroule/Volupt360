import { deflateSync } from "node:zlib";

export function wav() {
  const rate = 24000,
    size = rate * 2,
    buffer = Buffer.alloc(44 + size);
  buffer.write("RIFF");
  buffer.writeUInt32LE(36 + size, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(size, 40);
  for (let i = 0; i < rate; i++)
    buffer.writeInt16LE(
      Math.sin((i / rate) * 2500 * Math.PI * 2) * 8000,
      44 + i * 2,
    );
  return buffer;
}

export function commonsPage(id, kind = "audio", license = "cc-by") {
  const title = `File:${kind === "image" ? "Nature texture" : "Bird song"} ${id}.${kind === "image" ? "png" : "wav"}`;
  const url = `https://upload.wikimedia.org/wikipedia/commons/a/ab/test-${id}.${kind === "image" ? "png" : "wav"}`;
  return {
    pageid: id,
    ns: 6,
    title,
    imageinfo: [
      {
        url,
        mime: kind === "image" ? "image/png" : "audio/wav",
        width: 64,
        height: 64,
        extmetadata: {
          LicenseUrl: {
            value:
              license === "cc0"
                ? "https://creativecommons.org/publicdomain/zero/1.0/"
                : `https://creativecommons.org/licenses/${license === "cc-by" ? "by" : "by-nc"}/4.0/`,
          },
          Artist: {
            value: '<a href="https://example.test">test-recordist</a>',
          },
          Credit: { value: "Test fixture only" },
        },
      },
    ],
  };
}
export const observation = (id, _unused = false, license = "cc-by") =>
  commonsPage(id, "audio", license);
export function commonsReply(url, count = 18) {
  const image = new URL(url).searchParams.get("gsrsearch")?.includes("bitmap");
  return {
    query: {
      pages: Array.from({ length: count }, (_, i) =>
        commonsPage(i + 1 + (image ? 1000 : 0), image ? "image" : "audio"),
      ),
    },
  };
}
function crc(bytes) {
  let n = 0xffffffff;
  for (const value of bytes) {
    n ^= value;
    for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  }
  return (n ^ 0xffffffff) >>> 0;
}
export function naturePng(seed = 1) {
  const chunk = (type, data) => {
    const name = Buffer.from(type),
      body = Buffer.concat([name, data]),
      out = Buffer.alloc(data.length + 12);
    out.writeUInt32BE(data.length);
    body.copy(out, 4);
    out.writeUInt32BE(crc(body), data.length + 8);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(64);
  header.writeUInt32BE(64, 4);
  header[8] = 8;
  header[9] = 2;
  const raw = Buffer.alloc((64 * 3 + 1) * 64);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const k = y * (64 * 3 + 1) + 1 + x * 3;
      raw[k] = (seed * 63 + x * 4) % 256;
      raw[k + 1] = (seed * 97 + y * 3) % 256;
      raw[k + 2] = (x + y + seed * 37) % 256;
    }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
export async function mockCommons(
  page,
  { count = 18, fail = () => false, onQuery = () => {} } = {},
) {
  await page.route("https://commons.wikimedia.org/**", (route) => {
    onQuery(route.request().url());
    return fail()
      ? route.abort()
      : route.fulfill({ json: commonsReply(route.request().url(), count) });
  });
  await page.route("https://upload.wikimedia.org/**", (route) => {
    const url = route.request().url();
    return route.fulfill({
      body: url.endsWith(".png")
        ? naturePng(Number(/test-(\d+)/.exec(url)[1]))
        : wav(),
      contentType: url.endsWith(".png") ? "image/png" : "audio/wav",
    });
  });
}
