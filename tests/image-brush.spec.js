import { test, expect } from "@playwright/test";

async function photo(page, dark = false) {
  const base64 = await page.evaluate((dark) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = dark ? "#183824" : "#f3c8b5";
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = dark ? "#5a9071" : "#b385ce";
    for (let i = 0; i < 8; i++) ctx.fillRect(i * 8, 0, 3, 64);
    return canvas.toDataURL("image/png").split(",")[1];
  }, dark);
  return {
    name: "matter.png",
    mimeType: "image/png",
    buffer: Buffer.from(base64, "base64"),
  };
}

test("a pilot image is required, import creates texture and thumbnail, long press replaces it locally", async ({
  page,
}) => {
  const uploads = [],
    errors = [];
  page.on("request", (request) => {
    if (request.method() === "POST") uploads.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Choisir ÉTHER" }).click();
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  const pad = page.getByRole("button", {
      name: "Sculpter avec Voiles",
      exact: true,
    }),
    canvas = page.locator("#stage canvas");
  await pad.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Prendre une photo" }),
  ).toBeVisible();
  expect(Number(await canvas.getAttribute("data-painted-samples"))).toBe(0);
  await page
    .getByLabel("Importer l’image de Voiles")
    .setInputFiles(await photo(page));
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(pad).toHaveAttribute("data-image-ready", "true");
  await expect(pad.locator("img")).toBeVisible();
  await pad.click();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-painted-samples")))
    .toBeGreaterThan(0);
  await expect
    .poll(async () =>
      Number(await canvas.getAttribute("data-textured-strokes")),
    )
    .toBeGreaterThan(0);
  await expect(canvas).toHaveAttribute("data-imported-brushes", "voiles");
  const previous = await pad.locator("img").getAttribute("src");
  await pad.hover();
  await page.mouse.down();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.mouse.up();
  await page
    .getByLabel("Importer l’image de Voiles")
    .setInputFiles(await photo(page, true));
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await pad.locator("img").getAttribute("src")).not.toBe(previous);
  expect(uploads).toEqual([]);
  expect(errors).toEqual([]);
});

test("image analysis changes photographic alpha, palette and real synthesized sound", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createImageBrush } = await import("/src/engine/ImageBrush.js");
    const { createEchoInstrument } =
      await import("/src/audio/createEchoInstrument.js");
    const create = async (dark) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 64;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = dark ? "#163824" : "#f2c9bf";
      ctx.fillRect(0, 0, 64, 64);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve));
      return createImageBrush(
        new File([blob], "image.png", { type: "image/png" }),
      );
    };
    const profiles = await Promise.all([create(false), create(true)]);
    const ctx = new AudioContext();
    await ctx.resume();
    const mute = ctx.createGain();
    mute.gain.value = 0;
    mute.connect(ctx.destination);
    const instruments = [];
    for (const profile of profiles) {
      const instrument = await createEchoInstrument(ctx, mute, {
        autonomous: false,
      });
      instrument.setBrushImage("voiles", profile);
      instrument.resume();
      instrument.deposit("voiles", { x: 10, y: 0, z: -10 }, 0.7, "a");
      instruments.push(instrument);
    }
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const levels = instruments.map((instrument) => {
      const spectrum = new Uint8Array(1024),
        wave = new Float32Array(2048);
      instrument.graph.analyser.getByteFrequencyData(spectrum);
      instrument.graph.analyser.getFloatTimeDomainData(wave);
      return {
        rms: Math.sqrt(wave.reduce((sum, x) => sum + x * x, 0) / wave.length),
        centroid:
          spectrum.reduce((sum, x, i) => sum + x * i, 0) /
          spectrum.reduce((sum, x) => sum + x, 0),
      };
    });
    const data = profiles.map((profile) => ({
      light: profile.stats.light,
      color: profile.sample({ x: 1, y: 0, z: 0 }).color.getHexString(),
      alpha: profile.binding.texture.image
        .getContext("2d")
        .getImageData(0, 0, 1, 1).data[3],
    }));
    instruments.forEach((i) => i.dispose());
    profiles.forEach((p) => p.binding.texture.dispose());
    mute.disconnect();
    await ctx.close();
    return { data, levels };
  });
  expect(result.data[0].light).toBeGreaterThan(result.data[1].light + 0.4);
  expect(result.data[0].color).not.toBe(result.data[1].color);
  expect(result.data[1].alpha).toBeGreaterThan(result.data[0].alpha + 50);
  for (const level of result.levels) expect(level.rms).toBeGreaterThan(0.001);
  expect(
    Math.abs(result.levels[0].centroid - result.levels[1].centroid),
  ).toBeGreaterThan(2);
});

test("invalid image keeps the picker usable and another brush can still paint", async ({
  page,
}) => {
  await page.goto("/?instrument=off");
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  await page
    .getByRole("button", { name: "Sculpter avec Voiles", exact: true })
    .click();
  await page.getByLabel("Importer l’image de Voiles").setInputFiles({
    name: "broken.png",
    mimeType: "image/png",
    buffer: Buffer.from("broken"),
  });
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await page
    .getByRole("button", { name: "Sculpter avec Filaments", exact: true })
    .click();
  await expect
    .poll(async () =>
      Number(
        await page
          .locator("#stage canvas")
          .getAttribute("data-painted-samples"),
      ),
    )
    .toBeGreaterThan(0);
});
