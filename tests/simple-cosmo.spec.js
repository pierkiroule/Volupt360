import { test, expect } from "@playwright/test";

test("mobile palette, bounded voyage, pause and persistent choices", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "ÉmoCiel" })).toBeVisible();
  await expect(page.locator(".simple-nuance")).toHaveCount(12);
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-renderer", "simple-silk");
  expect(Number(await canvas.getAttribute("data-calls"))).toBe(7);
  await page.getByRole("button", { name: "Orage", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Orage", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: "test-results/simple-palette.png" });
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  await expect(canvas).toHaveAttribute("data-ready", "inside");
  const position = await canvas.getAttribute("data-position");
  await page.mouse.move(180, 320);
  await page.mouse.down();
  await page.mouse.move(270, 350, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  expect(await canvas.getAttribute("data-position")).toBe(position);
  await page.getByRole("button", { name: "Voyager", exact: true }).click();
  await expect
    .poll(() => canvas.getAttribute("data-position"))
    .not.toBe(position);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.waitForTimeout(100);
  const time = await canvas.getAttribute("data-time");
  await page.waitForTimeout(300);
  expect(await canvas.getAttribute("data-time")).toBe(time);
  await page.screenshot({ path: "test-results/simple-world.png" });
  await page.getByRole("button", { name: "Revenir à la palette" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Orage", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});

test("gyro calibrates without roll, missing signal falls back and reentry leaves one canvas", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "DeviceOrientationEvent", {
      configurable: true,
      value: class extends Event {
        static async requestPermission() {
          return "granted";
        }
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  const canvas = page.locator("canvas");
  await page.getByRole("button", { name: "Gyroscope", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-gyro", "waiting");
  await expect(canvas).toHaveAttribute("data-ready", "inside");
  const position = await canvas.getAttribute("data-position");
  const pose = (alpha, beta, gamma) =>
    page.evaluate(
      (p) => {
        const e = new Event("deviceorientation");
        Object.assign(e, p);
        window.dispatchEvent(e);
      },
      { alpha, beta, gamma },
    );
  await pose(0, 60, 0);
  await expect(canvas).toHaveAttribute("data-gyro", "tracking");
  for (let i = 1; i <= 8; i++) {
    await pose(i * 5, 60, i * 2);
    await page.waitForTimeout(30);
  }
  expect(await canvas.getAttribute("data-position")).toBe(position);
  const roll = await page.evaluate(async () => {
    const { Quaternion, Euler } =
      await import("/node_modules/three/build/three.module.js");
    return new Euler().setFromQuaternion(
      new Quaternion(
        ...document
          .querySelector("canvas")
          .dataset.heading.split(",")
          .map(Number),
      ),
      "YXZ",
    ).z;
  });
  expect(Math.abs(roll)).toBeLessThan(0.001);
  await page.getByRole("button", { name: "Gyroscope", exact: true }).click();
  await page.getByRole("button", { name: "Gyroscope", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Pas de signal", {
    timeout: 7000,
  });
  await expect(
    page.getByRole("button", { name: "Gyroscope", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  for (let i = 0; i < 4; i++) {
    await page.getByRole("button", { name: "Revenir à la palette" }).click();
    await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  }
  await expect(page.locator("canvas")).toHaveCount(1);
});

test("WebGL context restoration resumes the same work", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-renderer", "simple-silk");
  const supported = await page.evaluate(() => {
    const c = document.querySelector("canvas"),
      gl = c.getContext("webgl2") || c.getContext("webgl");
    const extension = gl.getExtension("WEBGL_lose_context");
    if (!extension) return false;
    window.testContextExtension = extension;
    extension.loseContext();
    return true;
  });
  test.skip(!supported, "WEBGL_lose_context unavailable");
  await expect(page.getByRole("status")).toContainText("Restauration");
  await page.evaluate(() => window.testContextExtension.restoreContext());
  await expect(page.getByRole("status")).toHaveCount(0);
  const before = await canvas.getAttribute("data-time");
  await expect.poll(() => canvas.getAttribute("data-time")).not.toBe(before);
});

test("twelve emotions fit a small phone and all three choices tint the paused sky", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error" && /WebGL|shader|THREE|GL_INVALID/i.test(m.text()))
      errors.push(m.text());
  });
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-sky", "watercolor");
  const bounds = await page.locator(".simple-nuance").evaluateAll((buttons) =>
    buttons.map((b) => {
      const r = b.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    }),
  );
  expect(bounds).toHaveLength(12);
  for (const r of bounds) {
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.x + r.w).toBeLessThanOrEqual(360);
    expect(r.y).toBeGreaterThanOrEqual(0);
    expect(r.y + r.h).toBeLessThanOrEqual(640);
  }
  for (let i = 0; i < bounds.length; i++)
    for (let j = i + 1; j < bounds.length; j++) {
      const a = bounds[i],
        b = bounds[j];
      expect(
        a.x + a.w <= b.x ||
          b.x + b.w <= a.x ||
          a.y + a.h <= b.y ||
          b.y + b.h <= a.y,
      ).toBe(true);
    }
  const before = await canvas.screenshot();
  await page
    .getByRole("button", { name: "Arc-en-ciel", exact: true })
    .click();
  await page.waitForTimeout(150);
  expect(before.equals(await canvas.screenshot())).toBe(false);
  const selected = await page
    .locator(".simple-nuance[aria-pressed=true]")
    .count();
  expect(selected).toBe(3);
  await page.getByRole("button", { name: "Aurore", exact: true }).click();
  expect(await page.locator(".simple-nuance[aria-pressed=true]").count()).toBe(
    3,
  );
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  await expect(canvas).toHaveAttribute("data-ready", "inside");
  const time = await canvas.getAttribute("data-time");
  await page.waitForTimeout(250);
  expect(await canvas.getAttribute("data-time")).toBe(time);
  expect(
    Number(await canvas.getAttribute("data-particles")),
  ).toBeLessThanOrEqual(480);
  expect(Number(await canvas.getAttribute("data-calls"))).toBe(7);
  expect(errors).toEqual([]);
});
