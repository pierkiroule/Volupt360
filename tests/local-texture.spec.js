import { test, expect } from "@playwright/test";
async function image(page) {
  return page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d");
    for (let x = 0; x < 64; x++) {
      ctx.fillStyle = `rgb(${x * 2},${150 + x},${255 - x})`;
      ctx.fillRect(x, 0, 1, 64);
    }
    return c.toDataURL().split(",")[1];
  });
}
async function paint(page) {
  await page.mouse.move(350, 330);
  await page.mouse.down();
  await page.mouse.move(650, 390, { steps: 20 });
  await page.mouse.up();
}
test("Text1 loads once from the repository and visibly textures all brushes in 2D and 360 without external requests", async ({
  page,
}) => {
  const png = await image(page),
    external = [],
    errors = [];
  let requests = 0;
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.route("https://**", (r) => {
    external.push(r.request().url());
    return r.abort();
  });
  await page.route("**/textures/Text1.png", (r) => {
    requests++;
    return r.fulfill({
      contentType: "image/png",
      body: Buffer.from(png, "base64"),
    });
  });
  await page.goto("/");
  await expect(page.locator(".squiggle-app")).toHaveAttribute(
    "data-texture-status",
    "ready",
  );
  await expect(page.locator(".squiggle-paper")).toHaveAttribute(
    "data-external-materials",
    "8",
  );
  await paint(page);
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
  const world = page.locator(".squiggle-world canvas");
  await expect(world).toHaveAttribute("data-external-materials", "8");
  await page.getByRole("button", { name: "Autres outils" }).click();
  const toggle = page.getByRole("button", { name: "Texture locale Text1" });
  await toggle.click();
  await expect(world).toHaveAttribute("data-external-materials", "0");
  await toggle.click();
  await expect(world).toHaveAttribute("data-external-materials", "8");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG ↓", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("squiggle-360.png");
  await page
    .getByRole("button", { name: "Revenir au dessin 2D", exact: true })
    .click();
  await expect(page.locator(".squiggle-paper")).toHaveAttribute(
    "data-strokes",
    "1",
  );
  expect(requests).toBe(1);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});
test("missing Text1 preserves drawing and can be retried after the file becomes available", async ({
  page,
}) => {
  const png = await image(page),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let available = false,
    requests = 0;
  await page.route("**/textures/Text1.png", (r) => {
    requests++;
    return available
      ? r.fulfill({
          contentType: "image/png",
          body: Buffer.from(png, "base64"),
        })
      : r.fulfill({ status: 404, body: "Not found" });
  });
  await page.goto("/");
  await expect(page.locator(".squiggle-app")).toHaveAttribute(
    "data-texture-status",
    "unavailable",
  );
  await paint(page);
  await page.getByRole("button", { name: "Autres outils" }).click();
  await expect(page.getByRole("status")).toContainText("alphas locaux actifs");
  available = true;
  await page.getByRole("button", { name: "Réessayer la texture" }).click();
  await expect(page.locator(".squiggle-app")).toHaveAttribute(
    "data-texture-status",
    "ready",
  );
  await expect(page.locator(".squiggle-paper")).toHaveAttribute(
    "data-strokes",
    "1",
  );
  await expect(page.locator(".squiggle-paper")).toHaveAttribute(
    "data-external-materials",
    "8",
  );
  expect(requests).toBe(2);
  expect(errors).toEqual([]);
});

test("bundled Text1 is served as the real PNG and renders in both dimensions", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator(".squiggle-app")).toHaveAttribute(
    "data-texture-status",
    "ready",
  );
  const response = await page.request.get("/textures/Text1.png");
  expect(response.ok()).toBe(true);
  const data = await response.body();
  expect(data.subarray(0, 8)).toEqual(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  );
  const { readFile } = await import("node:fs/promises");
  expect(data).toEqual(await readFile("public/textures/Text1.png"));
  await expect(page.locator(".squiggle-paper")).toHaveAttribute(
    "data-external-materials",
    "8",
  );
  await paint(page);
  await page
    .getByRole("button", { name: "Entrer en 360", exact: true })
    .click();
  await expect(page.locator(".squiggle-world canvas")).toHaveAttribute(
    "data-external-materials",
    "8",
  );
  expect(errors).toEqual([]);
});
