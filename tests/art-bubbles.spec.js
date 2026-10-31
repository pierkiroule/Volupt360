import { test, expect } from "@playwright/test";

test("museum selection excludes protected images, is distinct, cached and depends on choices", async ({
  page,
}) => {
  let requests = [];
  await page.route("https://api.artic.edu/**", (route) => {
    requests.push(new URL(route.request().url()).searchParams.get("q"));
    return route.fulfill({
      json: {
        data: [
          {
            id: 0,
            title: "Protected",
            image_id: "no",
            is_public_domain: false,
          },
          ...[1, 2, 3].map((id) => ({
            id,
            title: "Composition " + id,
            artist_display: "Artist",
            image_id: "image-" + id,
            is_public_domain: true,
          })),
        ],
      },
    });
  });
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { loadArtworks } = await import("/src/simple/ArtCollection.ts");
    const signal = new AbortController().signal;
    const items = await loadArtworks(["night"], signal);
    await loadArtworks(["night"], signal);
    return items;
  });
  expect(result.map((a) => a.id)).toEqual([1, 2, 3]);
  expect(result.map((a) => a.role)).toEqual(["Écho", "Nuance", "Ouverture"]);
  expect(requests).toContain("Wassily Kandinsky");
});

test("network failure preserves the sky and explains missing works", async ({
  page,
}) => {
  await page.route("https://api.artic.edu/**", (route) =>
    route.fulfill({ status: 503, body: "" }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  await page.getByRole("button", { name: "Œuvres et sources" }).click();
  await expect(
    page.getByText(
      "Œuvres momentanément indisponibles. Le ciel reste accessible.",
    ),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveAttribute("data-ready", "inside");
});

test("a genuine world-space crossing reveals once and resources are disposed", async ({
  page,
}) => {
  await page.route("https://api.artic.edu/**", (route) =>
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

test("a failed artist and a sparse first page are completed by the public-domain search", async ({
  page,
}) => {
  const searches = [];
  await page.route("https://api.artic.edu/**", (route) => {
    const url = new URL(route.request().url());
    const q = url.searchParams.get("q");
    searches.push(q);
    const params = JSON.parse(url.searchParams.get("params"));
    expect(params.query.bool.filter[0].term.is_public_domain).toBe(true);
    if (q === "Wassily Kandinsky")
      return route.fulfill({ status: 503, body: "" });
    const ids = q.includes("abstract") ? [4, 5, 6] : [1];
    return route.fulfill({
      json: {
        data: ids.map((id) => ({
          id,
          title: "Abstract " + id,
          artist_display: "Artist",
          image_id: "img-" + id,
          is_public_domain: true,
        })),
      },
    });
  });
  await page.goto("/");
  const works = await page.evaluate(async () => {
    const { loadArtworks } = await import("/src/simple/ArtCollection.ts");
    return loadArtworks(["night", "warm"], new AbortController().signal);
  });
  expect(works).toHaveLength(3);
  expect(new Set(works.map((w) => w.id)).size).toBe(3);
  expect(searches).toContain("abstract composition color rhythm");
});

test("retry recovers the collection without leaving the sky", async ({
  page,
}) => {
  let available = false;
  await page.route("https://api.artic.edu/**", (route) =>
    route.fulfill(
      available
        ? {
            json: {
              data: [1, 2, 3].map((id) => ({
                id,
                title: "Composition " + id,
                image_id: "img-" + id,
                is_public_domain: true,
                artist_display: "Artist",
              })),
            },
          }
        : { status: 503, body: "" },
    ),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  await page.getByRole("button", { name: "Œuvres et sources" }).click();
  await expect(
    page.getByRole("button", { name: "Réessayer les œuvres" }),
  ).toBeVisible();
  available = true;
  await page.getByRole("button", { name: "Réessayer les œuvres" }).click();
  await expect(
    page.getByRole("button", { name: "Œuvres et sources" }),
  ).toHaveText("Œuvres · 3/3");
  await expect(page.locator("canvas")).toHaveAttribute("data-ready", "inside");
});
