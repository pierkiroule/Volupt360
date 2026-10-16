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

test("a first material can use Ogg AUDIO metadata and displays share-alike export conditions", async ({
  page,
}) => {
  await mockCommons(page, { count: 3 });
  await page.route("https://commons.wikimedia.org/**", (route) => {
    const url = route.request().url();
    if (new URL(url).searchParams.get("gsrsearch").includes("bitmap"))
      return route.fulfill({ json: commonsReply(url, 3) });
    const item = commonsPage(1, "audio");
    item.imageinfo[0].mime = "application/ogg";
    item.imageinfo[0].mediatype = "AUDIO";
    item.imageinfo[0].extmetadata.LicenseUrl.value =
      "https://creativecommons.org/licenses/by-sa/4.0/";
    return route.fulfill({ json: { query: { pages: [item] } } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  await expect(page.locator(".generated-brush")).toBeEnabled();
  await page.mouse.move(180, 350);
  await page.mouse.down();
  await expect(page.locator(".bird-credits summary")).toContainText("♫");
  await page.mouse.up();
  await page.locator(".bird-credits summary").click();
  await expect(page.locator(".share-alike-note")).toContainText("CC BY-SA");
  await page.getByRole("button", { name: "Vue photo", exact: true }).click();
  await expect(page.locator(".export-license")).toContainText("CC BY-SA 4.0");
});
