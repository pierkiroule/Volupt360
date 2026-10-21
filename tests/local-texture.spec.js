import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("bundled textures are served unchanged, without image-provider requests", async ({
  page,
}) => {
  const external = [];
  page.on("request", (r) => {
    if (r.url().startsWith("https://")) external.push(r.url());
  });
  await page.goto("/");
  for (const name of ["Text1.png", "rezo.png"]) {
    const response = await page.request.get("/textures/" + name);
    expect(response.ok()).toBe(true);
    expect(await response.body()).toEqual(
      await readFile("public/textures/" + name),
    );
  }
  await page.getByRole("button", { name: "Vague", exact: true }).click();
  await expect(page.locator(".squibble-orb canvas")).toHaveAttribute(
    "data-external-materials",
    "8",
  );
  expect(external).toEqual([]);
});
test("unavailable local images keep procedural worlds accessible", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/textures/**", (r) =>
    new URL(r.request().url()).pathname.startsWith("/textures/")
      ? r.fulfill({ status: 404, body: "missing" })
      : r.continue(),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Spirale", exact: true }).click();
  await expect(page.locator(".squibble-orb canvas")).toHaveAttribute(
    "data-objects",
    "36",
  );
  await page
    .getByRole("button", { name: "Entrer dans mon monde", exact: true })
    .click();
  await expect(page.locator(".squiggle-world canvas")).toHaveAttribute(
    "data-objects",
    "36",
  );
  expect(errors).toEqual([]);
});
test("local texture decoding is shared across repeated requests", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/textures/*.png", (r) => {
    requests++;
    return r.continue();
  });
  await page.goto("/");
  const count = await page.evaluate(async () => {
    const { loadLocalTextures } = await import("/src/squiggle/localTexture.js");
    const a = await loadLocalTextures(),
      b = await loadLocalTextures();
    return { length: a.length, shared: a[0] === b[0] };
  });
  expect(count).toEqual({ length: 2, shared: true });
  expect(requests).toBe(2);
});
