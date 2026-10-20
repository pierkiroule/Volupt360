import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.route("https://commons.wikimedia.org/w/api.php?**", (route) =>
    route.fulfill({ json: { query: { pages: {} } } }),
  );
});
async function stroke(page, selector = ".squiggle-paper", x = 0.3, y = 0.4) {
  const el = page.locator(selector),
    r = await el.boundingBox();
  await page.mouse.move(r.x + r.width * x, r.y + r.height * y);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width * (x + 0.2), r.y + r.height * (y + 0.1), {
    steps: 12,
  });
  await page.mouse.up();
}
test("draw first, animated emoji brushes, shared 2D/360 gestures and history", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Squiggle/ })).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Brosses émoji" }).getByRole("button"),
  ).toHaveCount(8);
  await stroke(page);
  await expect(page.locator(".squiggle-paper")).toHaveAttribute(
    "data-strokes",
    "1",
  );
  await page.getByRole("button", { name: "Pluie", exact: true }).click();
  await stroke(page, ".squiggle-paper", 0.5, 0.35);
  await expect(page.locator(".squiggle-paper")).toHaveAttribute(
    "data-strokes",
    "2",
  );
  const t = await page
    .locator(".squiggle-paper")
    .getAttribute("data-animation-time");
  await expect
    .poll(() =>
      page.locator(".squiggle-paper").getAttribute("data-animation-time"),
    )
    .not.toBe(t);
  await page
    .getByRole("button", { name: "Entrer en 360", exact: true })
    .click();
  const world = page.locator(".squiggle-world canvas");
  await expect(world).toBeVisible();
  await expect(world).toHaveAttribute("data-strokes", "2");
  await stroke(page, ".squiggle-world canvas", 0.3, 0.5);
  await expect(world).toHaveAttribute("data-strokes", "3");
  await page.getByRole("button", { name: "Regarder", exact: false }).click();
  await stroke(page, ".squiggle-world canvas", 0.3, 0.4);
  await expect(world).toHaveAttribute("data-strokes", "3");
  await page
    .getByRole("button", { name: "Revenir au dessin 2D", exact: true })
    .click();
  await expect(page.locator(".squiggle-paper")).toHaveAttribute(
    "data-strokes",
    "3",
  );
  await page
    .getByRole("button", { name: "Annuler le tracé", exact: true })
    .click();
  await expect(page.locator(".squiggle-paper")).toHaveAttribute(
    "data-strokes",
    "2",
  );
  await page.getByRole("button", { name: "Autres outils" }).click();
  await page.getByRole("button", { name: "Rétablir le tracé" }).click();
  await expect(page.locator(".squiggle-paper")).toHaveAttribute(
    "data-strokes",
    "3",
  );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG ↓", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("squiggle-360.png");
  await page
    .getByRole("button", { name: "Effacer un tracé", exact: false })
    .click();
  await page.mouse.click(0.4 * 1280, 0.45 * 720);
  await expect(page.locator(".squiggle-paper")).toHaveAttribute(
    "data-strokes",
    "2",
  );
  await page.getByRole("button", { name: "Feu", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Feu", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});
test("mobile native touch creates continuous strokes and compact tools stay accessible", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Entrer en 360", exact: true }),
  ).toBeEnabled();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 90, y: 250, id: 1 }],
  });
  for (let i = 1; i < 8; i++)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 90 + i * 20, y: 250 + i * 10, id: 1 }],
    });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.locator(".squiggle-paper")).toHaveAttribute(
    "data-strokes",
    "1",
  );
  await expect(
    page.getByRole("slider", { name: "Taille de la brosse" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Entrer en 360", exact: true })
    .click();
  await page.getByRole("button", { name: "Voyager en FPV" }).click();
  const world = page.locator(".squiggle-world canvas");
  await expect(world).toHaveAttribute("data-interaction", "travel");
  const heading = await world.getAttribute("data-heading");
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 130, y: 320, id: 2 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 240, y: 350, id: 2 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect.poll(() => world.getAttribute("data-heading")).not.toBe(heading);
  await expect(world).toHaveAttribute("data-strokes", "1");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await context.close();
});
test("all brushes render ink without errors and opacity is adjustable", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  for (const name of [
    "Feu",
    "Pluie",
    "Ondes",
    "Rayons",
    "Tourbillons",
    "Éclats",
    "Énergie",
    "Brume",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    await stroke(page);
  }
  await expect(page.locator(".squiggle-paper")).toHaveAttribute(
    "data-strokes",
    "8",
  );
  await page.getByRole("button", { name: "Autres outils" }).click();
  await page.getByRole("slider", { name: "Opacité de la brosse" }).fill("0.2");
  await page
    .getByRole("button", { name: "Mettre les animations en pause" })
    .click();
  await page.waitForTimeout(80);
  const time = await page
    .locator(".squiggle-paper")
    .getAttribute("data-animation-time");
  await page.waitForTimeout(150);
  await expect(page.locator(".squiggle-paper")).toHaveAttribute(
    "data-animation-time",
    time,
  );
  expect(errors).toEqual([]);
});

test("gyro permission, recenter and refusal retain tactile navigation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.DeviceOrientationEvent.requestPermission = async () => "granted";
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Entrer en 360", exact: true })
    .click();
  await page.getByRole("button", { name: "Regarder", exact: false }).click();
  const gyro = page.getByRole("button", { name: "Gyroscope 360", exact: true });
  await gyro.click();
  await expect(gyro).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() =>
    window.dispatchEvent(
      new DeviceOrientationEvent("deviceorientationabsolute", {
        alpha: 0,
        beta: 70,
        gamma: 0,
      }),
    ),
  );
  await page.getByRole("button", { name: "Recentrer le regard" }).click();
  await page.evaluate(() =>
    window.dispatchEvent(
      new DeviceOrientationEvent("deviceorientationabsolute", {
        alpha: 30,
        beta: 70,
        gamma: 0,
      }),
    ),
  );
  await gyro.click();
  await page.evaluate(() => {
    window.DeviceOrientationEvent.requestPermission = async () => "denied";
  });
  await gyro.click();
  await expect(gyro).toHaveAttribute("aria-pressed", "false");
  await stroke(page, ".squiggle-world canvas");
  await expect(page.locator(".squiggle-world canvas")).toHaveAttribute(
    "data-strokes",
    "0",
  );
  await page.getByRole("button", { name: "Peindre", exact: false }).click();
  await stroke(page, ".squiggle-world canvas");
  await expect(page.locator(".squiggle-world canvas")).toHaveAttribute(
    "data-strokes",
    "1",
  );
});

test("FPV voyage moves, steers, accelerates and stops without painting", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Entrer en 360", exact: true })
    .click();
  const canvas = page.locator(".squiggle-world canvas");
  await expect(canvas).toHaveAttribute("data-interaction", "paint");
  await page.getByRole("button", { name: "Voyager en FPV" }).click();
  await expect(canvas).toHaveAttribute("data-interaction", "travel");
  const start = await canvas.getAttribute("data-position");
  await expect.poll(() => canvas.getAttribute("data-position")).not.toBe(start);
  const heading = await canvas.getAttribute("data-heading");
  await stroke(page, ".squiggle-world canvas", 0.3, 0.4);
  await expect
    .poll(() => canvas.getAttribute("data-heading"))
    .not.toBe(heading);
  await expect(canvas).toHaveAttribute("data-strokes", "0");
  await page.mouse.move(650, 350);
  await page.mouse.down();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-speed")))
    .toBeGreaterThan(1);
  await page.waitForTimeout(10000);
  await page.mouse.up();
  const position = (await canvas.getAttribute("data-position"))
    .split(",")
    .map(Number);
  expect(Math.hypot(...position)).toBeLessThanOrEqual(6.301);
  await page.getByRole("button", { name: "Arrêter le voyage FPV" }).click();
  await expect(canvas).toHaveAttribute("data-interaction", "look");
  const stopped = await canvas.getAttribute("data-position");
  await page.waitForTimeout(200);
  await expect(canvas).toHaveAttribute("data-position", stopped);
  await page.getByRole("button", { name: "Peindre", exact: false }).click();
  await stroke(page, ".squiggle-world canvas");
  await expect(canvas).toHaveAttribute("data-strokes", "1");
});
