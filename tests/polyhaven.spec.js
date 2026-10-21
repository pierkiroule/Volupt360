import { test, expect } from "@playwright/test";
test.use({ viewport: { width: 390, height: 844 } });
async function paint(page) {
  await page.mouse.move(80, 300);
  await page.mouse.down();
  await page.mouse.move(300, 360, { steps: 20 });
  await page.mouse.up();
}
test("optional gallery applies real colour/height maps to the active brush in 2D and 360, caches and resets", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const image = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d");
    for (let x = 0; x < 64; x++) {
      ctx.fillStyle = `rgb(${x * 2},${150 + x},${255 - x})`;
      ctx.fillRect(x, 0, 1, 64);
    }
    return c.toDataURL().split(",")[1];
  });
  let catalogue = 0,
    files = 0,
    maps = 0;
  await page.route("https://api.polyhaven.com/assets?**", (route) => {
    catalogue++;
    return route.fulfill({
      json: {
        rock_test: { name: "Rock Test", categories: ["rock"] },
        wood_test: { name: "Wood Test", categories: ["wood"] },
      },
    });
  });
  await page.route("https://api.polyhaven.com/files/rock_test", (route) => {
    files++;
    return route.fulfill({
      json: {
        diff: {
          "1k": {
            jpg: { url: "https://dl.polyhaven.org/test_diff.jpg", size: 1000 },
          },
        },
        disp: {
          "1k": {
            png: { url: "https://dl.polyhaven.org/test_disp.png", size: 1000 },
          },
        },
      },
    });
  });
  await page.route("https://cdn.polyhaven.com/**", (route) =>
    route.fulfill({
      contentType: "image/png",
      body: Buffer.from(image, "base64"),
    }),
  );
  await page.route("https://dl.polyhaven.org/**", (route) => {
    maps++;
    return route.fulfill({
      contentType: "image/png",
      body: Buffer.from(image, "base64"),
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Entrer en 360", exact: true }),
  ).toBeEnabled();
  expect(catalogue).toBe(0);
  await paint(page);
  await page.getByRole("button", { name: "Autres outils" }).click();
  await page.getByRole("button", { name: "Matières", exact: true }).click();
  await page.getByRole("button", { name: "Appliquer Rock Test" }).click();
  await expect(page.locator(".squiggle-paper")).toHaveAttribute(
    "data-external-materials",
    "1",
  );
  await expect(page.getByRole("status")).toContainText("appliquée à Feu");
  await page.getByRole("button", { name: "Fermer les matières" }).click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const c = document.querySelector(".squiggle-paper"),
          a = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
        let count = 0;
        for (let i = 0; i < a.length; i += 4)
          if (a[i + 2] > a[i] + 25 && a[i + 1] > a[i] + 20) count++;
        return count;
      }),
    )
    .toBeGreaterThan(30);
  await page
    .getByRole("button", { name: "Entrer en 360", exact: true })
    .click();
  await expect(page.locator(".squiggle-world canvas")).toHaveAttribute(
    "data-external-materials",
    "1",
  );
  await page.getByRole("button", { name: "Matières", exact: true }).click();
  const previous = catalogue;
  await expect(
    page.getByRole("button", { name: "Appliquer Rock Test" }),
  ).toBeVisible();
  expect(catalogue).toBe(previous);
  await page.getByRole("button", { name: "Appliquer Rock Test" }).click();
  await expect(page.getByRole("status")).toContainText("appliquée");
  expect(files).toBe(1);
  expect(maps).toBe(2);
  await page
    .getByRole("textbox", { name: "Rechercher une texture" })
    .fill("wood");
  await page.getByRole("button", { name: "Rechercher", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Appliquer Wood Test" }),
  ).toBeVisible();
  await page.route("https://api.polyhaven.com/files/wood_test", (route) =>
    route.fulfill({
      json: {
        diff: {
          "1k": {
            jpg: { url: "https://dl.polyhaven.org/blocked.jpg", size: 100 },
          },
        },
      },
    }),
  );
  await page.route("https://dl.polyhaven.org/blocked.jpg", (route) =>
    route.fulfill({ status: 403, body: "denied" }),
  );
  await page.getByRole("button", { name: "Appliquer Wood Test" }).click();
  await expect(page.getByRole("status")).toContainText(
    "matière actuelle est conservée",
  );
  await expect(page.locator(".squiggle-world canvas")).toHaveAttribute(
    "data-external-materials",
    "1",
  );
  // An HTTP error produces a browser console error, but no JavaScript/WebGL error.
  const expectedHTTP = errors.filter((e) => e.includes("403"));
  for (const e of expectedHTTP) errors.splice(errors.indexOf(e), 1);
  const cleanup = await page.evaluate(async () => {
    const { loadPolyHaven } = await import("/src/squiggle/polyHaven.js");
    const m = await loadPolyHaven({ id: "rock_test" });
    const { createMaterialAtlas } =
      await import("/src/squiggle/materialAtlas.js");
    const a = createMaterialAtlas();
    a.setMaterials({ anger: m });
    let disposed = 0;
    a.color.addEventListener("dispose", () => disposed++);
    a.height.addEventListener("dispose", () => disposed++);
    const width = a.color.image.width;
    a.setMaterials({});
    const idle = a.color.image.width;
    a.dispose();
    return { width, idle, disposed };
  });
  expect(cleanup).toEqual({ width: 2048, idle: 1, disposed: 2 });
  await page.getByRole("button", { name: "Alpha local", exact: true }).click();
  await expect(page.locator(".squiggle-world canvas")).toHaveAttribute(
    "data-external-materials",
    "0",
  );
  await page.getByRole("button", { name: "Fermer les matières" }).click();
  await page
    .getByRole("button", { name: "Revenir au dessin 2D", exact: true })
    .click();
  await expect(page.locator(".squiggle-paper")).toHaveAttribute(
    "data-strokes",
    "1",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("provider error leaves local painting available and retry explicit", async ({
  page,
}) => {
  await page.route("https://api.polyhaven.com/**", (r) =>
    r.fulfill({ status: 503, json: { error: "offline" } }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Entrer en 360", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Autres outils" }).click();
  await page.getByRole("button", { name: "Matières", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("alphas locaux");
  await expect(
    page.getByRole("button", { name: "Rechercher", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Fermer les matières" }).click();
  await paint(page);
  await expect(page.locator(".squiggle-paper")).toHaveAttribute(
    "data-strokes",
    "1",
  );
});
