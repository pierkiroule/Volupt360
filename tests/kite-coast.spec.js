import { test, expect } from "@playwright/test";

test("kite steering is bounded, smooth, paused and its tail remains finite", async ({
  page,
}) => {
  await page.goto("/");
  const r = await page.evaluate(async () => {
    const { KiteCoast } = await import("/src/simple/KiteCoast.ts");
    const kite = new KiteCoast();
    kite.setPalette(["night", "water"]);
    kite.steer(20, -20);
    for (let i = 1; i <= 300; i++) kite.update(i / 60);
    const manual = kite.inspect();
    kite.update(5);
    const paused = kite.inspect();
    const tail = kite.group.children.find(
      (c) => c.geometry?.attributes.position.count === 200,
    );
    const finite = Array.from(tail.geometry.attributes.position.array).every(
      Number.isFinite,
    );
    kite.release();
    for (let i = 301; i <= 600; i++) kite.update(i / 60);
    const released = kite.inspect();
    kite.dispose();
    return {
      manual,
      paused,
      released,
      finite,
      children: kite.group.children.length,
    };
  });
  expect(r.manual.position[0]).toBeLessThanOrEqual(5.01);
  expect(r.manual.position[0]).toBeGreaterThan(4.9);
  expect(r.manual.position[1]).toBeLessThanOrEqual(23.01);
  expect(r.paused.position).toEqual(r.manual.position);
  expect(r.finite).toBe(true);
  expect(r.released.held).toBe(false);
  expect(r.released.position[0]).toBeLessThan(3);
  expect(r.children).toBe(0);
});

test("shore view pilots the kite without travel or camera displacement", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /shader|WebGL/i.test(m.text()))
      errors.push(m.text());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-ready", "inside");
  await expect(
    page.getByRole("button", { name: "Voyager", exact: true }),
  ).toHaveCount(0);
  const before = await canvas.getAttribute("data-position");
  await page.mouse.move(195, 350);
  await page.mouse.down();
  await page.mouse.move(335, 220, { steps: 12 });
  await page.waitForTimeout(400);
  const kite = JSON.parse(await canvas.getAttribute("data-kite"));
  expect(kite.held).toBe(true);
  expect(kite.position[0]).toBeGreaterThan(1);
  await page.mouse.up();
  await page.waitForTimeout(200);
  expect(JSON.parse(await canvas.getAttribute("data-kite")).held).toBe(false);
  expect(await canvas.getAttribute("data-position")).toBe(before);
  await page.screenshot({ path: info.outputPath("kite-shore.png") });
  expect(errors).toEqual([]);
});
