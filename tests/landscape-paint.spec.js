import { test, expect } from "@playwright/test";

test("paint a shared disk landscape, visit it and return without losing strokes", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /THREE|shader|WebGL/i.test(m.text()))
      errors.push(m.text());
  });
  await page.goto("/?squibble");
  await expect(
    page.getByRole("group", { name: "Palette de brosses" }).getByRole("button"),
  ).toHaveCount(12);
  const canvas = page.locator(".landscape-disk canvas");
  await expect(canvas).toHaveAttribute("data-landscape-mode", "disk");
  const paint = async (y) => {
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * y, {
      steps: 12,
    });
    await page.mouse.up();
  };
  await paint(0.36);
  await expect(page.locator("main")).toHaveAttribute("data-strokes", "1");
  await page.getByRole("button", { name: "Courants", exact: true }).click();
  await paint(0.65);
  await expect(page.locator("main")).toHaveAttribute("data-strokes", "2");
  await page.screenshot({ path: "/tmp/landscape-disk.png" });
  await page.getByRole("button", { name: "Entrer dans mon univers" }).click();
  const world = page.locator(".landscape-immersive canvas");
  await expect(world).toHaveAttribute("data-landscape-mode", "360");
  const still = await world.getAttribute("data-position");
  await page.waitForTimeout(150);
  expect(await world.getAttribute("data-position")).toBe(still);
  await page
    .getByRole("button", { name: "Voyager en FPV", exact: true })
    .click();
  await expect.poll(() => world.getAttribute("data-position")).not.toBe(still);
  await page.screenshot({ path: "/tmp/landscape-inside.png" });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Photographier ce regard" }).click();
  expect((await download).suggestedFilename()).toMatch(/png$/);
  await page.getByRole("button", { name: "Peindre", exact: false }).click();
  await expect(page.locator("main")).toHaveAttribute("data-strokes", "2");
  await page.getByRole("button", { name: "Annuler le dernier tracé" }).click();
  await expect(page.locator("main")).toHaveAttribute("data-strokes", "1");
  expect(errors).toEqual([]);
});

test("relief follows painted coordinates with distinct peaks and water valleys and owns bounded resources", async ({
  page,
}) => {
  await page.goto("/?squibble");
  const result = await page.evaluate(async () => {
    const { createLandscape } = await import("/src/squiggle/landscapeModel.js");
    const mountain = {
      emoji: "🔥",
      size: 2,
      opacity: 0.9,
      points: [
        { x: -4, z: -1 },
        { x: -4, z: 1 },
      ],
    };
    const water = {
      emoji: "🌊",
      size: 2,
      opacity: 0.9,
      points: [
        { x: 4, z: -1 },
        { x: 4, z: 1 },
      ],
    };
    const land = createLandscape([mountain, water], {}, true),
      same = createLandscape([mountain, water], {}, true);
    const peaks = land.heightAt(-4, 0),
      valleys = land.heightAt(4, 0);
    const equal = land.heights.every((v, i) => v === same.heights[i]);
    const position = land.geometry.attributes.position;
    let correspondence = true;
    for (let i = 0; i < position.count; i += 29)
      if (
        Math.abs(
          position.getY(i) - land.heightAt(position.getX(i), position.getZ(i)),
        ) > 0.001
      )
        correspondence = false;
    let disposed = 0;
    land.geometry.addEventListener("dispose", () => disposed++);
    land.texture.addEventListener("dispose", () => disposed++);
    const finite = land.heights.every(Number.isFinite),
      vertices = position.count;
    land.dispose();
    same.dispose();
    return {
      peaks,
      valleys,
      equal,
      correspondence,
      disposed,
      finite,
      vertices,
    };
  });
  expect(result.peaks).toBeGreaterThan(0.5);
  expect(result.valleys).toBeLessThan(-0.1);
  expect(result).toMatchObject({
    equal: true,
    correspondence: true,
    disposed: 2,
    finite: true,
  });
  expect(result.vertices).toBeLessThan(13000);
});

test("mobile disk stays paintable with touch and a complete tactile visit", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?squibble");
  const canvas = page.locator(".landscape-disk canvas");
  await expect(canvas).toHaveAttribute("data-landscape-mode", "disk");
  const box = await canvas.boundingBox();
  await canvas.dispatchEvent("pointerdown", {
    pointerId: 1,
    pointerType: "touch",
    isPrimary: true,
    button: 0,
    clientX: box.x + box.width * 0.4,
    clientY: box.y + box.height * 0.5,
  });
  await canvas.dispatchEvent("pointermove", {
    pointerId: 1,
    pointerType: "touch",
    isPrimary: true,
    buttons: 1,
    clientX: box.x + box.width * 0.7,
    clientY: box.y + box.height * 0.5,
  });
  await canvas.dispatchEvent("pointerup", {
    pointerId: 1,
    pointerType: "touch",
    isPrimary: true,
    button: 0,
    clientX: box.x + box.width * 0.7,
    clientY: box.y + box.height * 0.5,
  });
  await expect(page.locator("main")).toHaveAttribute("data-strokes", "1");
  await page.screenshot({ path: "/tmp/landscape-mobile.png" });
  await page.getByRole("button", { name: "Entrer dans mon univers" }).click();
  await expect(page.locator(".landscape-immersive canvas")).toHaveAttribute(
    "data-landscape-mode",
    "360",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("gyro rotates the view without translation and disabling it preserves tactile orientation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.DeviceOrientationEvent.requestPermission = async () => "granted";
  });
  await page.goto("/?squibble");
  const canvas = page.locator(".landscape-disk canvas");
  await expect(canvas).toHaveAttribute("data-landscape-mode", "disk");
  const b = await canvas.boundingBox();
  await page.mouse.click(b.x + b.width * 0.5, b.y + b.height * 0.5);
  await page.getByRole("button", { name: "Entrer dans mon univers" }).click();
  const world = page.locator(".landscape-immersive canvas");
  await expect(world).toHaveAttribute("data-landscape-mode", "360");
  const position = await world.getAttribute("data-position");
  const gyro = page.getByRole("button", { name: "Gyroscope 360" });
  await gyro.click();
  const send = (alpha) =>
    page.evaluate((alpha) => {
      const e = new Event("deviceorientation");
      Object.assign(e, { alpha, beta: 90, gamma: 0 });
      window.dispatchEvent(e);
    }, alpha);
  await send(0);
  const heading = await world.getAttribute("data-heading");
  await send(40);
  await expect.poll(() => world.getAttribute("data-heading")).not.toBe(heading);
  await expect(world).toHaveAttribute("data-position", position);
  await page.getByRole("button", { name: "Recentrer le regard" }).click();
  await send(40);
  await send(60);
  await gyro.click();
  const before = await world.getAttribute("data-heading");
  const box = await world.boundingBox();
  await page.mouse.move(box.width * 0.3, box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box.width * 0.6, box.height * 0.4, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => world.getAttribute("data-heading")).not.toBe(before);
});
