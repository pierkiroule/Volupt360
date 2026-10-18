import { test, expect } from "@playwright/test";
for (const [name, width, height] of [
  ["mobile", 390, 844],
  ["desktop", 1440, 1000],
]) {
  test(
    "poetic welcome is readable and launchable on " + name,
    async ({ page }) => {
      await page.setViewportSize({ width, height });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto("/?conte=1");
      await expect(
        page.getByRole("heading", { level: 1, name: "Oizobul•°" }),
      ).toBeVisible();
      await expect(
        page.getByText("Un conte transnumériste échohypnotique", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Prendre son envol" }),
      ).toBeVisible();
      const overflow = await page.evaluate(
        () => document.querySelector(".story-welcome").scrollWidth > innerWidth,
      );
      expect(overflow).toBe(false);
      await page
        .getByText("Pourquoi transnumériste ?", { exact: true })
        .click();
      await expect(
        page.getByText(/le numérique devient un territoire d’imagination/),
      ).toBeVisible();
      await page.getByText("Et l’échohypnose ?", { exact: true }).click();
      await expect(
        page.getByText(/Un nom poétique pour cette expérience/),
      ).toBeVisible();
      await page
        .locator(".story-welcome")
        .evaluate((node) => (node.scrollTop = 0));
      await page.screenshot({
        path: "/tmp/oizobul-welcome-" + name + ".png",
        fullPage: true,
      });
      await page.getByRole("checkbox").uncheck();
      await page.getByRole("button", { name: "Prendre son envol" }).click();
      await expect(page.locator(".story-welcome")).toHaveCount(0);
      await expect(page.locator("canvas")).toHaveAttribute(
        "data-constellation",
        "true",
      );
      expect(errors).toEqual([]);
    },
  );
}
test("reduced motion stops the decorative flights and keyboard opens the explanations", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?conte=1");
  const name = await page
    .locator(".story-orbit-one")
    .evaluate((node) => getComputedStyle(node).animationName);
  expect(name).toBe("none");
  await page
    .locator("summary")
    .filter({ hasText: "Pourquoi transnumériste ?" })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText(/le numérique devient un territoire d’imagination/),
  ).toBeVisible();
});
