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

test("twelve brushes, two camera modes and rotation without touch painting", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /THREE|WebGL|Shader/.test(message.text()))
      errors.push(message.text());
  });
  await page.goto("/?atelier=mp3");
  const canvas = page.locator("#stage canvas");
  await expect(canvas).toHaveCount(1);
  await expect(page.getByRole("alert")).toHaveCount(0);
  const palette = page.getByRole("group", {
    name: "Palette aquarelle : douze brosses",
  });
  await expect(palette.getByRole("button")).toHaveCount(12);
  for (const name of [
    "Voiles",
    "Falaises",
    "Corolles",
    "Filaments",
    "Encres",
    "Éclats",
    "Bulles",
    "Aurore",
    "Calligraphie",
    "Network",
    "Dilution",
    "Echo",
  ]) {
    await palette.getByRole("button", { name, exact: true }).click();
    await expect(
      palette.getByRole("button", { name, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(palette.locator("[aria-pressed=true]")).toHaveCount(1);
  }
  await expect(
    page.getByRole("button", { name: "TPV", exact: true }),
  ).toHaveCount(0);
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
  await expect(
    page.getByRole("slider", { name: "Distance du drone" }),
  ).toHaveCount(1);
  await expect(page.getByText(/scratch/i)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("audio paints with all twelve brushes, pauses, loops a phrase and restores whole-song playback", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /THREE|WebGL|Shader/.test(message.text()))
      errors.push(message.text());
  });
  await page.goto("/?atelier=mp3");
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
    "Encres",
    "Éclats",
    "Bulles",
    "Aurore",
    "Calligraphie",
    "Network",
    "Dilution",
    "Echo",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    const count = Number(await canvas.getAttribute("data-painted-samples"));
    await expect
      .poll(
        async () => Number(await canvas.getAttribute("data-painted-samples")),
        {
          timeout: 5000,
        },
      )
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
  await page.goto("/?atelier=mp3");
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
  await page.goto("/?atelier=mp3");
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
  await page.goto("/?atelier=mp3");
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
    await page.goto("/?atelier=mp3");
    for (const name of [
      "Voiles",
      "Falaises",
      "Corolles",
      "Filaments",
      "Encres",
      "Éclats",
      "Bulles",
      "Aurore",
      "Calligraphie",
      "Network",
      "Dilution",
      "Echo",
      "FPV drone",
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

test("the painter travels through XYZ while its drone follows and reframes the growing work", async ({
  page,
}) => {
  await page.goto("/?atelier=mp3");
  await page.getByLabel("Importer un fichier audio").setInputFiles(file());
  await expect(
    page.getByRole("button", { name: "Mettre en pause" }),
  ).toBeVisible();
  const canvas = page.locator("canvas");
  const vector = async (name) =>
    (await canvas.getAttribute(name)).split(",").map(Number);
  const start = await vector("data-drone-position");
  await expect
    .poll(
      async () => {
        const p = await vector("data-painter-position");
        return p[2];
      },
      { timeout: 20000 },
    )
    .toBeGreaterThan(18);
  const painter = await vector("data-painter-position"),
    drone = await vector("data-drone-position");
  const extent = await vector("data-sculpture-extent");
  expect(extent[0]).toBeGreaterThan(3);
  expect(extent[1]).toBeGreaterThan(3);
  expect(extent[2]).toBeGreaterThan(12);
  expect(
    Math.hypot(...drone.map((value, i) => value - start[i])),
  ).toBeGreaterThan(15);
  expect(
    Math.hypot(...drone.map((value, i) => value - painter[i])),
  ).toBeLessThan(35);
  await expect(
    page.getByRole("button", { name: "TPV", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Mettre en pause" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("each brush long press chooses an independent predefined alpha texture", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /THREE|WebGL|Shader/.test(message.text()))
      errors.push(message.text());
  });
  await page.goto("/?atelier=mp3");
  const names = [
    "Voiles",
    "Falaises",
    "Corolles",
    "Filaments",
    "Encres",
    "Éclats",
    "Bulles",
    "Aurore",
    "Calligraphie",
    "Network",
    "Dilution",
    "Echo",
  ];
  for (const [i, name] of names.entries()) {
    const button = page.getByRole("button", { name, exact: true });
    const box = await button.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(650);
    await page.mouse.up();
    await page
      .getByRole("button", {
        name: `Texture Nervures pour ${name}`,
        exact: true,
      })
      .click();
    await expect(button).toHaveAttribute("title", /Nervures/);
    await expect(button.locator("img")).toHaveCount(1);
  }
  await expect(
    page.getByRole("button", { name: "Voiles", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(async () =>
      Number(
        await page.locator("canvas").getAttribute("data-textured-strokes"),
      ),
    )
    .toBeGreaterThan(0);
  await page.getByLabel("Importer un fichier audio").setInputFiles(file());
  await expect(
    page.getByRole("button", { name: "Mettre en pause" }),
  ).toBeVisible();
  for (const name of names) {
    await page.getByRole("button", { name, exact: true }).click();
    const count = Number(
      await page.locator("canvas").getAttribute("data-painted-samples"),
    );
    await expect
      .poll(async () =>
        Number(
          await page.locator("canvas").getAttribute("data-painted-samples"),
        ),
      )
      .toBeGreaterThan(count + 3);
  }
  expect(errors).toEqual([]);
});

test("texture palette replaces the previous mask without exposing image uploads", async ({
  page,
}) => {
  await page.goto("/?atelier=mp3");
  await expect(
    page.locator('input[type="file"][accept="image/*"]'),
  ).toHaveCount(0);
  const brush = page.getByRole("button", { name: "Voiles", exact: true });
  for (const name of ["Mycélium", "Cellules", "Encre éclatée"]) {
    await brush.focus();
    await page.keyboard.press("Shift+Enter");
    await page
      .getByRole("button", { name: `Texture ${name} pour Voiles`, exact: true })
      .click();
    await expect(brush).toHaveAttribute("title", new RegExp(name));
    await expect(brush.locator("img")).toHaveCount(1);
  }
});

test.describe("mobile texture gesture", () => {
  test.use({ hasTouch: true });
  test("touch hold opens five predefined textures without selecting another brush", async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/?atelier=mp3");
    const button = page.getByRole("button", { name: "Corolles", exact: true });
    const box = await button.boundingBox();
    const session = await context.newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
    });
    await page.waitForTimeout(650);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(
      page
        .getByRole("group", { name: "Textures de Corolles" })
        .getByRole("button"),
    ).toHaveCount(5);
    await page
      .getByRole("button", {
        name: "Texture Cellules pour Corolles",
        exact: true,
      })
      .click();
    await expect(button.locator("img")).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: "Voiles", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    const mask = await button.locator("img").evaluate((image) => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let clear = 0,
        pigment = 0;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] === 0) clear++;
        if (pixels[i] > 10) pigment++;
      }
      return { clear, pigment };
    });
    expect(mask.clear).toBeGreaterThan(500);
    expect(mask.pigment).toBeGreaterThan(500);
  });
});

test("orbital weaving surrounds a clear center over repeated musical phrases", async () => {
  const { createPainterFlight } =
    await import("../src/engine/createPainterFlight.js");
  const flight = createPainterFlight(),
    sectors = new Set();
  let min = Infinity,
    max = 0,
    altitude = 0,
    previous = null;
  for (let i = 0; i < 2400; i++) {
    const pose = flight.update(0.1, {
      energy: 0.6,
      low: 0.4,
      high: 0.5,
      flux: 0.1,
      freq: 1200,
    });
    const p = pose.position.clone();
    min = Math.min(min, p.length());
    max = Math.max(max, p.length());
    altitude = Math.max(altitude, Math.abs(p.y));
    sectors.add(Math.floor((Math.atan2(p.z, p.x) + Math.PI) / (Math.PI / 4)));
    if (previous) expect(p.distanceTo(previous)).toBeLessThan(2);
    previous = p;
  }
  expect(sectors.size).toBe(8);
  expect(min).toBeGreaterThan(12);
  expect(max - min).toBeGreaterThan(15);
  expect(altitude).toBeGreaterThan(10);
});

test("dense pigment dissolves old marks smoothly while preserving fresh strokes", async () => {
  const { dissolvePigment } = await import("../src/engine/dissolvePigment.js");
  const evaluate = (overrides) =>
    dissolvePigment({
      age: 80,
      count: 12,
      neighbors: 1,
      fade: 1,
      dt: 0.1,
      ...overrides,
    });
  expect(evaluate({})).toBe(1);
  expect(evaluate({ age: 180 })).toBe(1);
  expect(evaluate({ age: 250 })).toBeLessThan(1);
  let fade = 1;
  for (let i = 0; i < 600; i++) {
    const next = evaluate({ age: 220 + i * 0.1, fade });
    expect(next).toBeLessThanOrEqual(fade);
    fade = next;
  }
  expect(fade).toBeLessThan(0.012);
  const dense = evaluate({ count: 50, neighbors: 12 });
  expect(dense).toBeLessThan(1);
  expect(dense).toBeGreaterThan(0.9);
  expect(evaluate({ age: 2, count: 50, neighbors: 12 })).toBe(1);
  expect(evaluate({ fade: dense })).toBe(dense);
});

test("drone distance reveals the whole work and gyro stays at the sanctuary", async ({
  page,
}) => {
  await page.goto("/?atelier=mp3");
  const canvas = page.locator("canvas");
  const slider = page.getByRole("slider", { name: "Distance du drone" });
  await slider.fill("1");
  await expect(canvas).toHaveAttribute("data-drone-distance", "1");
  await page
    .getByRole("button", { name: "FPV 360° gyro", exact: true })
    .click();
  await expect(slider).toHaveCount(0);
  await expect
    .poll(
      async () =>
        Math.hypot(
          ...(await canvas.getAttribute("data-drone-position"))
            .split(",")
            .map(Number),
        ),
      { timeout: 10000 },
    )
    .toBeLessThan(0.5);
  await page.getByRole("button", { name: "FPV drone", exact: true }).click();
  await expect(slider).toHaveValue("1");
});

test("art direction preserves windows and a limited stable track palette", async () => {
  const { compositionAt, createTrackPalette } =
    await import("../src/engine/artDirection.js");
  const point = (angle) => ({
    x: Math.cos(angle) * 30,
    z: Math.sin(angle) * 30,
  });
  expect(compositionAt(point(3.05)).density).toBeLessThan(0.24);
  expect(compositionAt(point(0.8)).density).toBeGreaterThan(0.4);
  const analysis = { bpm: 120, waveform: [0.1, 0.6, 0.2, 0.8] };
  const a = createTrackPalette(analysis),
    b = createTrackPalette(analysis);
  expect(a.colors).toHaveLength(3);
  expect(a.colors).toEqual(b.colors);
  expect(a.colorFor("voiles", 0).getHex()).toBe(
    b.colorFor("voiles", 0).getHex(),
  );
  expect(a.colorFor("brumes", 0).getHex()).toBe(
    a.colorFor("lagons", 1).getHex(),
  );
  expect(a.colorFor("corolles", 2).getHex()).not.toBe(
    a.colorFor("voiles", 2).getHex(),
  );
});

test("camera phrasing blends continuously and artistic memory favors strong forms", async () => {
  const { droneIntent } = await import("../src/engine/artDirection.js");
  const { dissolvePigment } = await import("../src/engine/dissolvePigment.js");
  const modes = new Set();
  for (let phrase = 0; phrase < 6; phrase++) {
    modes.add(droneIntent(phrase, 0.95, 0.4).name);
    expect(droneIntent(phrase, 1, 0.4)).toEqual(
      droneIntent(phrase + 1, 0, 0.4),
    );
  }
  expect([...modes].sort()).toEqual(["contemplation", "passage", "suivi"]);
  const args = { age: 160, count: 40, neighbors: 5, fade: 1, dt: 0.1 };
  const ordinary = dissolvePigment(args);
  expect(dissolvePigment({ ...args, significance: 0.85 })).toBeGreaterThan(
    ordinary,
  );
  expect(dissolvePigment({ ...args, opening: 1 })).toBeLessThan(ordinary);
});
