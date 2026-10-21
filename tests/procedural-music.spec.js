import { test, expect } from "@playwright/test";
test("gesture-only shared audio starts, pauses, resumes, stops and exports audible unclipped WAV", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Réglages musicaux", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Lire la musique", exact: true })
    .click();
  await expect(page.getByText("En lecture", { exact: true })).toBeVisible();
  await page.waitForTimeout(1300);
  const result = await page.evaluate(async () => {
    const { getMusicEngine } =
      await import("/src/audio/procedural/ProceduralMusicEngine.js");
    const engine = getMusicEngine(),
      same = getMusicEngine() === engine;
    const first = engine.diagnostics;
    engine.configure({
      mode: "organic",
      parameters: { density: 0.9, energy: 0.6 },
    });
    const blob = await engine.exportWav(5);
    const bytes = await blob.arrayBuffer(),
      view = new DataView(bytes);
    let peak = 0,
      sum = 0;
    for (let i = 44; i < bytes.byteLength; i += 2) {
      const n = view.getInt16(i, true) / 32768;
      peak = Math.max(peak, Math.abs(n));
      sum += n * n;
    }
    return {
      same,
      first,
      size: blob.size,
      header: String.fromCharCode(...new Uint8Array(bytes, 0, 4)),
      peak,
      rms: Math.sqrt(sum / ((bytes.byteLength - 44) / 2)),
    };
  });
  expect(result.same).toBe(true);
  expect(result.first.nodes).toBeLessThan(35);
  expect(result.first.step).toBeGreaterThan(0);
  expect(result.header).toBe("RIFF");
  expect(result.size).toBe(640044);
  expect(result.peak).toBeLessThan(0.99);
  expect(result.rms).toBeGreaterThan(0.0001);
  await page
    .getByRole("button", { name: "Pause musicale", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Lire la musique", exact: true })
    .click();
  await expect(page.getByText("En lecture", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Arrêter la musique", exact: true })
    .click();
  const stopped = await page.evaluate(async () => {
    const { getMusicEngine } =
      await import("/src/audio/procedural/ProceduralMusicEngine.js");
    return getMusicEngine().diagnostics;
  });
  expect(stopped.step).toBe(0);
  expect(stopped.status).toBe("stopped");
  expect(errors).toEqual([]);
});
test("score is deterministic, harmonic, varied and bounded over a simulated 30 minutes", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { GenerativeScore } =
      await import("/src/audio/procedural/musicScore.js");
    const a = new GenerativeScore({ seed: "water", mode: "organic" }),
      b = new GenerativeScore({ seed: "water", mode: "organic" });
    let harmonic = true;
    let identical = true,
      bounded = true,
      seconds = 0,
      events = 0;
    const motifs = new Set();
    while (seconds < 1800) {
      const x = a.next(),
        y = b.next();
      if (JSON.stringify(x) !== JSON.stringify(y)) identical = false;
      seconds += 30 / x.bpm;
      for (const event of x.events)
        for (const note of event.notes)
          if (!x.chord.some((n) => (n - note) % 12 === 0)) harmonic = false;
      events += x.events.length;
      motifs.add(a.motif.join(","));
      if (
        a.memory.length > 12 ||
        x.events.some((e) =>
          e.notes.some((n) => !Number.isFinite(n) || n < 33 || n > 81),
        )
      )
        bounded = false;
    }
    return {
      harmonic,
      identical,
      bounded,
      events,
      motifs: motifs.size,
      chord: a.chord.length,
    };
  });
  expect(result.identical).toBe(true);
  expect(result.harmonic).toBe(true);
  expect(result.bounded).toBe(true);
  expect(result.events).toBeGreaterThan(100);
  expect(result.motifs).toBeGreaterThan(10);
  expect(result.chord).toBeGreaterThanOrEqual(4);
});
test("six instruments, five modes, repeated lifecycle and bounded real audio resources", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.audioContextsCreated = 0;
    const Original = window.AudioContext;
    window.AudioContext = new Proxy(Original, {
      construct(target, args) {
        window.audioContextsCreated++;
        return Reflect.construct(target, args);
      },
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Réglages musicaux", exact: true })
    .click();
  expect(await page.evaluate(() => window.audioContextsCreated)).toBe(0);
  await page
    .getByRole("button", { name: "Lire la musique", exact: true })
    .click();
  await expect(page.getByText("En lecture", { exact: true })).toBeVisible();
  const result = await page.evaluate(async () => {
    const { getMusicEngine, disposeMusicEngine } =
      await import("/src/audio/procedural/ProceduralMusicEngine.js");
    const engine = getMusicEngine();
    const count = window.audioContextsCreated,
      initialNodes = engine.diagnostics.nodes;
    const instruments = Object.keys(engine.instruments);
    const levels = [];
    for (const mode of [
      "piano",
      "ambient",
      "organic",
      "ethereal",
      "experimental",
    ]) {
      engine.configure({ mode, parameters: { density: 0.7, energy: 0.5 } });
      engine.newComposition("world-" + mode);
      const wav = await engine.exportWav(8),
        v = new DataView(await wav.arrayBuffer());
      let sum = 0;
      for (let i = 44; i < v.byteLength; i += 2)
        sum += (v.getInt16(i, true) / 32768) ** 2;
      levels.push(Math.sqrt(sum / ((v.byteLength - 44) / 2)));
    }
    for (let i = 0; i < 6; i++) {
      engine.pause();
      await engine.play();
      engine.stop();
      await engine.play();
    }
    const nodes = engine.diagnostics.nodes,
      contexts = window.audioContextsCreated;
    disposeMusicEngine(engine);
    await new Promise((r) => setTimeout(r, 100));
    const disposed = engine.diagnostics;
    return {
      count,
      contexts,
      initialNodes,
      nodes,
      instruments,
      levels,
      disposed,
    };
  });
  expect(result.count).toBe(1);
  expect(result.contexts).toBe(1);
  expect(result.nodes).toBe(result.initialNodes);
  expect(result.instruments).toHaveLength(6);
  for (const rms of result.levels) expect(rms).toBeGreaterThan(0.0001);
  expect(result.disposed.nodes).toBe(0);
  expect(result.disposed.context).toBe("closed");
});
test("mobile controls apply parameters, recover interruptions, reuse seed and download WAV", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: "Activer le son", exact: true }).tap();
  await page
    .getByRole("button", { name: "Réglages musicaux", exact: true })
    .tap();
  await expect(page.getByText("En lecture", { exact: true })).toBeVisible();
  await page
    .getByLabel("Univers musical", { exact: true })
    .selectOption("organic");
  await page.getByRole("slider", { name: "Densité", exact: true }).fill("0.8");
  await page
    .getByRole("slider", { name: "Volume musical", exact: true })
    .fill("0.4");
  await page.evaluate(async () => {
    const { getMusicEngine } =
      await import("/src/audio/procedural/ProceduralMusicEngine.js");
    await getMusicEngine().context.rawContext.suspend();
  });
  await expect(
    page.getByText("Audio interrompu · reprendre", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Lire la musique", exact: true })
    .tap();
  await expect(page.getByText("En lecture", { exact: true })).toBeVisible();
  await page
    .getByRole("textbox", { name: "Graine musicale", exact: true })
    .fill("mobile-water");
  await page
    .getByRole("button", { name: "Rejouer cette graine", exact: true })
    .tap();
  const settings = await page.evaluate(async () => {
    const { getMusicEngine } =
      await import("/src/audio/procedural/ProceduralMusicEngine.js");
    const e = getMusicEngine();
    return {
      seed: e.seed,
      density: e.target.density,
      volume: e.volume,
      mode: e.mode,
    };
  });
  expect(settings).toEqual({
    seed: "mobile-water",
    density: 0.8,
    volume: 0.4,
    mode: "organic",
  });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "WAV · 30 s", exact: true }).tap();
  expect((await download).suggestedFilename()).toBe(
    "squibble-mobile-water.wav",
  );
  await expect(page.getByText("En lecture", { exact: true })).toBeVisible();
  await page.screenshot({ path: "/tmp/squibble-music-mobile.png" });
  await context.close();
});
