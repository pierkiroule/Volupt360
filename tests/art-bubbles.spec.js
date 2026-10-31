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
