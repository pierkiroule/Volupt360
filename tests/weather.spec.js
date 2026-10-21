import { test, expect } from "@playwright/test";
async function place(page, name, x, y) {
  await page.getByRole("button", { name, exact: true }).click();
  const b = await page.locator(".weather-disk").boundingBox();
  await page.mouse.click(b.x + b.width * x, b.y + b.height * y);
}
test("compose, adjust, move, undo and visit the same sky", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Entrer dans mon ciel ↗" }),
  ).toBeDisabled();
  await place(page, "Pluie", 0.32, 0.45);
  await place(page, "Rayonnement", 0.67, 0.4);
  await place(page, "Vent", 0.55, 0.7);
  await expect(page.locator("main")).toHaveAttribute("data-zones", "3");
  await page
    .getByRole("slider", { name: "Proportion", exact: true })
    .fill("0.4");
  await page.getByRole("slider", { name: "Opacité", exact: true }).fill("0.45");
  await expect(page.locator("output").last()).toHaveText("45 %");
  const b = await page.locator(".weather-disk").boundingBox();
  await page.mouse.move(b.x + b.width * 0.55, b.y + b.height * 0.7);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * 0.6, b.y + b.height * 0.6, {
    steps: 5,
  });
  await page.mouse.up();
  await page.getByRole("button", { name: "Retirer", exact: true }).click();
  await expect(page.locator("main")).toHaveAttribute("data-zones", "2");
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.locator("main")).toHaveAttribute("data-zones", "3");
  await page.getByRole("button", { name: "Entrer dans mon ciel ↗" }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-zones", "3");
  await page.getByRole("button", { name: "Voyager", exact: true }).click();
  await page.waitForTimeout(300);
  const before = await page.locator("canvas").getAttribute("data-position");
  await page.waitForTimeout(400);
  expect(await page.locator("canvas").getAttribute("data-position")).not.toBe(
    before,
  );
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.waitForTimeout(100);
  const frozen = await page.locator("canvas").getAttribute("data-position");
  await page.waitForTimeout(250);
  expect(await page.locator("canvas").getAttribute("data-position")).toBe(
    frozen,
  );
  await page.screenshot({ path: "test-results/weather-3d.png" });
  await page.getByRole("button", { name: "← Disque", exact: true }).click();
  await expect(page.locator(".weather-disk")).toHaveAttribute(
    "data-zones",
    "3",
  );
  expect(errors).toEqual([]);
});
test("explicit local save, reload and mobile tools fit", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await place(page, "Orage", 0.4, 0.4);
  await place(page, "Crépuscule", 0.7, 0.65);
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.locator(".meteo-notice")).toContainText("cet appareil");
  await page.reload();
  await expect(page.locator("main")).toHaveAttribute("data-zones", "2");
  expect(
    await page.evaluate(
      () => document.querySelector(".meteo").scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/weather-mobile.png" });
});
test("all weather materials stay finite and malformed saved data is rejected", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const m = await import("/src/weather/weatherModel.ts");
    localStorage.setItem(
      m.STORAGE_KEY,
      JSON.stringify({
        version: 1,
        zones: [
          {
            id: "bad",
            kind: "rain",
            x: 0,
            y: 0,
            size: 500,
            opacity: 1,
            seed: 1,
          },
        ],
      }),
    );
    return {
      saved: m.readSaved(),
      positions: m.WEATHER.map((w, i) =>
        m.skyPosition({
          id: String(i),
          kind: w.id,
          x: 0.3,
          y: 0.5,
          size: 0.2,
          opacity: 0.8,
          seed: i,
        }),
      ),
    };
  });
  expect(result.saved).toEqual([]);
  expect(result.positions.flat().every(Number.isFinite)).toBe(true);
  const directions = await page.evaluate(async () => {
    const m = await import("/src/weather/weatherModel.ts");
    const z = {
      id: "test",
      kind: "cloud",
      y: 0,
      size: 0.3,
      opacity: 0.8,
      seed: 1,
    };
    return [m.skyPosition({ ...z, x: 0 }), m.skyPosition({ ...z, x: 0.9 })];
  });
  expect(directions[0][2]).toBeLessThan(0);
  expect(directions[1][2]).toBeGreaterThan(0);
  for (const [index, name] of [
    "Rayonnement",
    "Nuages",
    "Pluie",
    "Orage",
    "Vent",
    "Brume",
    "Neige",
    "Crépuscule",
  ].entries()) {
    await place(
      page,
      name,
      0.2 + (index % 4) * 0.2,
      0.35 + Math.floor(index / 4) * 0.3,
    );
  }
  await page.getByRole("button", { name: "Entrer dans mon ciel ↗" }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-zones", "8");
});
