import { test, expect } from "@playwright/test";

test("procedural water reaches the existing export capture with ordered audio timestamps", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createTwigBank } = await import("/src/sonoizo/createTwigBank.js");
    const bank = createTwigBank({ ids: ["voiles"] });
    let blocks = 0,
      energy = 0,
      samples = 0,
      ordered = true,
      last = -Infinity,
      rate = 0;
    bank.setCaptureTap((data, sampleRate, time) => {
      blocks++;
      rate = sampleRate;
      ordered &&= time > last;
      last = time;
      for (const value of data) {
        energy += value * value;
        samples++;
      }
    });
    await bank.preparePlayback();
    await bank.startInstrument("marees");
    await new Promise((resolve) => setTimeout(resolve, 1200));
    bank.dispose();
    return { blocks, rms: Math.sqrt(energy / samples), ordered, rate };
  });
  expect(result.blocks).toBeGreaterThan(10);
  expect(result.rms).toBeGreaterThan(0.01);
  expect(result.ordered).toBe(true);
  expect(result.rate).toBeGreaterThanOrEqual(22050);
});

test("water DSP is reproducible, finite at multiple sample rates, tuned and free of endless tails", async ({
  page,
}) => {
  await page.goto("/");
  const results = await page.evaluate(async () => {
    const { WaterDSP } = await import("/src/audio/WaterDSP.js");
    const render = (type, rate, seed) => {
      const dsp = new WaterDSP({
        type,
        sampleRate: rate,
        seed,
        frequency: 440,
        duration: 0.8,
      });
      let peak = 0,
        sum = 0,
        hash = 2166136261,
        late = 0;
      for (let i = 0; i < rate; i++) {
        const value = dsp.render(0.5);
        if (!Number.isFinite(value)) throw new Error("Non-finite water DSP");
        peak = Math.max(peak, Math.abs(value));
        sum += value * value;
        hash = Math.imul(hash ^ Math.round(value * 1e6), 16777619) >>> 0;
        if (i > rate * 0.85) late = Math.max(late, Math.abs(value));
      }
      return {
        peak,
        rms: Math.sqrt(sum / rate),
        hash,
        late,
        radius: dsp.radius,
      };
    };
    return [22050, 44100, 48000].flatMap((rate) =>
      ["drop", "bubble", "flow", "spray"].map((type) => ({
        type,
        first: render(type, rate, 41),
        repeated: render(type, rate, 41),
        alternate: render(type, rate, 42),
      })),
    );
  });
  for (const result of results) {
    expect(result.first).toEqual(result.repeated);
    expect(result.first.hash).not.toBe(result.alternate.hash);
    expect(result.first.peak).toBeGreaterThan(0);
    expect(result.first.peak).toBeLessThan(0.8);
    expect(result.first.rms).toBeGreaterThan(0.001);
    expect(result.first.radius).toBeCloseTo(3.26 / 440, 6);
    if (result.type !== "flow") expect(result.first.late).toBe(0);
  }
});

test("a single worklet module serves universe changes, cancellation and bounded voices", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createTwigBank } = await import("/src/sonoizo/createTwigBank.js");
    const probe = new AudioContext();
    const prototype = Object.getPrototypeOf(probe.audioWorklet);
    const original = prototype.addModule;
    let moduleLoads = 0;
    prototype.addModule = function (url, ...args) {
      if (String(url).includes("WaterProcessor")) moduleLoads++;
      return original.call(this, url, ...args);
    };
    await probe.close();
    const bank = createTwigBank({ ids: ["voiles"] });
    await bank.preparePlayback();
    const a = bank.startInstrument("souffle");
    const b = bank.startInstrument("ramure");
    await Promise.all([a, b]);
    const latest = bank.getInstrumentStats();
    for (let cycle = 0; cycle < 12; cycle++) {
      await bank.startInstrument(cycle % 2 ? "marees" : "souffle");
      for (let i = 0; i < 30; i++)
        bank.recallSound("voiles", { x: 0, y: 0, z: -5 }, "trace");
      const stats = bank.getInstrumentStats();
      if (stats.voices + stats.retiringVoices > 10)
        throw new Error("Unbounded voice count");
      bank.pauseAmbience();
    }
    const pausing = bank.startInstrument("marees");
    bank.pauseAmbience();
    await pausing;
    const pausedDuringLoad = bank.getInstrumentStats().active;
    await bank.preparePlayback();
    const resumedAfterLoad = bank.getInstrumentStats().active;
    const pending = bank.startInstrument("marees");
    bank.removeAmbience();
    await pending;
    const removed = bank.getInstrumentStats();
    bank.dispose();
    prototype.addModule = original;
    return { latest, removed, moduleLoads, pausedDuringLoad, resumedAfterLoad };
  });
  expect(result.latest.universe).toBe("ramure");
  expect(result.latest.soundWorld).toBe("MÉMOIRE");
  expect(result.latest.synthesis).toBe("procedural-water");
  expect(result.removed).toBeNull();
  expect(result.pausedDuringLoad).toBe(false);
  expect(result.resumedAfterLoad).toBe(true);
  expect(result.moduleLoads).toBe(1);
});

test("a worklet loading error is reported and the previous synth can be restored", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const probe = new AudioContext();
    const prototype = Object.getPrototypeOf(probe.audioWorklet),
      original = prototype.addModule;
    prototype.addModule = function (url, ...args) {
      if (String(url).includes("WaterProcessor"))
        return Promise.reject(new Error("Injected worklet load failure"));
      return original.call(this, url, ...args);
    };
    void probe.close();
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  await expect(page.locator(".universe-error")).toContainText(
    "Composition indisponible",
  );
  await page.goto("/?sound=legacy");
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  await expect
    .poll(async () =>
      Number(
        await page
          .locator("#stage canvas")
          .getAttribute("data-instrument-notes"),
      ),
    )
    .toBeGreaterThan(0);
  await expect(page.locator(".universe-error")).toHaveCount(0);
});
