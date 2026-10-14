import { test, expect } from "@playwright/test";

test("three universes partition the twelve brushes and changing universe starts a fresh scene", async ({
  page,
}) => {
  await page.goto("/?instrument=off");
  const groups = await page.evaluate(async () => {
    const { UNIVERSES } = await import("/src/sonoizo/universes.js");
    const { BRUSHES } = await import("/src/engine/brushes.js");
    return { universes: UNIVERSES, brushes: BRUSHES.map((item) => item.id) };
  });
  const all = groups.universes.flatMap((universe) => universe.brushes);
  expect(new Set(all).size).toBe(18);
  expect([...all].sort()).toEqual([...groups.brushes].sort());
  for (const universe of groups.universes) {
    await page
      .getByRole("button", { name: `Choisir ${universe.name}`, exact: true })
      .click();
    await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
    await expect(page.locator(".twig-pad")).toHaveCount(6);
    for (const id of universe.brushes)
      await expect(page.locator(`.twig-${id}`)).toBeVisible();
    const canvas = page.locator("#stage canvas");
    await expect(canvas).toHaveAttribute("data-drone-distance", "0");
    await expect(canvas).toHaveAttribute("data-painted-samples", "0");
    await page
      .getByRole("button", { name: "Changer d’univers", exact: true })
      .click();
  }
});

test("hold makes the flying oizo paint with the last selected brush, and keep normal swipe navigation", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?instrument=off");
  await page
    .getByRole("button", { name: "Choisir ÉTHER", exact: true })
    .click();
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  await page
    .getByRole("button", { name: "Sculpter avec Filaments", exact: true })
    .click();
  // Let the preceding pad gesture finish so direct painting is measured independently.
  await page.waitForTimeout(800);
  const canvas = page.locator("#stage canvas");
  await page.mouse.move(450, 280);
  await page.mouse.down();
  await expect(canvas).toHaveAttribute("data-nozzle-paint", "true");
  await expect(canvas).toHaveAttribute("data-nozzle-brush", "filaments");
  await page.waitForTimeout(350);
  const position = await canvas.getAttribute("data-painter-position");
  const samples = Number(await canvas.getAttribute("data-painted-samples"));
  // Keeping the finger still must already paint along the moving bird's flight.
  await expect
    .poll(() => canvas.getAttribute("data-painter-position"))
    .not.toBe(position);
  await page.waitForTimeout(250);
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-painted-samples")))
    .toBeGreaterThan(samples);
  expect(await canvas.getAttribute("data-steering-moves")).toBeNull();
  await page.mouse.move(620, 340, { steps: 8 });
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-steering-moves")))
    .toBeGreaterThan(0);
  await page.mouse.up();
  await expect(canvas).toHaveAttribute("data-nozzle-paint", "false");
  await expect
    .poll(() => canvas.getAttribute("data-painter-position"))
    .not.toBe(position);
  await page.mouse.move(450, 280);
  await page.mouse.down();
  await page.mouse.move(550, 260, { steps: 5 });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-steering-moves")))
    .toBeGreaterThan(0);
  await page.waitForTimeout(500);
  await expect(canvas).toHaveAttribute("data-nozzle-paint", "false");
  expect(errors).toEqual([]);
});

test("releasing early or losing focus cancels pending and active direct painting", async ({
  page,
}) => {
  await page.goto("/?instrument=off");
  await page
    .getByRole("button", { name: "Choisir MÉMOIRE", exact: true })
    .click();
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  const canvas = page.locator("#stage canvas");
  await page.mouse.move(450, 280);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(550);
  expect(await canvas.getAttribute("data-nozzle-paint")).toBeNull();
  await page.mouse.down();
  await expect(canvas).toHaveAttribute("data-nozzle-paint", "true");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(canvas).toHaveAttribute("data-nozzle-paint", "false");
  await page.mouse.up();
});

test.describe("native mobile direct painting", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test("long touch draws with a brush from Les Marées and release ends it", async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/?instrument=off");
    await page
      .getByRole("button", { name: "Choisir ABYSSE", exact: true })
      .tap();
    await page.getByRole("button", { name: "Entrer dans le paysage" }).tap();
    await page
      .getByRole("button", { name: "Sculpter avec Bulles", exact: true })
      .tap();
    await page.waitForTimeout(800);
    const canvas = page.locator("#stage canvas");
    const touch = await page.context().newCDPSession(page);
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: 190, y: 260 }],
    });
    await expect(canvas).toHaveAttribute("data-nozzle-paint", "true");
    await expect(canvas).toHaveAttribute("data-nozzle-brush", "bulles");
    const count = Number(await canvas.getAttribute("data-painted-samples"));
    // A stationary long touch still deposits paint: the nozzle is the moving bird.
    await expect
      .poll(async () =>
        Number(await canvas.getAttribute("data-painted-samples")),
      )
      .toBeGreaterThan(count);
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 240, y: 330 }],
    });
    await expect
      .poll(async () =>
        Number(await canvas.getAttribute("data-painted-samples")),
      )
      .toBeGreaterThan(count);
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(canvas).toHaveAttribute("data-nozzle-paint", "false");
    expect(errors).toEqual([]);
  });
});
