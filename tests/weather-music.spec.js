import { test, expect } from "@playwright/test";

test("weather scores are reproducible, harmonic and distinct over thirty simulated minutes", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { WeatherScore, musicProfile, MUSIC_WEATHER } =
      await import("/src/simple/WeatherScore.ts");
    const render = (ids, seed) => {
      const s = new WeatherScore(ids, seed),
        events = [];
      for (let t = 0; t < 1800; t += 0.1) events.push(...s.advance(t));
      return events;
    };
    const a = render(["warm", "water"], 91),
      b = render(["water", "warm"], 91),
      c = render(["soft", "tired"], 91);
    return {
      same: JSON.stringify(a) === JSON.stringify(b),
      different: JSON.stringify(a) !== JSON.stringify(c),
      count: a.length,
      slow: c.length,
      valid: [...a, ...c].every(
        (e) =>
          [0, 2, 5, 7, 9].includes(e.note % 12) &&
          e.note >= 45 &&
          e.note <= 81 &&
          e.velocity <= 58 &&
          e.at >= 0,
      ),
      profiles: new Set(
        Object.keys(MUSIC_WEATHER).map((id) =>
          JSON.stringify(musicProfile([id])),
        ),
      ).size,
    };
  });
  expect(result.same).toBe(true);
  expect(result.different).toBe(true);
  expect(result.valid).toBe(true);
  expect(result.profiles).toBe(12);
  expect(result.count).toBeGreaterThan(result.slow);
  expect(result.count).toBeLessThan(3000);
});

test("real local samples decode and smplr produces audio, then pauses, resumes and disposes", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { WeatherMusic } = await import("/src/simple/WeatherMusic.ts");
    const music = new WeatherMusic(["warm", "water"]);
    await music.start();
    const analyser = music.context.createAnalyser();
    analyser.fftSize = 2048;
    music.gain.connect(analyser);
    const data = new Float32Array(2048);
    let peak = 0;
    for (let i = 0; i < 45; i++) {
      await new Promise((r) => setTimeout(r, 100));
      analyser.getFloatTimeDomainData(data);
      for (const value of data) peak = Math.max(peak, Math.abs(value));
    }
    const playing = music.inspect();
    music.pause();
    await new Promise((r) => setTimeout(r, 450));
    const paused = music.inspect();
    await music.start();
    const resumed = music.inspect();
    music.setPalette(["soft", "tired"]);
    const changed = music.inspect();
    music.dispose();
    await new Promise((r) => setTimeout(r, 100));
    return {
      peak,
      playing,
      paused,
      resumed,
      changed,
      closed: music.context.state,
    };
  });
  expect(result.peak).toBeGreaterThan(0.0001);
  expect(result.peak).toBeLessThan(1);
  expect(result.playing.loaded).toBe(true);
  expect(result.playing.events).toBeGreaterThan(0);
  expect(result.paused.running).toBe(false);
  expect(result.paused.state).toBe("suspended");
  expect(result.resumed.running).toBe(true);
  expect(result.changed.profile).toBe("soft,tired");
  expect(result.closed).toBe("closed");
});

test("audio is opt-in, volume and silence work, and leaving the sky pauses playback", async ({
  page,
}) => {
  const requests = [];
  page.on("request", (r) => {
    if (r.url().endsWith(".ogg")) requests.push(r.url());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  expect(requests).toEqual([]);
  await page.getByLabel("Réglages musique").click();
  await page.getByRole("button", { name: "Activer la musique" }).click();
  await expect(page.locator(".simple-music")).toHaveAttribute(
    "data-state",
    "on",
  );
  expect(requests).toHaveLength(9);
  await page.getByRole("slider", { name: "Volume musique" }).fill("0.3");
  await page.getByRole("button", { name: "Couper la musique" }).click();
  await expect(page.locator(".simple-music")).toHaveAttribute(
    "data-state",
    "paused",
  );
  await page.getByRole("button", { name: "Activer la musique" }).click();
  await expect(page.locator(".simple-music")).toHaveAttribute(
    "data-state",
    "on",
  );
  expect(requests).toHaveLength(9);
  await page.getByRole("button", { name: "Revenir à la palette" }).click();
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  await expect(page.locator(".simple-music")).toHaveAttribute(
    "data-state",
    "paused",
  );
});

test("missing samples leave the visual world functional and allow retry", async ({
  page,
}) => {
  await page.route("**/audio/emociel/*.ogg", (r) =>
    r.fulfill({ status: 503, body: "unavailable" }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  await page.getByLabel("Réglages musique").click();
  await page.getByRole("button", { name: "Activer la musique" }).click();
  await expect(page.locator(".simple-music")).toHaveAttribute(
    "data-state",
    "error",
  );
  await expect(page.locator("canvas")).toHaveAttribute("data-ready", "inside");
  await page.unroute("**/audio/emociel/*.ogg");
  await page.getByRole("button", { name: "Activer la musique" }).click();
  await expect(page.locator(".simple-music")).toHaveAttribute(
    "data-state",
    "on",
  );
});
