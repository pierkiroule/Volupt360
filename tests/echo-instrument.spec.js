import { test, expect } from "@playwright/test";

test("each ambient world emits sparse melodies and sustained layers, then stops and resumes cleanly", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createEchoInstrument } =
      await import("/src/audio/createEchoInstrument.js");
    const ctx = new AudioContext();
    await ctx.resume();
    const silent = ctx.createGain();
    silent.gain.value = 0;
    silent.connect(ctx.destination);
    const instruments = await Promise.all(
      ["souffle", "marees", "ramure"].map(async (universe) => {
        const instrument = await createEchoInstrument(ctx, silent, {
          universe,
          seedBrush:
            universe === "marees"
              ? "corolles"
              : universe === "ramure"
                ? "falaises"
                : "voiles",
        });
        instrument.resume();
        return instrument;
      }),
    );
    const levels = instruments.map(() => ({
      peak: 0,
      low: 1,
      high: 0,
      maxVoices: 0,
      maxPercussion: 0,
    }));
    const wave = new Float32Array(2048);
    for (let tick = 0; tick < 120; tick++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      instruments.forEach((instrument, i) => {
        instrument.graph.analyser.getFloatTimeDomainData(wave);
        const rms = Math.sqrt(
          wave.reduce((sum, value) => sum + value * value, 0) / wave.length,
        );
        levels[i].low = Math.min(levels[i].low, rms);
        levels[i].high = Math.max(levels[i].high, rms);
        levels[i].peak = Math.max(levels[i].peak, ...wave.map(Math.abs));
        levels[i].maxVoices = Math.max(
          levels[i].maxVoices,
          instrument.stats.voices,
        );
        levels[i].maxPercussion = Math.max(
          levels[i].maxPercussion,
          instrument.stats.percussion.voices,
        );
      });
    }
    const stats = instruments.map((instrument) => instrument.stats);
    instruments.forEach((instrument) => instrument.pause());
    const paused = instruments.map((instrument) => instrument.stats);
    await new Promise((resolve) => setTimeout(resolve, 350));
    const silence = instruments.map((instrument) => {
      instrument.graph.analyser.getFloatTimeDomainData(wave);
      return Math.max(...wave.map(Math.abs));
    });
    instruments.forEach((instrument) => instrument.resume());
    await new Promise((resolve) => setTimeout(resolve, 300));
    const resumed = instruments.map((instrument) => instrument.stats);
    instruments.forEach((instrument) => instrument.dispose());
    silent.disconnect();
    await ctx.close();
    return { stats, levels, paused, silence, resumed };
  });
  result.stats.forEach((stats, i) => {
    expect(stats.leadNotes).toBeGreaterThanOrEqual(1);
    expect(stats.percussion.counts.kick).toBe(0);
    expect(stats.percussion.counts.wood).toBe(0);
    expect(stats.percussion.counts.shaker).toBe(0);
    expect(result.levels[i].high).toBeGreaterThan(0.02);
    expect(result.levels[i].high - result.levels[i].low).toBeGreaterThan(0.02);
    expect(result.levels[i].peak).toBeLessThan(0.95);
    expect(result.levels[i].maxVoices).toBeLessThanOrEqual(10);
    expect(result.levels[i].maxPercussion).toBeLessThanOrEqual(8);
    expect(result.paused[i].percussion.voices).toBe(0);
    expect(result.silence[i]).toBeLessThan(0.001);
    expect(result.resumed[i].active).toBe(true);
    expect(result.resumed[i].padActive).toBe(true);
  });
});

test("three sonic identities produce distinct spectra, audible levels and bounded peaks", async ({
  page,
}) => {
  await page.goto("/");
  const results = await page.evaluate(async () => {
    const { createEchoInstrument } =
      await import("/src/audio/createEchoInstrument.js");
    const ctx = new AudioContext();
    await ctx.resume();
    const silent = ctx.createGain();
    silent.gain.value = 0;
    silent.connect(ctx.destination);
    const instruments = await Promise.all(
      ["souffle", "marees", "ramure"].map(async (universe) => {
        const instrument = await createEchoInstrument(ctx, silent, {
          universe,
          autonomous: false,
        });
        instrument.resume();
        instrument.deposit("corolles", { x: 0, y: 0, z: -5 }, 0.8, "test");
        return instrument;
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const measure = (instrument) => {
      const wave = new Float32Array(instrument.graph.analyser.fftSize);
      const spectrum = new Uint8Array(
        instrument.graph.analyser.frequencyBinCount,
      );
      instrument.graph.analyser.getFloatTimeDomainData(wave);
      instrument.graph.analyser.getByteFrequencyData(spectrum);
      const mass = spectrum.reduce((sum, value) => sum + value, 0);
      return {
        rms: Math.sqrt(
          wave.reduce((sum, value) => sum + value * value, 0) / wave.length,
        ),
        peak: wave.reduce((max, value) => Math.max(max, Math.abs(value)), 0),
        centroid: spectrum.reduce((sum, value, i) => sum + value * i, 0) / mass,
      };
    };
    const single = instruments.map(measure);
    for (const instrument of instruments)
      for (let i = 0; i < 10; i++)
        instrument.recall("corolles", { x: 0, y: 0, z: -5 }, "test");
    await new Promise((resolve) => setTimeout(resolve, 700));
    const dense = instruments.map(measure);
    instruments.forEach((instrument) => instrument.pause());
    await new Promise((resolve) => setTimeout(resolve, 300));
    const paused = instruments.map(measure);
    instruments.forEach((instrument) => instrument.dispose());
    silent.disconnect();
    await ctx.close();
    return { single, dense, paused };
  });
  for (const level of results.single) expect(level.rms).toBeGreaterThan(0.01);
  expect(
    new Set(results.single.map((level) => Math.round(level.centroid))).size,
  ).toBe(3);
  for (const level of results.dense) {
    expect(level.rms).toBeGreaterThan(0.02);
    expect(level.peak).toBeLessThan(0.95);
  }
  for (const level of results.paused) expect(level.rms).toBeLessThan(0.001);
});

test("an organic generated sound starts the world, painting adds spatial notes and photo silences it", async ({
  page,
}) => {
  const errors = [],
    files = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (/\/voices\/.*\.mp3|\/ambiances\/.*\.mp3/.test(request.url()))
      files.push(request.url());
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Choisir ÉTHER", exact: true })
    .click();
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  const canvas = page.locator("#stage canvas");
  await expect
    .poll(async () =>
      Number(await canvas.getAttribute("data-instrument-notes")),
    )
    .toBeGreaterThan(0);
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-music-energy")))
    .toBeGreaterThan(0.05);
  const before = Number(await canvas.getAttribute("data-instrument-notes"));
  await page.mouse.move(450, 300);
  await page.mouse.down();
  await expect(canvas).toHaveAttribute("data-nozzle-paint", "true");
  await expect
    .poll(async () =>
      Number(await canvas.getAttribute("data-instrument-notes")),
    )
    .toBeGreaterThan(before);
  await page.mouse.up();
  expect(
    Number(await canvas.getAttribute("data-instrument-voices")),
  ).toBeLessThanOrEqual(10);
  await page
    .getByRole("button", { name: "FPV 360° gyro", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-camera-mode", "gyro");
  await page.getByRole("button", { name: "Vue photo", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-sculpture-paused", "true");
  await page.getByRole("button", { name: "FPV drone", exact: true }).click();
  await canvas.click({ position: { x: 400, y: 300 } });
  await expect
    .poll(async () =>
      Number(await canvas.getAttribute("data-instrument-voices")),
    )
    .toBeGreaterThan(0);
  expect(files).toEqual([]);
  expect(errors).toEqual([]);
});

test("brush geometry composes three timbres with bounded polyphony and remembered spatial motifs", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createTwigBank } = await import("/src/sonoizo/createTwigBank.js");
    const bank = createTwigBank({ ids: ["voiles", "corolles", "racines"] });
    bank.enableFireflies();
    await bank.preparePlayback();
    await bank.startInstrument();
    bank.depositSound("voiles", { x: -20, y: 8, z: 0 }, 0.5, "a");
    bank.depositSound("corolles", { x: 20, y: 0, z: 0 }, 0.5, "b");
    bank.depositSound("racines", { x: 0, y: -8, z: 20 }, 0.5, "c");
    for (let i = 0; i < 100; i++)
      bank.recallSound("racines", { x: 0, y: 0, z: 0 }, "c");
    bank.updateListener(
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: -1 },
      { x: 0, y: 1, z: 0 },
    );
    const stats = bank.getInstrumentStats();
    await new Promise((resolve) => setTimeout(resolve, 1300));
    const energy = bank.getVisualFeatures().energy;
    bank.forgetSound("a");
    const afterForget = bank.getInstrumentStats().motifs;
    bank.pauseAmbience();
    const paused = bank.getInstrumentStats();
    bank.dispose();
    return { stats, energy, afterForget, paused };
  });
  expect(result.stats.voices).toBeLessThanOrEqual(10);
  expect(result.stats.motifs).toBe(3);
  for (const count of Object.values(result.stats.timbres))
    expect(count).toBeGreaterThan(0);
  expect(result.energy).toBeGreaterThan(0.02);
  expect(result.afterForget).toBe(2);
  expect(result.paused.voices).toBe(0);
  expect(result.paused.active).toBe(false);
});

test("spatial audio follows the listener orientation in 360 contemplation", async ({
  page,
}) => {
  await page.goto("/");
  const ears = await page.evaluate(async () => {
    const { createEchoInstrument } =
      await import("/src/audio/createEchoInstrument.js");
    const ctx = new AudioContext(),
      splitter = ctx.createChannelSplitter(2),
      left = ctx.createAnalyser(),
      right = ctx.createAnalyser(),
      silent = ctx.createGain();
    left.fftSize = right.fftSize = 2048;
    silent.gain.value = 0;
    splitter.connect(left, 0);
    splitter.connect(right, 1);
    left.connect(silent);
    right.connect(silent);
    silent.connect(ctx.destination);
    await ctx.resume();
    const instrument = await createEchoInstrument(ctx, splitter, {
      autonomous: false,
    });
    instrument.resume();
    instrument.listener(
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: -1 },
      { x: 0, y: 1, z: 0 },
    );
    instrument.deposit("corolles", { x: -20, y: 0, z: -4 }, 0.8, "a");
    const rms = (analyser) => {
      const data = new Float32Array(2048);
      analyser.getFloatTimeDomainData(data);
      return Math.sqrt(data.reduce((sum, x) => sum + x * x, 0) / data.length);
    };
    await new Promise((resolve) => setTimeout(resolve, 1300));
    const first = { left: rms(left), right: rms(right) };
    instrument.listener(
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 1, z: 0 },
    );
    await new Promise((resolve) => setTimeout(resolve, 500));
    const turned = { left: rms(left), right: rms(right) };
    instrument.dispose();
    splitter.disconnect();
    left.disconnect();
    right.disconnect();
    silent.disconnect();
    await ctx.close();
    return { first, turned };
  });
  expect(ears.first.left).toBeGreaterThan(ears.first.right * 1.05);
  expect(ears.turned.right).toBeGreaterThan(ears.turned.left * 1.05);
});

test("the welcome presents the artistic experimentation and remains usable on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Explorer les phénomènes échohypnotiques",
    }),
  ).toBeVisible();
  const introduction = page.getByRole("article");
  await expect(introduction).toContainText(
    "expérimentation artistique interactive",
  );
  await expect(introduction).toContainText(
    "proposition artistique exploratoire",
  );
  await expect(introduction).toContainText("hypnose contemporaine");
  await expect(introduction).toContainText("transnumérisme");
  await expect(introduction).toContainText("expériences transmodales");
  await expect(introduction).toContainText("synesthésie");
  await expect(introduction.getByRole("heading", { level: 3 })).toHaveCount(5);
  await page
    .getByRole("button", { name: "Choisir ABYSSE", exact: true })
    .click();
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  await expect(introduction).toHaveCount(0);
  await expect(page.locator(".twig-pad")).toHaveCount(6);
});
