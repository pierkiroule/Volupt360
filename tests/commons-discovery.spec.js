import { test, expect } from "@playwright/test";
import {
  commonsPage,
  commonsReply,
  mockCommons,
} from "./helpers/birdFixtures.js";

test("bird discovery broadens the search and accepts real Commons Ogg metadata", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(
    async (fixture) => {
      const { drawRecording } = await import("/src/audio/birds/catalog.js");
      const queries = [];
      const item = await drawRecording([], {
        random: () => 0,
        request: async (url) => {
          const query = new URL(url).searchParams.get("gsrsearch");
          queries.push(query);
          return Response.json({
            query: { pages: query === "filetype:audio bird" ? [fixture] : [] },
          });
        },
      });
      return { item, queries };
    },
    (() => {
      const item = commonsPage(1, "audio");
      item.imageinfo[0].mime = "application/ogg";
      item.imageinfo[0].mediatype = "AUDIO";
      item.imageinfo[0].extmetadata.LicenseUrl.value =
        "//creativecommons.org/licenses/by-sa/4.0/";
      return item;
    })(),
  );
  expect(result.item.sound).toBe(1);
  expect(result.item.shareAlike).toBe(true);
  expect(result.queries.at(-1)).toBe("filetype:audio bird");
  expect(result.queries.length).toBeLessThanOrEqual(12);
});

test("photo-only materials never request birdsong and preserve share-alike credits", async ({
  page,
}) => {
  const queries = [],
    audioRequests = [],
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (/\.(wav|ogg)(?:\?|$)/.test(request.url()))
      audioRequests.push(request.url());
  });
  await mockCommons(page);
  await page.route("https://commons.wikimedia.org/**", (route) => {
    const url = route.request().url();
    const search = new URL(url).searchParams.get("gsrsearch");
    queries.push(search);
    if (!search.includes("bitmap")) return route.abort();
    const reply = commonsReply(url, 3);
    for (const item of reply.query.pages)
      item.imageinfo[0].extmetadata.LicenseUrl.value =
        "https://creativecommons.org/licenses/by-sa/4.0/";
    return route.fulfill({ json: reply });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  await expect(page.locator(".generated-brush")).toBeEnabled();
  await page
    .getByRole("button", { name: "Nouvelle matière", exact: true })
    .click();
  await expect(page.locator(".generated-brush")).toHaveCount(2);
  await page.mouse.move(180, 350);
  await page.mouse.down();
  const canvas = page.locator("#stage canvas");
  await expect(canvas).toHaveAttribute("data-nozzle-paint", "true");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-painted-samples")))
    .toBeGreaterThan(2);
  await page.mouse.up();
  await page.locator(".bird-credits summary").click();
  await expect(page.locator(".share-alike-note")).toContainText("CC BY-SA");
  await expect(page.locator(".bird-credits")).not.toContainText("Chant");
  await page.getByRole("button", { name: "Vue photo", exact: true }).click();
  await expect(page.locator(".export-license")).toContainText("CC BY-SA 4.0");
  expect(queries.length).toBeGreaterThanOrEqual(2);
  expect(queries.every((query) => query.includes("bitmap"))).toBe(true);
  expect(audioRequests).toEqual([]);
  expect(errors).toEqual([]);
});
