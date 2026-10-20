/** Add a standards-compliant UTF-8 iTXt chunk without modifying picture pixels. */
export async function addPNGCredits(blob, credits) {
  if (!credits.length) return blob;
  const original = new Uint8Array(await blob.arrayBuffer());
  if (original[0] !== 137 || original[1] !== 80 || original.length < 24)
    throw Error("PNG invalide");
  const text = credits
    .map(
      (c) =>
        `${c.title} — ${c.artist}\n${c.source}\n${c.license} — ${c.licenseURL}`,
    )
    .join("\n\n");
  const payload = new TextEncoder().encode(
    `Attribution\0\0\0\0\0Photographies recadrées, colorées et mélangées aux pigments procéduraux.\n${text}`,
  );
  const chunk = new Uint8Array(payload.length + 12),
    view = new DataView(chunk.buffer);
  view.setUint32(0, payload.length);
  chunk.set([105, 84, 88, 116], 4);
  chunk.set(payload, 8);
  let crc = 0xffffffff;
  for (let i = 4; i < chunk.length - 4; i++) {
    crc ^= chunk[i];
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  view.setUint32(chunk.length - 4, (crc ^ 0xffffffff) >>> 0);
  return new Blob(
    [
      original.subarray(0, original.length - 12),
      chunk,
      original.subarray(original.length - 12),
    ],
    { type: "image/png" },
  );
}
