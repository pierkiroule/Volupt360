import { test, expect } from "@playwright/test";
test("choose up to three ingredients, enter their world, travel and photograph", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Squibble360" }),
  ).toBeVisible();
  const enter = page.getByRole("button", {
    name: "Entrer dans mon monde",
    exact: true,
  });
  await expect(enter).toBeDisabled();
  await expect(
    page
      .getByRole("group", { name: "Emojis de ton univers" })
      .getByRole("button"),
  ).toHaveCount(12);
  for (const name of ["Feu", "Vague", "Lune"])
    await page.getByRole("button", { name, exact: true }).click();
  await expect(page.locator("main")).toHaveAttribute("data-choices", "3");
  await page.getByRole("button", { name: "Soleil", exact: true }).click();
  await expect(page.locator("main")).toHaveAttribute("data-choices", "3");
  await expect(page.getByRole("status")).toContainText("Trois emojis");
  await expect(page.locator(".squibble-orb canvas")).toHaveAttribute(
    "data-objects",
    "36",
  );
  await page.screenshot({ path: "/tmp/squibble-orb.png" });
  await enter.click();
  const canvas = page.locator(".squiggle-world canvas");
  await expect(canvas).toHaveAttribute("data-interaction", "travel");
  await expect(canvas).toHaveAttribute("data-objects", "36");
  const start = await canvas.getAttribute("data-position");
  await expect.poll(() => canvas.getAttribute("data-position")).not.toBe(start);
  const r = await canvas.boundingBox();
  await page.mouse.move(r.width * 0.4, r.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(r.width * 0.6, r.height * 0.5, { steps: 10 });
  await page.mouse.up();
  await expect(canvas).toHaveAttribute("data-objects", "36");
  await page.getByRole("button", { name: "Contempler", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-interaction", "look");
  const stopped = await canvas.getAttribute("data-position");
  await page.waitForTimeout(200);
  await expect(canvas).toHaveAttribute("data-position", stopped);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Photographier ce regard" }).click();
  expect((await download).suggestedFilename()).toMatch(/^squibble360-.*\.png$/);
  await page.screenshot({ path: "/tmp/squibble-inside.png" });
  await page.getByRole("button", { name: "Revenir à ma bulle" }).click();
  await expect(page.locator("main")).toHaveAttribute("data-choices", "3");
  await expect(
    page.getByRole("button", { name: "Feu", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Retirer Feu", exact: true }).click();
  await expect(page.locator("main")).toHaveAttribute("data-choices", "2");
  expect(errors).toEqual([]);
});
test("combinations generate reproducible, distinct, bounded spaces without inference", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { generateUniverse, EMOJI_INGREDIENTS } =
      await import("/src/squiggle/squibbleUniverse.js");
    const a = generateUniverse([EMOJI_INGREDIENTS[0], EMOJI_INGREDIENTS[2]]);
    const b = generateUniverse([EMOJI_INGREDIENTS[2], EMOJI_INGREDIENTS[0]]);
    const c = generateUniverse([EMOJI_INGREDIENTS[1]]);
    return {
      same: JSON.stringify(a) === JSON.stringify(b),
      different: JSON.stringify(a) !== JSON.stringify(c),
      empty: generateUniverse([]).length,
      length: a.length,
      finite: a.every(
        (o) =>
          Number.isFinite(o.radius) &&
          o.radius >= 3 &&
          o.radius <= 8 &&
          o.points[0].y > 0 &&
          o.points[0].y < 1,
      ),
      colors: new Set(a.map((o) => o.color)).size,
    };
  });
  expect(result).toMatchObject({
    same: true,
    different: true,
    empty: 0,
    length: 36,
    finite: true,
  });
  expect(result.colors).toBeGreaterThan(12);
});
test("mobile emoji ring, tactile alternative and repeated entries", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("/");
  const ring = page.getByRole("group", { name: "Emojis de ton univers" });
  for (const button of await ring.getByRole("button").all()) {
    const r = await button.boundingBox();
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.x + r.width).toBeLessThanOrEqual(390);
  }
  await page.getByRole("button", { name: "Nuage", exact: true }).tap();
  for (let i = 0; i < 2; i++) {
    await page
      .getByRole("button", { name: "Entrer dans mon monde", exact: true })
      .tap();
    await expect(page.locator(".squiggle-world canvas")).toHaveAttribute(
      "data-objects",
      "36",
    );
    await page.getByRole("button", { name: "Contempler", exact: true }).tap();
    await page.touchscreen.tap(190, 320);
    await expect(page.locator(".squiggle-world canvas")).toHaveAttribute(
      "data-interaction",
      "look",
    );
    await page.getByRole("button", { name: "Revenir à ma bulle" }).tap();
  }
  await expect(page.locator(".squibble-orb canvas")).toHaveAttribute(
    "data-objects",
    "36",
  );
  await page.screenshot({ path: "/tmp/squibble-mobile.png" });
  await context.close();
});
test("gyro orientation, recenter and permission refusal preserve tactile contemplation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.DeviceOrientationEvent.requestPermission = async () => "granted";
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Lune", exact: true }).click();
  await page
    .getByRole("button", { name: "Entrer dans mon monde", exact: true })
    .click();
  await page.getByRole("button", { name: "Contempler", exact: true }).click();
  const gyro = page.getByRole("button", { name: "Gyroscope 360", exact: true });
  await gyro.click();
  await expect(gyro).toHaveAttribute("aria-pressed", "true");
  const send = (alpha) =>
    page.evaluate((alpha) => {
      const event = new Event("deviceorientation");
      Object.assign(event, { alpha, beta: 90, gamma: 0 });
      window.dispatchEvent(event);
    }, alpha);
  await send(0);
  const canvas = page.locator(".squiggle-world canvas");
  const heading = await canvas.getAttribute("data-heading"),
    position = await canvas.getAttribute("data-position");
  await send(45);
  await expect
    .poll(() => canvas.getAttribute("data-heading"))
    .not.toBe(heading);
  await expect(canvas).toHaveAttribute("data-position", position);
  await page
    .getByRole("button", { name: "Recentrer le regard", exact: true })
    .click();
  await send(45);
  await send(65);
  await gyro.click();
  await page.evaluate(() => {
    window.DeviceOrientationEvent.requestPermission = async () => "denied";
  });
  await gyro.click();
  await expect(gyro).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("status")).toContainText("indisponible");
  const r = await canvas.boundingBox();
  const before = await canvas.getAttribute("data-heading");
  await page.mouse.move(r.width * 0.3, r.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(r.width * 0.5, r.height * 0.4, { steps: 10 });
  await page.mouse.up();
  await expect.poll(() => canvas.getAttribute("data-heading")).not.toBe(before);
});
