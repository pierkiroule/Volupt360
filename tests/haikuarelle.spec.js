import { test, expect } from "@playwright/test";
test("24 original haikus each have three distinct nonempty verses", async ({
  page,
}) => {
  await page.goto("/?original=1");
  await expect(
    page.getByRole("heading", {
      name: "OIZO-BULLE •°",
      level: 2,
      exact: true,
    }),
  ).toBeVisible();
  const data = await page.evaluate(async () => {
    const { CHILL_FRAGMENTS } = await import("/src/chill/chillConfig.js");
    return CHILL_FRAGMENTS;
  });
  expect(data).toHaveLength(24);
  expect(new Set(data.map((x) => x.text)).size).toBe(24);
  for (const poem of data) {
    expect(poem.lines).toHaveLength(3);
    expect(poem.lines.every((x) => x.trim().length > 0)).toBe(true);
    expect(poem.text.split("\n")).toEqual(poem.lines);
    expect(poem.source).toBeUndefined();
  }
});
test("contemplative encounter reveals a short phrase for five seconds", async ({
  page,
}) => {
  await page.route("**/src/sonoizo/createVocalBubbles.js", async (route) => {
    const response = await route.fetch();
    const text = await response.text();
    await route.fulfill({
      response,
      body: text.replace(
        "  const group = new THREE.Group();",
        "  setTimeout(()=>collide(fragments[0].id), 500);\n  const group = new THREE.Group();",
      ),
    });
  });
  await page.goto("/?original=1");
  await page.getByRole("button", { name: "Prendre son envol" }).click();
  const poem = page.locator(".poetic-fragment");
  await expect(poem).toBeVisible();
  expect(await poem.locator("p").innerText()).toBe(
    "Un même nuage, plusieurs façons de le regarder.",
  );
  expect(
    await poem.locator("p").evaluate((e) => getComputedStyle(e).whiteSpace),
  ).toBe("pre-line");
  expect(
    await poem.evaluate((e) => getComputedStyle(e).animationDuration),
  ).toBe("5s");
  await expect(poem).toHaveCount(0, { timeout: 6500 });
});
