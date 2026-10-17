import { test, expect } from "@playwright/test";

test("chill score remains chord-coherent and varied over two hours with bounded state", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createChillComposer } = await import("/src/audio/ChillComposer.js");
    function simulate(seed) {
      const c = createChillComposer({ seed }),
        first = [],
        sections = new Set(),
        phrases = new Set(),
        counts = {};
      let invalid = 0,
        maxBatch = 0,
        minPitch = Infinity,
        maxPitch = -Infinity;
      for (let i = 0; i < 72000; i++) {
        const events = c.next(i * 0.1, { brightness: 0.6, hypnos: 0.3 });
        maxBatch = Math.max(maxBatch, events.length);
        if (first.length < 60) first.push(...events);
        sections.add(c.stats.section);
        if (i % 50 === 0) phrases.add(JSON.stringify(c.stats.motif));
        for (const event of events) {
          counts[event.role] = (counts[event.role] || 0) + 1;
          if (event.pitch !== undefined) {
            const chord = c.harmonyAt(event.time),
              pcs = chord.tones.map((p) => ((p % 12) + 12) % 12);
            if (!pcs.includes(((event.pitch % 12) + 12) % 12)) invalid++;
            if (event.role === "lead") {
              minPitch = Math.min(minPitch, event.pitch);
              maxPitch = Math.max(maxPitch, event.pitch);
            }
          }
        }
      }
      return {
        first: first.slice(0, 60),
        sections: [...sections],
        phrases: phrases.size,
        counts,
        invalid,
        maxBatch,
        minPitch,
        maxPitch,
        state: c.stats,
      };
    }
    return {
      a: simulate(731),
      b: simulate(731),
      different: simulate(432).first,
    };
  });
  expect(result.a).toEqual(result.b);
  expect(result.a.first).not.toEqual(result.different);
  expect(result.a.invalid).toBe(0);
  expect(result.a.sections).toHaveLength(4);
  expect(result.a.phrases).toBeGreaterThan(20);
  expect(Object.keys(result.a.counts).sort()).toEqual([
    "bass",
    "kick",
    "lead",
    "shaker",
    "wood",
  ]);
  expect(result.a.minPitch).toBeGreaterThanOrEqual(5);
  expect(result.a.maxPitch).toBeLessThanOrEqual(19);
  expect(result.a.state.motif).toHaveLength(5);
  expect(result.a.maxBatch).toBeLessThanOrEqual(8);
});

test("arbitrary gestures stay on chord tones and a background gap does not create a backlog", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createChillComposer } = await import("/src/audio/ChillComposer.js");
    const c = createChillComposer({ seed: 99 });
    let invalid = 0;
    for (let i = 0; i < 4000; i++) {
      const time = i * 0.137,
        pitch = c.brushPitch(time, i * 37, (i % 101) / 100);
      if (
        !c
          .harmonyAt(time)
          .tones.some((t) => (((t - pitch) % 12) + 12) % 12 === 0)
      )
        invalid++;
      c.influence(1000);
    }
    c.next(0);
    const after = c.next(3600),
      one = c.next(3600);
    const stats = c.stats;
    return { invalid, count: after.length, duplicate: one.length, stats };
  });
  expect(result.invalid).toBe(0);
  expect(result.count).toBeLessThanOrEqual(8);
  expect(result.duplicate).toBe(0);
  expect(result.stats.activity).toBeLessThanOrEqual(1);
});

test("native chill playback produces audio, drums and preserves its musical timeline on pause", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createTwigBank } = await import("/src/sonoizo/createTwigBank.js");
    const bank = createTwigBank({ ids: ["voiles"] });
    await bank.preparePlayback();
    await bank.startInstrument("souffle");
    let rms = 0;
    for (let i = 0; i < 16; i++) {
      bank.depositSound("voiles", { x: i % 3, y: 0, z: -2 }, 0.8, `trace-${i}`);
      await new Promise((r) => setTimeout(r, 100));
      rms = Math.max(rms, bank.getVisualFeatures().rms);
    }
    const before = bank.getInstrumentStats();
    bank.pauseAmbience();
    await bank.preparePlayback();
    await new Promise((r) => setTimeout(r, 100));
    const after = bank.getInstrumentStats();
    bank.dispose();
    return { rms, before, after };
  });
  expect(result.rms).toBeGreaterThan(0.0001);
  expect(result.before.composition.style).toBe("electro-chill");
  expect(result.before.bpm).toBe(78);
  expect(result.before.composition.identity).toBe("chambre-cinématographique");
  expect(result.before.percussion.counts.kick).toBeGreaterThan(0);
  expect(
    result.before.voices + result.before.retiringVoices,
  ).toBeLessThanOrEqual(10);
  expect(result.before.percussion.voices).toBeLessThanOrEqual(12);
  expect(result.after.sequenceStep).toBeGreaterThanOrEqual(
    result.before.sequenceStep,
  );
});
