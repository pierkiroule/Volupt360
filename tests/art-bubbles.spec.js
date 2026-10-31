import { test, expect } from "@playwright/test";
test("a genuine world-space crossing reveals once and resources are disposed", async ({
  page,
}) => {
  await page.route("https://commons.wikimedia.org/**", (route) =>
    route.fulfill({ status: 503, body: "" }),
  );
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { ArtBubbles } = await import("/src/simple/ArtBubbles.ts");
    const canvas = document.createElement("canvas");
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "red";
    ctx.fillRect(0, 0, 8, 8);
    const bubbles = new ArtBubbles();
    let encounters = 0;
    bubbles.onEncounter = () => encounters++;
    bubbles.setWorks([
      {
        id: 1,
        title: "Test",
        artist: "Test",
        image: canvas.toDataURL(),
        source: "",
        role: "Écho",
      },
    ]);
    await new Promise((resolve) => setTimeout(resolve, 150));
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 17.2, 3);
    bubbles.update(camera, true);
    camera.position.set(0, 17.2, -3);
    bubbles.update(camera, true);
    bubbles.update(camera, true);
    const children = bubbles.group.children.length;
    bubbles.dispose();
    return { encounters, children, after: bubbles.group.children.length };
  });
  expect(result).toEqual({ encounters: 1, children: 2, after: 0 });
});

const pages = (license = "Public domain") =>
  Object.fromEntries(
    [1, 2, 3].map((id) => [
      id,
      {
        pageid: id,
        title: "File:Composition " + id,
        imageinfo: [
          {
            mime: "image/jpeg",
            thumburl: "https://upload.wikimedia.org/test-" + id + ".jpg",
            descriptionurl:
              "https://commons.wikimedia.org/wiki/File:Composition_" + id,
            extmetadata: {
              LicenseShortName: { value: license },
              Artist: { value: "<b>Artist</b>" },
              ObjectName: { value: "Composition " + id },
            },
          },
        ],
      },
    ]),
  );

test("Commons selects three unique public-domain works, strips HTML, follows choices and caches", async ({
  page,
}) => {
  const queries = [];
  await page.route("https://commons.wikimedia.org/**", (route) => {
    queries.push(new URL(route.request().url()).searchParams.get("gsrsearch"));
    return route.fulfill({ json: { query: { pages: pages() } } });
  });
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { loadArtworks } = await import("/src/simple/ArtCollection.ts");
    const signal = new AbortController().signal;
    const a = await loadArtworks(["night"], signal);
    await loadArtworks(["night"], signal);
    return a;
  });
  expect(result.map((a) => a.id)).toEqual([1, 2, 3]);
  expect(
    result.every(
      (a) =>
        a.artist === "Artist" && a.source.includes("commons.wikimedia.org"),
    ),
  ).toBe(true);
  expect(result.map((a) => a.role)).toEqual(["Écho", "Nuance", "Ouverture"]);
  expect(queries.some((q) => q.includes("Wassily Kandinsky"))).toBe(true);
});

test("restricted images are refused and retry restores the collection without leaving the sky", async ({
  page,
}) => {
  let permitted = false;
  await page.route("https://commons.wikimedia.org/**", (route) =>
    route.fulfill({
      json: { query: { pages: pages(permitted ? "CC0" : "CC BY-SA 4.0") } },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  await page.getByRole("button", { name: "Œuvres et sources" }).click();
  await expect(
    page.getByRole("button", { name: "Réessayer les œuvres" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Œuvres et sources" }),
  ).toHaveText("Œuvres · 0/3");
  permitted = true;
  await page.getByRole("button", { name: "Réessayer les œuvres" }).click();
  await expect(
    page.getByRole("button", { name: "Œuvres et sources" }),
  ).toHaveText("Œuvres · 3/3");
  await expect(page.locator("canvas")).toHaveAttribute("data-ready", "inside");
});

test("network failure is non-blocking", async ({ page }) => {
  await page.route("https://commons.wikimedia.org/**", (route) =>
    route.fulfill({ status: 503, body: "" }),
  );
  await page.goto("/");
  const failed = await page.evaluate(async () => {
    const { loadArtworks } = await import("/src/simple/ArtCollection.ts");
    try {
      await loadArtworks(["trust"], new AbortController().signal);
      return false;
    } catch {
      return true;
    }
  });
  expect(failed).toBe(true);
  await expect(
    page.getByRole("button", { name: "Entrer dans mon ciel" }),
  ).toBeVisible();
});
