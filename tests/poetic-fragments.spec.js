import { test, expect } from "@playwright/test";

test("128 original fragments cover every emoji with 24 unique mood-dependent choices", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { selectPoeticFragments, POETIC_LIBRARY } =
      await import("/src/echoMood/poeticFragments.js");
    const { echoMoodEngine, MOOD_EMOJIS } =
      await import("/src/echoMood/echoMoodEngine.js");
    const a = selectPoeticFragments(echoMoodEngine(["🌊"], 0)),
      b = selectPoeticFragments(echoMoodEngine(["🔥"], 0));
    const mixed = selectPoeticFragments(echoMoodEngine(["🌊", "🔥", "🌙"], 0));
    return {
      total: POETIC_LIBRARY.length,
      unique: new Set(POETIC_LIBRARY.map((x) => x.text)).size,
      a,
      b,
      mixed,
      valid: MOOD_EMOJIS.every((e) => {
        const s = selectPoeticFragments(echoMoodEngine([e], 0));
        return s.length === 24 && new Set(s.map((x) => x.id)).size === 24;
      }),
      repeat: selectPoeticFragments(echoMoodEngine(["🌊"], 0)),
    };
  });
  expect(result.total).toBe(128);
  expect(result.unique).toBe(128);
  expect(result.valid).toBe(true);
  expect(result.a).toEqual(result.repeat);
  expect(result.a).not.toEqual(result.b);
  expect(result.a.every((x) => ["water", "air"].includes(x.theme))).toBe(true);
  expect(result.b.every((x) => ["fire", "memory"].includes(x.theme))).toBe(
    true,
  );
  for (const theme of ["water", "fire", "night"])
    expect(result.mixed.some((x) => x.theme === theme)).toBe(true);
});

test("bubble event reveals one central text for five seconds without loading vocal MP3", async ({
  page,
}) => {
  const voiceRequests = [];
  page.on("request", (r) => {
    if (r.url().includes("/voices/")) voiceRequests.push(r.url());
  });
  // Deterministic collision event; the swept geometry itself is exercised separately.
  await page.route("**/src/sonoizo/createVocalBubbles.js", async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    await route.fulfill({
      response,
      body: source.replace(
        "  const group = new THREE.Group();",
        `  setTimeout(()=>{Promise.resolve(collide(fragments[0].id));}, 500);
  const group = new THREE.Group();`,
      ),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "🌊", exact: true }).click();
  await page.getByRole("button", { name: "Faire éclore mon OIZO" }).click();
  const text = page.locator(".poetic-fragment");
  await expect(text).toHaveCount(1);
  expect((await text.innerText()).length).toBeGreaterThan(10);
  expect(
    await text.evaluate((e) => getComputedStyle(e).animationDuration),
  ).toBe("5s");
  await expect(text).toHaveCount(0, { timeout: 6500 });
  expect(voiceRequests).toEqual([]);
});
