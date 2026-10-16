import { test, expect } from "@playwright/test";

import { observation } from "./helpers/birdFixtures.js";

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
