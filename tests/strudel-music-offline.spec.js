import { test, expect } from "@playwright/test";
test("production Strudel starts offline without remote samples", async ({
  page,
  context,
}) => {
  test.skip(!process.env.LANDSCAPE_PROD_URL, "Requires production preview");
  test.setTimeout(60000);
  await page.route("https://api.polyhaven.com/**", (r) => r.abort());
  await page.goto(process.env.LANDSCAPE_PROD_URL);
  await page
    .getByRole("button", { name: "Générer un paysage", exact: true })
    .click();
  await expect(page.locator("canvas")).toHaveAttribute("data-biome", "forest", {
    timeout: 20000,
  });
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await page
    .getByRole("button", {
      name: "Retrouver mon paysage enregistré",
      exact: true,
    })
    .click();
  await expect(page.locator("canvas")).toHaveAttribute("data-biome", "forest", {
    timeout: 20000,
  });
  await page.getByRole("button", { name: "Musique", exact: true }).click();
  await page.getByRole("button", { name: "Écouter", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Couper le son", exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await page
    .getByRole("button", { name: "Couper le son", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Écouter", exact: true }),
  ).toBeVisible();
  await context.setOffline(false);
});
