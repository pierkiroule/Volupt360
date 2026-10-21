import { test, expect } from "@playwright/test";
test("built studio reloads offline and resumes its local project", async ({
  page,
  context,
}) => {
  test.skip(
    !process.env.STUDIO_PROD_URL,
    "Requires a running production preview",
  );
  const url = process.env.STUDIO_PROD_URL;
  await page.goto(url);
  await page.getByRole("button", { name: "Créer une œuvre" }).click();
  const canvas = page.locator(".studio-drawing");
  await expect(canvas).toHaveAttribute("data-ready", "true");
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.55, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(page.locator("main")).toHaveAttribute("data-strokes", "1");
  await expect(page.getByRole("status")).toContainText("Enregistré");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise((resolve) => {
            const req = indexedDB.open("squiggle360-studio", 1);
            req.onsuccess = () => {
              const r = req.result
                .transaction("projects")
                .objectStore("projects")
                .getAll();
              r.onsuccess = () =>
                resolve(r.result.some((p) => p.strokes.length === 1));
            };
          }),
      ),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await page
    .getByRole("button", { name: "Reprendre mon dernier dessin" })
    .click();
  await expect(page.locator("main")).toHaveAttribute("data-strokes", "1");
  await expect(page.locator(".studio-drawing")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await context.setOffline(false);
});
