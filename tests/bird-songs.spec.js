import { test, expect } from "@playwright/test";

import { observation, wav, mockCommons } from "./helpers/birdFixtures.js";

test("Commons catalogue accepts verified free licenses and plain attribution", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(
    async (fixtures) => {
      const { recordings, assignRecordings } =
        await import("/src/audio/birds/catalog.js");
      const items = recordings(fixtures);
      return {
        count: items.length,
        author: items[0].author,
        license: items[0].licenseUrl,
        missing: assignRecordings(["a", "b", "c"], items).c,
      };
    },
    [observation(1), observation(2), observation(3, false, "cc-by-nc")],
  );
  expect(result.count).toBe(2);
  expect(result.author).toBe("test-recordist");
  expect(result.license).toContain("/by/4.0/");
  expect(result.missing).toBeNull();
  expect(
    (
      await page.request.get("/api/commons-media?pageid=invalid&kind=audio")
    ).status(),
  ).toBe(400);
});

test("native recording playback analyzes real decoded data, fades, caches and cannot start after release", async ({
  page,
}) => {
  await mockCommons(page, { count: 1 });
  await page.goto("/");
  const result = await page.evaluate(
    async (payload) => {
      const { createBirdSongs } =
        await import("/src/audio/birds/createBirdSongs.js");
      const ctx = new AudioContext();
      await ctx.resume();
      const output = ctx.createGain();
      output.gain.value = 0;
      output.connect(ctx.destination);
      let direct = 0,
        relay = 0;
      const bytes = Uint8Array.from(atob(payload.wav), (c) => c.charCodeAt(0));
      const request = async (url) => {
        if (url.includes("w/api.php"))
          return Response.json({ query: { pages: [payload.observation] } });
        if (url.startsWith("https:")) {
          direct++;
          throw new TypeError("CORS blocked");
        }
        relay++;
        return new Response(bytes, {
          headers: { "content-type": "audio/wav" },
        });
      };
      const player = createBirdSongs({
        ids: ["voiles"],
        context: () => ctx,
        destination: () => output,
        request,
      });
      await player.start("voiles");
      await new Promise((r) => setTimeout(r, 40));
      const attack = player.features().rms;
      await new Promise((r) => setTimeout(r, 310));
      const sounding = player.features();
      const playing = player.snapshot();
      player.stop();
      await new Promise((r) => setTimeout(r, 250));
      const fading = player.features().rms;
      await new Promise((r) => setTimeout(r, 600));
      const silent = player.features();
      player.dispose();
      const second = createBirdSongs({
        ids: ["voiles"],
        context: () => ctx,
        destination: () => output,
        request,
      });
      await second.start("voiles");
      await new Promise((r) => setTimeout(r, 250));
      const cached = second.features().rms;
      second.dispose();
      await caches.delete("sonoizo-commons-v2");
      localStorage.removeItem("sonoizo-commons-audio-v2");
      let resolveBytes;
      const delayed = createBirdSongs({
        ids: ["voiles"],
        context: () => ctx,
        destination: () => output,
        request: async (url) =>
          url.includes("w/api.php")
            ? Response.json({ query: { pages: [payload.observation] } })
            : new Promise((resolve) => {
                resolveBytes = () => resolve(new Response(bytes));
              }),
      });
      const starting = delayed.start("voiles");
      while (!resolveBytes) await new Promise((r) => setTimeout(r, 10));
      delayed.stop();
      resolveBytes();
      await starting;
      const cancelled = delayed.snapshot();
      delayed.dispose();
      output.disconnect();
      await ctx.close();
      return {
        rms: sounding.rms,
        attack,
        fading,
        high: sounding.high,
        silence: silent.rms || 0,
        cached,
        direct,
        relay,
        playing: playing.state,
        credits: Object.keys(playing.used).length,
        cancelled: cancelled.state,
      };
    },
    { wav: wav().toString("base64"), observation: observation(1) },
  );
  expect(result.rms).toBeGreaterThan(0.05);
  expect(result.high).toBeGreaterThan(0);
  expect(result.attack).toBeLessThan(result.rms);
  expect(result.fading).toBeGreaterThan(0.01);
  expect(result.fading).toBeLessThan(result.rms);
  expect(result.silence).toBeLessThan(0.001);
  expect(result.cached).toBeGreaterThan(0.05);
  expect(result.direct).toBe(1);
  expect(result.relay).toBe(1);
  expect(result.playing).toBe("playing");
  expect(result.credits).toBe(1);
  expect(result.cancelled).toBe("idle");
});

test("mobile sculpture starts birdsong only during the gesture and supplies attribution", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockCommons(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  await expect(page.locator(".bird-credits summary")).toContainText(
    "Nature texture",
  );
  const canvas = page.locator("#stage canvas");
  await expect(page.locator(".bird-credits summary")).not.toContainText("♫");
  await page.mouse.move(180, 350);
  await page.mouse.down();
  await expect(canvas).toHaveAttribute("data-nozzle-paint", "true");
  await expect(page.locator(".bird-credits summary")).toContainText("♫");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-music-energy")))
    .toBeGreaterThan(0.1);
  await page.mouse.up();
  await expect(page.locator(".bird-credits summary")).not.toContainText("♫");
  await page.locator(".bird-credits summary").click();
  await expect(page.locator(".bird-credits")).toContainText("test-recordist");
  await expect(
    page.getByRole("button", {
      name: "Télécharger les crédits des matières et chants",
    }),
  ).toBeVisible();
});

test("network failure stays silent with an explicit recoverable error", async ({
  page,
}) => {
  await page.route("https://commons.wikimedia.org/**", (route) =>
    route.abort(),
  );
  await page.route("**/api/commons-search?**", (route) =>
    route.fulfill({ status: 502, json: { error: "offline" } }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  await page.locator(".bird-credits summary").click();
  await expect(page.locator(".bird-credits")).toContainText(
    "Nouvelle matière indisponible",
  );
  await expect(
    page.getByRole("button", { name: "Réessayer la matière" }),
  ).toBeVisible();
  const canvas = page.locator("#stage canvas");
  await page
    .getByRole("button", { name: "Mettre l’ambiance en pause" })
    .click();
  await page.mouse.move(240, 500);
  await page.mouse.down();
  await page.waitForTimeout(900);
  await page.mouse.up();
  expect(
    Number(await canvas.getAttribute("data-music-energy")) || 0,
  ).toBeLessThan(0.01);
});
