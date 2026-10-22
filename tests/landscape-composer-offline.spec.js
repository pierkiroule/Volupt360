import { test, expect } from "@playwright/test";
test("production landscape restores and its composition worker runs offline", async ({
  page,
  context,
}) => {
  test.skip(!process.env.LANDSCAPE_PROD_URL, "Requires a production preview");
  await page.route("https://api.polyhaven.com/**", (r) => r.abort());
  await page.goto(process.env.LANDSCAPE_PROD_URL);
  await page
    .getByRole("button", { name: "Générer un paysage", exact: true })
    .click();
  await expect(page.locator("canvas")).toHaveAttribute("data-biome", "forest", {
    timeout: 20000,
  });
  await expect(page.locator(".landscape-source")).toContainText("procéduraux");
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
  await context.setOffline(false);
});
