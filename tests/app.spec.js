import { test, expect } from "@playwright/test";
import { analyzeLoops } from "../src/audio/analyzeLoops.js";

function audioFixture(duration = 12) {
  const rate = 22050,
    samples = rate * duration;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(samples * 2, 40);
  const pcm = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const time = i / rate,
      pulse = time % 0.5;
    const frequency = Math.floor(time * 2) % 2 ? 880 : 220;
    pcm[i] =
      Math.sin(2 * Math.PI * frequency * time) * Math.exp(-pulse * 7) * 0.85;
    wav.writeInt16LE(Math.round(pcm[i] * 30000), 44 + i * 2);
  }
  return {
    wav,
    buffer: {
      duration,
      sampleRate: rate,
      length: samples,
      numberOfChannels: 1,
      getChannelData: () => pcm,
    },
  };
}
const file = () => ({
  name: "paysage-120bpm.wav",
  mimeType: "audio/wav",
  buffer: audioFixture().wav,
});
const timeValue = (label) => {
  const [minutes, seconds] = label.trim().split(":").map(Number);
  return minutes * 60 + seconds;
};

test("rhythmic and silent analysis partition the complete file without gaps", () => {
  const { buffer } = audioFixture(30);
  const analysis = analyzeLoops(buffer);
  expect(analysis.bpm).toBeGreaterThanOrEqual(116);
  expect(analysis.bpm).toBeLessThanOrEqual(124);
  expect(analysis.loops.length).toBeGreaterThan(2);
  expect(analysis.loops[0].start).toBe(0);
  expect(analysis.loops.at(-1).end).toBe(30);
  analysis.loops.forEach((loop, i) => {
    expect(loop.end).toBeGreaterThan(loop.start);
    if (i) expect(loop.start).toBe(analysis.loops[i - 1].end);
  });
  const silent = analyzeLoops({
    ...buffer,
    getChannelData: () => new Float32Array(buffer.length),
  });
  expect(silent.bpm).toBeNull();
  expect(silent.loops.length).toBeGreaterThan(1);
  expect(silent.waveform.every((value) => Number.isFinite(value))).toBe(true);
  const short = analyzeLoops({ ...audioFixture(2).buffer });
  expect(short.loops).toHaveLength(1);
  expect(short.loops[0]).toEqual({ id: 0, start: 0, end: 2 });
});

test("six brushes, three camera modes and rotation without touch painting", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /THREE|WebGL|Shader/.test(message.text()))
      errors.push(message.text());
  });
  await page.goto("/");
  const canvas = page.locator("#stage canvas");
  await expect(canvas).toHaveCount(1);
  await expect(page.getByRole("alert")).toHaveCount(0);
  const palette = page.getByRole("group", {
    name: "Palette aquarelle : six brosses",
  });
  await expect(palette.getByRole("button")).toHaveCount(6);
  for (const name of [
    "Voiles",
    "Falaises",
    "Corolles",
    "Filaments",
    "Brumes",
    "Lagons",
  ]) {
    await palette.getByRole("button", { name, exact: true }).click();
    await expect(
      palette.getByRole("button", { name, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(palette.locator("[aria-pressed=true]")).toHaveCount(1);
  }
  await page.getByRole("button", { name: "TPV", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-camera-mode", "tpv");
  const markCount = await canvas.getAttribute("data-mark-count");
  const revision = Number(await canvas.getAttribute("data-flight-revision"));
  await canvas.click({ position: { x: 400, y: 220 } });
  await expect(canvas).toHaveAttribute("data-mark-count", markCount);
  await page.mouse.move(400, 230);
  await page.mouse.down();
  await page.mouse.move(600, 260, { steps: 12 });
  await page.mouse.up();
  await expect(canvas).toHaveAttribute("data-mark-count", markCount);
  expect(
    Number(await canvas.getAttribute("data-flight-revision")),
  ).toBeGreaterThan(revision);
  await page
    .getByRole("button", { name: "FPV 360° gyro", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-camera-mode", "gyro");
  await page.getByRole("button", { name: "FPV drone", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-camera-mode", "drone");
  await expect(page.locator("input[type=range]")).toHaveCount(0);
  await expect(page.getByText(/scratch/i)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("audio paints with all six brushes, pauses, loops a phrase and restores whole-song playback", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /THREE|WebGL|Shader/.test(message.text()))
      errors.push(message.text());
  });
  await page.goto("/");
  await page.getByLabel("Importer un fichier audio").setInputFiles(file());
  await expect(page.getByText("paysage-120bpm.wav")).toBeVisible();
  const pause = page.getByRole("button", { name: "Mettre en pause" });
  await expect(pause).toBeEnabled();
  const canvas = page.locator("#stage canvas");
  const regions = page.locator(".loop-region");
  expect(await regions.count()).toBeGreaterThan(1);
  for (const name of [
    "Voiles",
    "Falaises",
    "Corolles",
    "Filaments",
    "Brumes",
    "Lagons",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    const count = Number(await canvas.getAttribute("data-mark-count"));
    await expect
      .poll(async () => Number(await canvas.getAttribute("data-mark-count")), {
        timeout: 5000,
      })
      .toBeGreaterThan(count);
  }
  await regions.last().click();
  await expect(regions.last()).toHaveAttribute("aria-pressed", "true");
  const label = await regions.last().getAttribute("aria-label");
  const bounds = label.match(/: (\d+:\d+) à (\d+:\d+)/);
  const start = timeValue(bounds[1]),
    end = timeValue(bounds[2]);
  await expect(page.locator(".track-caption > span:first-child")).toContainText(
    "Boucle",
  );
  await expect(pause).toBeVisible();
  // Wait beyond the end of this short final phrase: native looping must keep
  // position inside its bounds and playback active, instead of ending the file.
  await page.waitForTimeout((end - start + 1.2) * 1000);
  const position = timeValue(
    (await page.getByLabel("Temps de lecture").innerText()).split("/")[0],
  );
  expect(position).toBeGreaterThanOrEqual(start);
  expect(position).toBeLessThan(end);
  await expect(pause).toBeVisible();
  await pause.click();
  const paused = await page.getByLabel("Temps de lecture").innerText();
  const pausedMarks = await canvas.getAttribute("data-mark-count");
  await page.waitForTimeout(1200);
  await expect(page.getByLabel("Temps de lecture")).toHaveText(paused);
  await expect(canvas).toHaveAttribute("data-mark-count", pausedMarks);
  await page.getByRole("button", { name: "MP3 entier" }).click();
  await expect(
    page.getByRole("button", { name: "MP3 entier" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Temps de lecture")).toHaveText("0:00 / 0:12");
  await page.getByRole("button", { name: "Lire la boucle" }).click();
  await expect(pause).toBeVisible();
  expect(errors).toEqual([]);
});

test("invalid audio leaves a recoverable import error", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Importer un fichier audio").setInputFiles({
    name: "corrupt.mp3",
    mimeType: "audio/mpeg",
    buffer: Buffer.from("invalid audio"),
  });
  await expect(
    page.getByText(/Ce fichier audio ne peut pas être ouvert/),
  ).toBeVisible();
  await page.getByLabel("Importer un fichier audio").setInputFiles(file());
  await expect(
    page.getByRole("button", { name: "Mettre en pause" }),
  ).toBeVisible();
  await expect(
    page.getByText(/Ce fichier audio ne peut pas être ouvert/),
  ).toHaveCount(0);
});

test("gyro permission denial preserves panoramic view and touch rotation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.DeviceOrientationEvent.requestPermission = async () => "denied";
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "FPV 360° gyro", exact: true })
    .click();
  await expect(
    page.getByText("Gyroscope non autorisé · glissez pour explorer à 360°"),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-camera-mode",
    "gyro",
  );
});

test("gyro permission and sensor events orient the central panoramic view", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.DeviceOrientationEvent.requestPermission = async () => "granted";
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "FPV 360° gyro", exact: true })
    .click();
  await page.evaluate(() =>
    window.dispatchEvent(
      new DeviceOrientationEvent("deviceorientation", {
        alpha: 0,
        beta: 90,
        gamma: 0,
      }),
    ),
  );
  await expect(
    page.getByText("Gyroscope actif · regardez autour de vous"),
  ).toBeVisible();
  await page.waitForTimeout(1500);
  const before = await page.locator("canvas").screenshot();
  await page.evaluate(() =>
    window.dispatchEvent(
      new DeviceOrientationEvent("deviceorientation", {
        alpha: 100,
        beta: 90,
        gamma: 0,
      }),
    ),
  );
  await page.waitForTimeout(1500);
  const after = await page.locator("canvas").screenshot();
  expect(after.equals(before)).toBe(false);
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-camera-mode",
    "gyro",
  );
});

test.describe("mobile", () => {
  test.use({ hasTouch: true });
  test("the only palette and track fit a narrow screen", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    for (const name of [
      "Voiles",
      "Falaises",
      "Corolles",
      "Filaments",
      "Brumes",
      "Lagons",
      "FPV drone",
      "TPV",
      "FPV 360° gyro",
    ]) {
      await expect(
        page.getByRole("button", { name, exact: true }),
      ).toBeInViewport();
    }
    await expect(page.locator(".audio-track")).toBeInViewport();
    const count = await page.locator("canvas").getAttribute("data-mark-count");
    await page.locator("canvas").tap({ position: { x: 180, y: 200 } });
    await expect(page.locator("canvas")).toHaveAttribute(
      "data-mark-count",
      count,
    );
    await expect(page.getByRole("alert")).toHaveCount(0);
    await page.getByLabel("Importer un fichier audio").setInputFiles(file());
    await expect(
      page.getByRole("button", { name: "Mettre en pause" }),
    ).toBeInViewport();
    await expect(page.locator(".loop-region").last()).toBeInViewport();
  });
});
