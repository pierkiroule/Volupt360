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
    name: "Jouer la brindille Voiles",
    exact: true,
  });
  await expect(pad).toBeEnabled();
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
      "1",
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
  expect(intro).toBeLessThan(0.01);
  expect(replay).toBeGreaterThan(1);
  await page.getByRole("button", { name: "FPV drone", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-sculpture-paused", "false");
  await expect
    .poll(() => canvas.getAttribute("data-painter-position"))
    .not.toBe(position);
  expect(errors).toEqual([]);
});

test("capture ring retains at most six seconds, freezes and clears on resumption", async ({
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
    for (let i = 0; i < 100; i++) {
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
  expect(result.before.frames).toBeLessThanOrEqual(61);
  expect(result.before.frames).toBeGreaterThan(0);
  expect(result.frozen).toEqual(result.before);
  expect(result.cleared).toEqual({ frames: 0, audio: 0 });
});
