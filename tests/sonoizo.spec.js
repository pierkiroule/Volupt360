import { test, expect } from "@playwright/test";

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
test.use({
  launchOptions: {
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    args: [
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  },
});

async function capture(page, name, seconds = 0.65) {
  await page
    .getByRole("button", { name: `Brindille ${name}`, exact: true })
    .click();
  await page
    .getByRole("button", {
      name: new RegExp(`^(Enregistrer|Remplacer) ${name}$`),
    })
    .click();
  await expect(page.getByRole("progressbar")).toBeVisible();
  await page.waitForTimeout(seconds * 1000);
  await page
    .getByRole("button", { name: "Arrêter l’enregistrement", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: `Remplacer ${name}`, exact: true }),
  ).toBeEnabled();
}

test("lot 1 maps twelve slots to the brushes and keeps navigation and MP3 available on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "SONOÏZO•°" })).toBeVisible();
  await expect(
    page.getByText("Le chant qui sculpte l’espace des possibles", {
      exact: true,
    }),
  ).toBeVisible();
  const pads = page.getByRole("group", {
    name: "Douze brindilles, douze brosses",
  });
  await expect(pads.getByRole("button")).toHaveCount(12);
  for (const name of names)
    await expect(
      page.getByRole("button", { name: `Brindille ${name}`, exact: true }),
    ).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "Enregistrer Voiles" }),
  ).toBeInViewport();
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  for (const name of names)
    await expect(
      page.getByRole("button", {
        name: `Jouer la brindille ${name}`,
        exact: true,
      }),
    ).toBeDisabled();
  await page
    .getByRole("button", { name: "FPV 360° gyro", exact: true })
    .click();
  await expect(page.locator("#stage canvas")).toHaveAttribute(
    "data-camera-mode",
    "gyro",
  );
  await page.getByRole("button", { name: "Musique MP3", exact: true }).click();
  await expect(
    page
      .getByRole("group", { name: "Palette aquarelle : douze brosses" })
      .getByRole("button"),
  ).toHaveCount(12);
  await expect(page.getByLabel("Importer un fichier audio")).toBeAttached();
});

test("native microphone records, stops tracks, replaces locally, plays polyphonic touch holds and deletes", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.__twigStreams = [];
    const original = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = async (...args) => {
      const stream = await original(...args);
      window.__twigStreams.push(stream);
      return stream;
    };
  });
  await page.goto("/");
  await capture(page, "Voiles");
  await capture(page, "Echo");
  await expect(page.getByLabel("Nombre de brindilles")).toHaveText("2 / 12");
  const originalDuration = await page
    .getByRole("button", { name: "Brindille Voiles", exact: true })
    .locator("small")
    .innerText();
  await capture(page, "Voiles", 1.2);
  expect(
    await page
      .getByRole("button", { name: "Brindille Voiles", exact: true })
      .locator("small")
      .innerText(),
  ).not.toBe(originalDuration);
  expect(
    await page.evaluate(() =>
      window.__twigStreams.every((stream) =>
        stream.getTracks().every((track) => track.readyState === "ended"),
      ),
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Écouter Voiles" }).click();
  await expect(
    page.getByRole("button", { name: "Brindille Voiles", exact: true }),
  ).toHaveClass(/is-playing/);
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  const canvas = page.locator("#stage canvas"),
    before = await canvas.getAttribute("data-painted-samples");
  const voice = page.getByRole("button", {
    name: "Jouer la brindille Voiles",
    exact: true,
  });
  const echo = page.getByRole("button", {
    name: "Jouer la brindille Echo",
    exact: true,
  });
  const a = await voice.boundingBox(),
    b = await echo.boundingBox();
  const session = await page.context().newCDPSession(page);
  const first = { x: a.x + a.width / 2, y: a.y + a.height / 2, id: 1 };
  const second = { x: b.x + b.width / 2, y: b.y + b.height / 2, id: 2 };
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [first],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [first, second],
  });
  await expect(voice.locator("small")).toHaveText("en boucle");
  await expect(echo.locator("small")).toHaveText("en boucle");
  await page.waitForTimeout(1400);
  await expect(voice).toHaveAttribute("aria-pressed", "true");
  await expect(echo).toHaveAttribute("aria-pressed", "true");
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [first],
  });
  await expect(voice).toHaveAttribute("aria-pressed", "false");
  await expect(echo).toHaveAttribute("aria-pressed", "true");
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(echo).toHaveAttribute("aria-pressed", "false");
  await voice.click();
  await expect(voice).toHaveAttribute("aria-pressed", "true");
  await expect(voice).toHaveAttribute("aria-pressed", "false");
  await voice.focus();
  await page.keyboard.down("Space");
  await expect(voice.locator("small")).toHaveText("en boucle");
  await page.keyboard.up("Space");
  await expect(voice).toHaveAttribute("aria-pressed", "false");
  await expect(canvas).toHaveAttribute("data-painted-samples", before);
  await page.getByRole("button", { name: "Musique MP3", exact: true }).click();
  await page.getByRole("button", { name: "Cueillir", exact: true }).click();
  await expect(page.getByLabel("Nombre de brindilles")).toHaveText("2 / 12");
  await page.getByRole("button", { name: "Supprimer Voiles" }).click();
  await expect(page.getByLabel("Nombre de brindilles")).toHaveText("1 / 12");
  await expect(
    page.getByRole("button", { name: "Enregistrer Voiles" }),
  ).toBeEnabled();
  expect(errors).toEqual([]);
});

test("native recording stops automatically after ten seconds and stores a capped sample", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Enregistrer Voiles" }).click();
  await expect(page.getByRole("progressbar")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Remplacer Voiles" }),
  ).toBeEnabled({ timeout: 16000 });
  const duration = parseFloat(
    await page
      .getByRole("button", { name: "Brindille Voiles", exact: true })
      .locator("small")
      .innerText(),
  );
  expect(duration).toBeGreaterThanOrEqual(9.5);
  expect(duration).toBeLessThanOrEqual(10);
  await expect(page.getByRole("progressbar")).toHaveCount(0);
});

test("permission denial is recoverable and microphone capture has no network upload", async ({
  page,
}) => {
  const uploads = [];
  page.on("request", (request) => {
    if (["POST", "PUT", "PATCH"].includes(request.method()))
      uploads.push(request.url());
  });
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    let denied = true;
    navigator.mediaDevices.getUserMedia = (...args) => {
      if (denied) {
        denied = false;
        return Promise.reject(new DOMException("Denied", "NotAllowedError"));
      }
      return original(...args);
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Enregistrer Voiles" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Microphone non autorisé",
  );
  await capture(page, "Voiles");
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(uploads).toEqual([]);
});

test("late permission grants are discarded and disposal stops the released microphone", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createTwigBank } = await import("/src/sonoizo/createTwigBank.js");
    let resolvePermission,
      requested = false,
      stopped = 0,
      notifications = 0;
    navigator.mediaDevices.getUserMedia = () => {
      requested = true;
      return new Promise((resolve) => {
        resolvePermission = resolve;
      });
    };
    const bank = createTwigBank({
      ids: ["voiles"],
      onChange: () => notifications++,
    });
    const pending = bank.record("voiles");
    while (!requested) await new Promise((resolve) => setTimeout(resolve, 10));
    bank.dispose();
    const afterDisposal = notifications;
    resolvePermission({ getTracks: () => [{ stop: () => stopped++ }] });
    await pending;
    return {
      stopped,
      noLateNotification: notifications === afterDisposal,
      snapshot: bank.getSnapshot(),
    };
  });
  expect(result.stopped).toBe(1);
  expect(result.noLateNotification).toBe(true);
  expect(result.snapshot.slots.voiles.duration).toBe(0);
  expect(result.snapshot.recording).toBeNull();
});

test("switching acts cancels a recording without replacing a previous twig", async ({
  page,
}) => {
  await page.goto("/");
  await capture(page, "Voiles");
  const before = await page
    .getByRole("button", { name: "Brindille Voiles", exact: true })
    .locator("small")
    .innerText();
  await page.getByRole("button", { name: "Remplacer Voiles" }).click();
  await expect(page.getByRole("progressbar")).toBeVisible();
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await page.getByRole("button", { name: "Cueillir", exact: true }).click();
  await expect(
    page
      .getByRole("button", { name: "Brindille Voiles", exact: true })
      .locator("small"),
  ).toHaveText(before);
  await expect(page.getByLabel("Nombre de brindilles")).toHaveText("1 / 12");
  await expect(page.getByRole("progressbar")).toHaveCount(0);
});

test("synthetic eleven-second capture is capped exactly, twelve voices stay bounded and pending resumes cannot restart", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createTwigBank } = await import("/src/sonoizo/createTwigBank.js");
    const { BRUSHES } = await import("/src/engine/brushes.js");
    const ids = BRUSHES.map((brush) => brush.id),
      errors = [],
      streams = [];
    const original = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = async (...args) => {
      const stream = await original(...args);
      streams.push(stream);
      return stream;
    };
    const NativeContext = window.AudioContext;
    let audio;
    window.AudioContext = class extends NativeContext {
      constructor(...args) {
        super(...args);
        audio = this;
      }
    };
    const rate = 24000,
      frames = rate * 11,
      wav = new ArrayBuffer(44 + frames * 2),
      view = new DataView(wav);
    const text = (offset, value) =>
      [...value].forEach((char, i) =>
        view.setUint8(offset + i, char.charCodeAt(0)),
      );
    text(0, "RIFF");
    view.setUint32(4, 36 + frames * 2, true);
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
    view.setUint32(40, frames * 2, true);
    for (let i = 0; i < frames; i++)
      view.setInt16(
        44 + i * 2,
        Math.sin((i * 440 * Math.PI * 2) / rate) * 10000,
        true,
      );
    // Only the recorder transport is simulated; decoding, resampling and voices are native Web Audio.
    window.MediaRecorder = class {
      static isTypeSupported() {
        return true;
      }
      state = "inactive";
      mimeType = "audio/wav";
      start() {
        this.state = "recording";
      }
      stop() {
        this.state = "inactive";
        queueMicrotask(() => {
          this.ondataavailable({ data: new Blob([wav]) });
          void this.onstop();
        });
      }
    };
    const bank = createTwigBank({
      ids,
      onError: (error) => errors.push(error),
    });
    for (const id of ids) {
      await bank.record(id);
      bank.stopRecording();
      while (bank.getSnapshot().recording)
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const durations = Object.values(bank.getSnapshot().slots).map(
      (slot) => slot.duration,
    );
    ids.forEach((id, i) => bank.press(id, i + 1));
    await new Promise((resolve) => setTimeout(resolve, 350));
    const voices = Object.values(bank.getSnapshot().slots).filter(
      (slot) => slot.playing,
    ).length;
    bank.press(ids[0], 100);
    await new Promise((resolve) => setTimeout(resolve, 30));
    const retriggered = Object.values(bank.getSnapshot().slots).filter(
      (slot) => slot.playing,
    ).length;
    bank.stopAll();
    let resume;
    audio.resume = () =>
      new Promise((resolve) => {
        resume = resolve;
      });
    const pending = bank.listen(ids[0]);
    bank.stopAll();
    resume();
    await pending;
    const silent = Object.values(bank.getSnapshot().slots).every(
      (slot) => !slot.playing,
    );
    bank.dispose();
    await new Promise((resolve) => setTimeout(resolve, 80));
    let rejectsThirteenth = false;
    try {
      createTwigBank({ ids: [...ids, "extra"] });
    } catch {
      rejectsThirteenth = true;
    }
    return {
      durations,
      voices,
      retriggered,
      silent,
      errors,
      rejectsThirteenth,
      cleared: Object.values(bank.getSnapshot().slots).every(
        (slot) => slot.duration === 0 && !slot.playing,
      ),
      stopped: streams.every((stream) =>
        stream.getTracks().every((track) => track.readyState === "ended"),
      ),
      closed: audio.state === "closed",
    };
  });
  expect(result.durations).toHaveLength(12);
  expect(result.durations.every((duration) => duration === 10)).toBe(true);
  expect(result.voices).toBe(12);
  expect(result.retriggered).toBe(12);
  expect(result.silent).toBe(true);
  expect(result.cleared).toBe(true);
  expect(result.stopped).toBe(true);
  expect(result.closed).toBe(true);
  expect(result.rejectsThirteenth).toBe(true);
  expect(result.errors).toEqual([]);
});

test("leaving MP3 while a file decodes prevents late playback in the microphone workshop", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const decode = AudioContext.prototype.decodeAudioData;
    AudioContext.prototype.decodeAudioData = async function (...args) {
      const buffer = await decode.apply(this, args);
      await new Promise((resolve) => {
        window.__releaseMP3Decode = resolve;
      });
      return buffer;
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Musique MP3", exact: true }).click();
  const canvas = page.locator("#stage canvas"),
    samples = await canvas.getAttribute("data-painted-samples");
  await page
    .getByLabel("Importer un fichier audio")
    .setInputFiles("tests/fixtures/tone.mp3");
  await expect
    .poll(() => page.evaluate(() => Boolean(window.__releaseMP3Decode)))
    .toBe(true);
  await page.getByRole("button", { name: "Cueillir", exact: true }).click();
  await page.evaluate(() => window.__releaseMP3Decode());
  await page.waitForTimeout(500);
  await expect(canvas).toHaveAttribute("data-painted-samples", samples);
  await expect(
    page.getByRole("button", { name: "Enregistrer Voiles" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Musique MP3", exact: true }).click();
  await expect(
    page.getByText("Votre musique, un paysage", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mettre en pause" }),
  ).toHaveCount(0);
});
