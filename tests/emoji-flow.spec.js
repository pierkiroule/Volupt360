import { test, expect } from "@playwright/test";

test("the author selects one to three faces, generates their own world and keeps the sequence", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    if (!localStorage.getItem("cosmo-simple.v1"))
      localStorage.setItem("cosmo-simple.v1", JSON.stringify(["warm"]));
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  const canvas = page.locator("canvas"),
    selected = page.locator('.simple-nuance[aria-pressed="true"]');
  await expect(
    page.getByRole("group", { name: "Choisir une à trois émotions" }),
  ).toBeVisible();
  await expect(page.locator(".simple-nuance")).toHaveCount(12);
  await expect(selected).toHaveCount(1);
  await expect(canvas).toHaveAttribute("data-study", "emoji-universes");
  await expect(canvas).toHaveAttribute("data-universe", "joie-en-corolles");
  await page.getByRole("button", { name: "Joie", exact: true }).click();
  await expect(selected).toHaveCount(1);
  await page.getByRole("button", { name: "Tristesse", exact: true }).click();
  await expect(selected).toHaveCount(2);
  await expect(canvas).toHaveAttribute("data-sequence", "warm>water");
  await expect(canvas).toHaveAttribute(
    "data-universe",
    "sourire-entre-les-larmes",
  );
  await page.getByRole("button", { name: "Colère", exact: true }).click();
  await expect(selected).toHaveCount(3);
  await page.getByRole("button", { name: "Peur", exact: true }).click();
  await expect(selected).toHaveCount(3);
  await expect(page.getByRole("status")).toContainText("Trois nuances");
  await expect(canvas).toHaveAttribute("data-sequence", "warm>water>night");
  await page.screenshot({ path: testInfo.outputPath("emoji-palette.png") });
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  await expect(canvas).toHaveAttribute("data-ready", "inside");
  await expect(canvas).toHaveAttribute("data-resonances", "6");
  await expect(page.locator(".simple-music")).toHaveAttribute(
    "data-state",
    "on",
  );
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-reaction-paused", "true");
  const time = await canvas.getAttribute("data-time");
  await page.waitForTimeout(250);
  expect(await canvas.getAttribute("data-time")).toBe(time);
  await page.getByRole("button", { name: "Revenir à la palette" }).click();
  await page.reload();
  await expect(selected).toHaveCount(3);
  await expect(canvas).toHaveAttribute("data-sequence", "warm>water>night");
  await page.getByRole("button", { name: "Joie", exact: true }).click();
  await expect(selected).toHaveCount(2);
  await expect(canvas).toHaveAttribute("data-sequence", "water>night");
  expect(errors).toEqual([]);
});
