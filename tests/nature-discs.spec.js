import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const image = readFileSync("public/textures/Text1.png");
function fixture(count = 7) {
  return {
    query: {
      pages: Object.fromEntries(
        Array.from({ length: count }, (_, i) => [
          String(i),
          {
            title: `File:Nature ${i}.png`,
            imageinfo: [
              {
                mime: "image/png",
                width: 1024,
                height: 768,
                thumburl: `https://upload.wikimedia.org/test/nature${i}.png`,
                descriptionurl: `https://commons.wikimedia.org/wiki/File:Nature_${i}.png`,
                extmetadata: {
                  Artist: {
                    value: `<a href="https://commons.wikimedia.org">Nature Author ${i}</a>`,
                  },
                  LicenseShortName: {
                    value:
                      i === count - 1 ? "All rights reserved" : "CC BY 4.0",
                  },
                  LicenseUrl: {
                    value:
                      i === count - 1
                        ? ""
                        : "https://creativecommons.org/licenses/by/4.0/",
                  },
                },
              },
            ],
          },
        ]),
      ),
    },
  };
}

test("licensed nature photographs load into six floating discs with discreet credits and metadata cache", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const queries = [],
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(
    "https://commons.wikimedia.org/w/api.php?**",
    async (route) => {
      queries.push(
        new URL(route.request().url()).searchParams.get("gsrsearch"),
      );
      await route.fulfill({
        json: fixture(25),
        headers: { "access-control-allow-origin": "*" },
      });
    },
  );
  await page.route("https://upload.wikimedia.org/test/**", (route) =>
    route.fulfill({
      body: image,
      contentType: "image/png",
      headers: { "access-control-allow-origin": "*" },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-photos", "6");
  await expect(canvas).toHaveAttribute("data-calls", "11");
  await expect(
    page.getByRole("region", { name: "Crédits des photographies" }),
  ).toHaveCount(0);
  await page.getByText("Sources des images", { exact: true }).click();
  await expect(
    page.getByRole("link", { name: "CC BY 4.0", exact: true }),
  ).toHaveCount(6);
  await expect(page.locator(".simple-photo-sources")).toContainText(
    "Nature Author",
  );
  await expect(page.locator(".simple-photo-sources")).not.toContainText(
    "All rights reserved",
  );
  await page.screenshot({ path: "test-results/nature-disc-credits.png" });
  await page.getByText("Sources des images", { exact: true }).click();
  await page.screenshot({ path: "test-results/nature-discs.png" });
  expect(queries.some((q) => q.includes("sunlight forest"))).toBe(true);
  expect(queries.some((q) => q.includes("rain leaves"))).toBe(true);
  const requests = queries.length;
  await page.getByRole("button", { name: "Revenir à la palette" }).click();
  await expect(canvas).toHaveAttribute("data-calls", "9");
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  await expect(canvas).toHaveAttribute("data-photos", "6");
  expect(queries.length).toBe(requests);
  expect(errors).toEqual([]);
});

test("API failure keeps the sky usable and a retry restores the photographs", async ({
  page,
}) => {
  let offline = true;
  await page.route("https://commons.wikimedia.org/w/api.php?**", (route) =>
    offline
      ? route.fulfill({ status: 503, body: "Unavailable" })
      : route.fulfill({
          json: fixture(),
          headers: { "access-control-allow-origin": "*" },
        }),
  );
  await page.route("https://upload.wikimedia.org/test/**", (route) =>
    route.fulfill({
      body: image,
      contentType: "image/png",
      headers: { "access-control-allow-origin": "*" },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  const canvas = page.locator("canvas");
  await expect(
    page.getByRole("button", { name: "Photos indisponibles · Réessayer" }),
  ).toBeVisible();
  await expect(canvas).toHaveAttribute("data-photos", "0");
  const time = await canvas.getAttribute("data-time");
  await expect.poll(() => canvas.getAttribute("data-time")).not.toBe(time);
  offline = false;
  await page
    .getByRole("button", { name: "Photos indisponibles · Réessayer" })
    .click();
  await expect(canvas).toHaveAttribute("data-photos", "6");
});

test("Commons parser rejects missing licenses and untrusted image URLs", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async (data) => {
    const { parseCommons } = await import("/src/simple/naturePhotos.ts");
    const valid = parseCommons(data);
    const page = data.query.pages["0"];
    page.imageinfo[0].thumburl = "https://example.org/foreign.png";
    return { valid, filtered: parseCommons(data) };
  }, fixture());
  expect(result.valid).toHaveLength(6);
  expect(result.filtered).toHaveLength(5);
  expect(result.valid[0].author).toBe("Nature Author 0");
});

test("a blocked thumbnail is skipped without breaking the remaining photographs", async ({
  page,
}) => {
  await page.route("https://commons.wikimedia.org/w/api.php?**", (route) =>
    route.fulfill({
      json: fixture(),
      headers: { "access-control-allow-origin": "*" },
    }),
  );
  await page.route("https://upload.wikimedia.org/test/**", (route) =>
    route.request().url().endsWith("nature0.png")
      ? route.abort("accessdenied")
      : route.fulfill({
          body: image,
          contentType: "image/png",
          headers: { "access-control-allow-origin": "*" },
        }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-photos", "5");
  await page.getByText("Sources des images", { exact: true }).click();
  await expect(
    page.getByRole("link", { name: "CC BY 4.0", exact: true }),
  ).toHaveCount(5);
  await expect(page.locator(".simple-photo-sources")).not.toContainText(
    "Nature Author 0",
  );
});

test("an empty universe search broadens to a related nature query", async ({
  page,
}) => {
  const queries = [];
  await page.addInitScript(() =>
    localStorage.setItem("cosmo-simple.v1", JSON.stringify(["confused"])),
  );
  await page.route("https://commons.wikimedia.org/w/api.php?**", (route) => {
    const query = new URL(route.request().url()).searchParams.get("gsrsearch");
    queries.push(query);
    return route.fulfill({
      json: query.includes("aurora landscape")
        ? { query: { pages: {} } }
        : fixture(25),
      headers: { "access-control-allow-origin": "*" },
    });
  });
  await page.route("https://upload.wikimedia.org/test/**", (route) =>
    route.fulfill({
      body: image,
      contentType: "image/png",
      headers: { "access-control-allow-origin": "*" },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-photos", "6");
  expect(queries.some((q) => q.includes("aurora landscape"))).toBe(true);
  expect(queries.some((q) => q.includes("aurora borealis"))).toBe(true);
});

test("a new connection receives different photographs while retaining the same weather", async ({
  page,
}) => {
  await page.route("https://commons.wikimedia.org/w/api.php?**", (route) =>
    route.fulfill({
      json: fixture(25),
      headers: { "access-control-allow-origin": "*" },
    }),
  );
  await page.route("https://upload.wikimedia.org/test/**", (route) =>
    route.fulfill({
      body: image,
      contentType: "image/png",
      headers: { "access-control-allow-origin": "*" },
    }),
  );
  const selections = [];
  for (let visit = 0; visit < 3; visit++) {
    await page.goto("/");
    await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
    await expect(page.locator("canvas")).toHaveAttribute("data-photos", "6");
    selections.push(
      await page
        .locator(".simple-photo-sources li>a:first-child")
        .evaluateAll((links) => links.map((a) => a.href)),
    );
  }
  expect(new Set(selections.flat()).size).toBe(18);
});
