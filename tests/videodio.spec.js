import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";

test("photo freezes deposits and flight, rotates and zooms, exports ten seconds with retrospective audio", async ({
  page,
}, testInfo) => {
  test.setTimeout(45000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const pad = page.getByRole("button", {
    name: "Jouer le fragment Voiles",
    exact: true,
  });
  await expect(pad).toBeEnabled();
  await page
    .getByRole("button", { name: "Déplier les fonctionnalités" })
    .click();
  await page
    .getByLabel("Importer une ambiance MP3")
    .setInputFiles("tests/fixtures/tone.mp3");
  await page
    .getByRole("button", { name: "Lire l’ambiance", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Replier les fonctionnalités" })
    .click();
  const box = await pad.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(6400);
  await page.mouse.up();
  await page.getByRole("button", { name: "Vue photo", exact: true }).click();
  const canvas = page.locator("#stage canvas");
  await expect(canvas).toHaveAttribute("data-sculpture-paused", "true");
  await page.waitForTimeout(100);
  const position = await canvas.getAttribute("data-painter-position");
  const samples = await canvas.getAttribute("data-painted-samples");
  await page.waitForTimeout(350);
  await expect(canvas).toHaveAttribute("data-painter-position", position);
  await expect(canvas).toHaveAttribute("data-painted-samples", samples);
  const revision = Number(await canvas.getAttribute("data-flight-revision"));
  await page.mouse.move(150, 400);
  await page.mouse.down();
  await page.mouse.move(250, 470, { steps: 10 });
  await page.mouse.up();
  expect(
    Number(await canvas.getAttribute("data-flight-revision")),
  ).toBeGreaterThan(revision);
  await page
    .getByRole("button", { name: "Zoomer la photo", exact: true })
    .click();
  expect(Number(await canvas.getAttribute("data-photo-zoom"))).toBeLessThan(1);
  await page
    .getByRole("button", { name: "Dézoomer la photo", exact: true })
    .click();
  expect(Number(await canvas.getAttribute("data-photo-zoom"))).toBeCloseTo(1);
  await page.mouse.move(190, 400);
  await page.mouse.wheel(0, 200);
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-photo-zoom")))
    .toBeGreaterThan(1);
  const beforePinch = Number(await canvas.getAttribute("data-photo-zoom"));
  const touch = await page.context().newCDPSession(page);
  await touch.send("Emulation.setTouchEmulationEnabled", { enabled: true });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: 150, y: 350, id: 1 },
      { x: 230, y: 350, id: 2 },
    ],
  });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: 110, y: 350, id: 1 },
      { x: 270, y: 350, id: 2 },
    ],
  });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-photo-zoom")))
    .toBeLessThan(beforePinch);
  const fpvFrames = Number(await canvas.getAttribute("data-video-frames"));
  await page
    .getByRole("button", { name: "FPV 360° gyro", exact: true })
    .click();
  await page.waitForTimeout(700);
  expect(Number(await canvas.getAttribute("data-video-frames"))).toBe(
    fpvFrames,
  );
  await page.getByRole("button", { name: "Vue photo", exact: true }).click();
  await page.waitForTimeout(150);
  const frozenPhotoPosition = await canvas.getAttribute(
    "data-painter-position",
  );
  const [pngDownload] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("button", {
        name: "Télécharger la photo · PNG HD",
        exact: true,
      })
      .click(),
  ]);
  const pngFile = testInfo.outputPath(pngDownload.suggestedFilename());
  await pngDownload.saveAs(pngFile);
  const photoInfo = JSON.parse(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-show_streams", "-of", "json", pngFile],
      { encoding: "utf8" },
    ),
  );
  const image = photoInfo.streams[0];
  expect(Math.max(image.width, image.height)).toBe(2560);
  expect(image.codec_name).toBe("png");
  expect(image.width / image.height).toBeCloseTo(390 / 844, 2);
  await expect(canvas).toHaveAttribute(
    "data-painter-position",
    frozenPhotoPosition,
  );
  await page
    .getByRole("button", { name: "Créer ma vidéodio · 10 s", exact: true })
    .click();
  const link = page.getByRole("link", { name: "Télécharger ma vidéodio" });
  await expect(link).toBeVisible({ timeout: 15000 });
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    link.click(),
  ]);
  const file = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(file);
  const metadata = JSON.parse(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-show_streams", "-show_packets", "-of", "json", file],
      { encoding: "utf8", maxBuffer: 10000000 },
    ),
  );
  expect(metadata.streams.some((stream) => stream.codec_type === "video")).toBe(
    true,
  );
  expect(metadata.streams.some((stream) => stream.codec_type === "audio")).toBe(
    true,
  );
  const end = Math.max(
    ...metadata.packets.map(
      (packet) =>
        Number(packet.pts_time || 0) + Number(packet.duration_time || 0),
    ),
  );
  expect(end).toBeGreaterThan(9.7);
  expect(end).toBeLessThan(10.5);
  const still = execFileSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-ss",
      "4",
      "-i",
      file,
      "-frames:v",
      "1",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgb24",
      "pipe:1",
    ],
    { maxBuffer: 2000000 },
  );
  let darkest = 255,
    lightest = 0;
  for (const value of still) {
    darkest = Math.min(darkest, value);
    lightest = Math.max(lightest, value);
  }
  expect(lightest - darkest).toBeGreaterThan(20);
  const sound = execFileSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-i",
      file,
      "-vn",
      "-f",
      "f32le",
      "-ac",
      "1",
      "-ar",
      "24000",
      "pipe:1",
    ],
    { maxBuffer: 2000000 },
  );
  let intro = 0,
    replay = 0;
  for (let i = 0; i < sound.length / 4; i++) {
    const value = sound.readFloatLE(i * 4);
    if (i < 24000 * 3) intro += value * value;
    else if (i > 24000 * 4.3) replay += value * value;
  }
  expect(intro).toBeGreaterThan(1);
  expect(replay).toBeGreaterThan(1);
  await page.getByRole("button", { name: "FPV drone", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-sculpture-paused", "false");
  await expect
    .poll(() => canvas.getAttribute("data-painter-position"))
    .not.toBe(position);
  expect(errors).toEqual([]);
});

test("capture ring retains at most ten seconds, freezes and clears on resumption", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createVideodio } = await import("/src/video/createVideodio.js");
    const capture = createVideodio(),
      canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    canvas.getContext("2d").fillRect(0, 0, 64, 64);
    for (let i = 0; i < 160; i++) {
      capture.frame(canvas, 10000 + i * 100);
      capture.audio(new Float32Array(2048), 48000);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    const before = capture.getHistory();
    capture.freeze(true);
    capture.frame(canvas, 50000);
    capture.audio(new Float32Array(2048), 48000);
    const frozen = capture.getHistory();
    capture.freeze(false);
    const cleared = capture.getHistory();
    capture.dispose();
    return { before, frozen, cleared };
  });
  expect(result.before.frames).toBeLessThanOrEqual(101);
  expect(result.before.frames).toBeGreaterThan(0);
  expect(result.frozen).toEqual(result.before);
  expect(result.cleared).toEqual({ frames: 0, audio: 0 });
});

test("encoded FPV frame changes and PCM pulses share the same replay clock", async ({
  page,
}, testInfo) => {
  test.setTimeout(30000);
  await page.goto("/");
  const blob = await page.evaluate(async () => {
    const { createVideodio } = await import("/src/video/createVideodio.js");
    const take = createVideodio(),
      canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const paint = canvas.getContext("2d");
    for (let i = 0; i < 20; i++) {
      paint.fillStyle = i >= 4 && i < 6 ? "#ff0000" : "#00ff00";
      paint.fillRect(0, 0, 64, 64);
      const count = take.getHistory().frames;
      take.frame(canvas, 10000 + i * 500);
      const deadline = performance.now() + 2000;
      while (take.getHistory().frames === count && performance.now() < deadline)
        await new Promise((resolve) => setTimeout(resolve, 5));
      if (take.getHistory().frames === count)
        throw new Error("Capture did not finish");
    }
    const pcm = new Float32Array(24000 * 10);
    for (let i = 24000 * 2; i < 24000 * 3; i++)
      pcm[i] = Math.sin((i / 24000) * Math.PI * 2 * 440) * 0.5;
    take.audio(pcm, 24000, 10000);
    take.freeze(true);
    const result = await take.export(canvas);
    const bytes = await result.blob.arrayBuffer();
    take.dispose();
    return Array.from(new Uint8Array(bytes));
  });
  const { writeFileSync } = await import("node:fs");
  const file = testInfo.outputPath("synchro.webm");
  writeFileSync(file, Buffer.from(blob));
  const sound = execFileSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-i",
      file,
      "-vn",
      "-f",
      "f32le",
      "-ac",
      "1",
      "-ar",
      "24000",
      "pipe:1",
    ],
    { maxBuffer: 2000000 },
  );
  let first = -1,
    last = -1;
  for (let i = 0; i < sound.length / 4; i++) {
    if (Math.abs(sound.readFloatLE(i * 4)) > 0.1) {
      if (first < 0) first = i / 24000;
      last = i / 24000;
    }
  }
  const pixels = execFileSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-i",
      file,
      "-vf",
      "scale=1:1,fps=20",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgb24",
      "pipe:1",
    ],
    { maxBuffer: 10000 },
  );
  let redStart = -1,
    redEnd = -1;
  for (let i = 0; i < pixels.length / 3; i++) {
    if (pixels[i * 3] > pixels[i * 3 + 1] + 100) {
      if (redStart < 0) redStart = i / 20;
      redEnd = i / 20;
    }
  }
  expect(first).toBeGreaterThan(0);
  expect(redStart).toBeGreaterThan(0);
  expect(Math.abs(first - redStart)).toBeLessThan(0.15);
  expect(Math.abs(last - redEnd)).toBeLessThan(0.15);
});
