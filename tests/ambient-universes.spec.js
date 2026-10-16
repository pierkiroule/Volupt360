import { test, expect } from "@playwright/test";

test("ambient grammars are reproducible, distinct, sparse, non synchronous and bounded over hours", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createAmbientComposer } =
      await import("/src/audio/AmbientComposer.js");
    const simulate = (id, hypnos) => {
      const composer = createAmbientComposer(id, 41),
        events = [];
      for (let i = 0; i < 72000; i++)
        events.push(...composer.next(i / 10, { hypnos, echo: 0.7 }));
      return {
        first: events.slice(0, 20),
        count: events.length,
        state: composer.stats,
      };
    };
    return ["souffle", "marees", "ramure"].map((id) => ({
      regular: simulate(id, 0),
      repeated: simulate(id, 0),
      slow: simulate(id, 1),
    }));
  });
  for (const world of result) {
    expect(world.regular).toEqual(world.repeated);
    expect(world.regular.count).toBeGreaterThan(50);
    expect(world.regular.count).toBeLessThan(2200);
    expect(world.slow.count).toBeLessThan(world.regular.count * 0.6);
    expect(world.regular.state.memory).toBeLessThanOrEqual(64);
    expect(
      new Set(world.regular.state.clocks.map((clock) => clock.period)).size,
    ).toBe(3);
  }
  expect(new Set(result.map((world) => world.regular.count)).size).toBe(3);
});

test("native ambient synthesis emits sound, mixed worlds keep playing and pause is silent", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createAmbientMixer } =
      await import("/src/audio/createAmbientMixer.js");
    const ctx = new AudioContext();
    await ctx.resume();
    const mute = ctx.createGain();
    mute.gain.value = 0;
    mute.connect(ctx.destination);
    const mixer = await createAmbientMixer(ctx, mute, "souffle");
    mixer.resume();
    const rms = () => {
      const wave = new Float32Array(2048);
      mixer.graph.analyser.getFloatTimeDomainData(wave);
      return Math.sqrt(wave.reduce((sum, x) => sum + x * x, 0) / wave.length);
    };
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const ether = rms();
    mixer.setMix([0.5, 0.5, 0]);
    mixer.setAtmosphere({ echo: 0.8, hypnos: 0.7 });
    await new Promise((resolve) => setTimeout(resolve, 1800));
    const mixed = rms(),
      stats = mixer.stats;
    mixer.setMix([0, 0, 1]);
    await new Promise((resolve) => setTimeout(resolve, 1800));
    const memory = rms(),
      name = mixer.stats.soundWorld;
    mixer.pause();
    await new Promise((resolve) => setTimeout(resolve, 400));
    const silence = rms();
    mixer.dispose();
    mute.disconnect();
    await ctx.close();
    return { ether, mixed, memory, stats, name, silence };
  });
  expect(result.ether).toBeGreaterThan(0.01);
  expect(result.mixed).toBeGreaterThan(0.01);
  expect(result.memory).toBeGreaterThan(0.01);
  expect(result.stats.mix).toEqual([0.5, 0.5, 0]);
  expect(result.stats.hypnos).toBe(0.7);
  expect(result.name).toBe("MÉMOIRE");
  expect(result.silence).toBeLessThan(0.001);
});

test("universe navigation remains available when the first birdsong cannot be created", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [],
    files = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (/\.mp3/.test(request.url())) files.push(request.url());
  });
  await page.route("https://api.inaturalist.org/**", (route) =>
    route.fulfill({ json: { results: [] } }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Choisir ÉTHER" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Choisir ÉTHER" }).click();
  const spheres = page.locator(".atmosphere-spheres"),
    box = await spheres.boundingBox();
  await page.mouse.move(box.x + box.width / 6, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 3, box.y + box.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(page.getByLabel("HYPNOS", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  await expect(page.locator(".twig-pad")).toHaveCount(0);
  await expect(page.locator(".bird-credits")).toBeVisible();
  await page.mouse.move(170, 350);
  await page.mouse.down();
  await page.mouse.move(230, 300, { steps: 5 });
  await page.mouse.up();
  await expect
    .poll(async () =>
      Number(
        await page.locator("#stage canvas").getAttribute("data-steering-moves"),
      ),
    )
    .toBeGreaterThan(0);
  expect(
    Number(
      await page.locator("#stage canvas").getAttribute("data-painted-samples"),
    ) || 0,
  ).toBe(0);
  await page.getByRole("button", { name: "Changer d’univers" }).click();
  await expect(
    page.getByRole("button", { name: "Choisir ÉTHER" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  expect(files).toEqual([]);
});
