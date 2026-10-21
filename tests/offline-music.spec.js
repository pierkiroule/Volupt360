import { test, expect } from "@playwright/test";
test("production cache reopens the bubble and plays procedural music offline", async ({
  browser,
}) => {
  test.skip(
    !process.env.TEST_OFFLINE,
    "Requires built preview on port 4175; see procedural music documentation.",
  );
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4175/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, {
          once: true,
        }),
      );
  });
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Squibble360" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lune", exact: true }).click();
  await expect(page.locator("main")).toHaveAttribute(
    "data-texture-library",
    "ready",
  );
  await expect(page.locator(".squibble-orb canvas")).toHaveAttribute(
    "data-objects",
    "36",
  );
  await page
    .getByRole("button", { name: "Réglages musicaux", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Lire la musique", exact: true })
    .click();
  await expect(page.getByText("En lecture", { exact: true })).toBeVisible();
  await context.close();
});
