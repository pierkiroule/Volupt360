import { test, expect } from "@playwright/test";

test("white watercolor workshop: hold paints, release stops, palette and both views work", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Prendre son envol" }).click();
  const canvas = page.locator("canvas");
  await expect(
    page.getByRole("group", { name: "Choisir une brosse" }),
  ).toBeVisible();
  await expect(canvas).toHaveAttribute("data-mood-background", "#ffffff");
  await expect(canvas).toHaveAttribute("data-constellation", "false");
  await expect(canvas).toHaveAttribute("data-painted-samples", "0");
  await page.mouse.move(195, 300);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(450);
  await expect(canvas).toHaveAttribute("data-painted-samples", "0");
  await page.mouse.down();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-painted-samples")))
    .toBeGreaterThan(3);
  await page.mouse.move(245, 260, { steps: 8 });
  await page.mouse.up();
  await expect(canvas).toHaveAttribute("data-nozzle-paint", "false");
  // Let the existing brush bridge flush the final wing samples and diagnostics.
  await page.waitForTimeout(300);
  const count = await canvas.getAttribute("data-painted-samples");
  await page.waitForTimeout(700);
  await expect(canvas).toHaveAttribute("data-painted-samples", count);
  await page
    .getByRole("group", { name: "Choisir une brosse" })
    .getByRole("button")
    .first()
    .click();
  await expect(
    page
      .getByRole("group", { name: "Choisir une brosse" })
      .getByRole("button")
      .first(),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Contempler en gyro 360°" }).click();
  await expect(canvas).toHaveAttribute("data-camera-mode", "gyro");
  const orientation = await canvas.getAttribute("data-camera-orientation");
  await page.mouse.move(180, 250);
  await page.mouse.down();
  await page.mouse.move(290, 320, { steps: 10 });
  await page.mouse.up();
  await expect
    .poll(() => canvas.getAttribute("data-camera-orientation"))
    .not.toBe(orientation);
  await page.getByRole("button", { name: "Revenir en FPV" }).click();
  await expect(canvas).toHaveAttribute("data-camera-mode", "drone");
  await page.getByRole("button", { name: "Faire une pause" }).click();
  await page.mouse.move(195, 300);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.mouse.up();
  await expect(canvas).toHaveAttribute("data-painted-samples", count);
  await page.getByRole("button", { name: "Reprendre", exact: true }).click();
  await page.getByRole("button", { name: "Sortir", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Prendre son envol" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
