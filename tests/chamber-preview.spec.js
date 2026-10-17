import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test("capture a native orchestral preview for listening review", async ({
  page,
}) => {
  test.setTimeout(35000);
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createTwigBank } = await import("/src/sonoizo/createTwigBank.js");
    const bank = createTwigBank({ ids: ["voiles"] });
    const blocks = [];
    let rate = 48000;
    bank.setCaptureTap((data, sampleRate) => {
      blocks.push(new Float32Array(data));
      rate = sampleRate;
    });
    await bank.preparePlayback();
    await bank.startInstrument("souffle");
    await new Promise((resolve) => setTimeout(resolve, 18000));
    bank.dispose();
    const length = blocks.reduce((sum, block) => sum + block.length, 0),
      buffer = new ArrayBuffer(44 + length * 2),
      view = new DataView(buffer);
    function text(offset, s) {
      for (let i = 0; i < s.length; i++)
        view.setUint8(offset + i, s.charCodeAt(i));
    }
    text(0, "RIFF");
    view.setUint32(4, 36 + length * 2, true);
    text(8, "WAVE");
    text(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, rate, true);
    view.setUint32(28, rate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    text(36, "data");
    view.setUint32(40, length * 2, true);
    let index = 44,
      peak = 0;
    for (const block of blocks)
      for (const sample of block) {
        peak = Math.max(peak, Math.abs(sample));
        view.setInt16(
          index,
          Math.round(Math.max(-1, Math.min(1, sample)) * 32767),
          true,
        );
        index += 2;
      }
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192)
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return { base64: btoa(binary), peak, duration: length / rate };
  });
  expect(result.duration).toBeGreaterThan(16);
  expect(result.peak).toBeGreaterThan(0.01);
  expect(result.peak).toBeLessThan(1);
  await writeFile(
    "/tmp/chamber-preview.wav",
    Buffer.from(result.base64, "base64"),
  );
});
