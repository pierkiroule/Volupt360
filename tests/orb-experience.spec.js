import { test, expect } from "@playwright/test";
async function orb(page) {
  const c = page.getByRole("img", { name: /Bulle émotionnelle/ });
  await expect(c).toHaveAttribute("data-tags", /\d+/);
  return c;
}
async function deposit(page, x = 0.5, y = 0.5) {
  const c = await orb(page),
    r = await c.boundingBox();
  await page.mouse.click(r.x + r.width * x, r.y + r.height * y);
}

test("compose on a rotated sphere, enter a fixed POV and choose reversible invitations", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /WebGL|shader|THREE/.test(m.text()))
      errors.push(m.text());
  });
  await page.goto("/?bulle");
  await expect(page.getByRole("heading", { name: "EmoCiel360" })).toBeVisible();
  const c = await orb(page);
  await expect(
    page.getByRole("button", { name: "Entrer dans ma bulle" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Joie", exact: true }).click();
  await deposit(page);
  await expect(c).toHaveAttribute("data-tags", "1");
  const r = await c.boundingBox();
  await page.mouse.move(r.x + r.width * 0.4, r.y + r.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width * 0.75, r.y + r.height * 0.55, {
    steps: 15,
  });
  await page.mouse.up();
  await expect(c).toHaveAttribute("data-tags", "1");
  await page.getByRole("button", { name: "Tristesse", exact: true }).click();
  await deposit(page);
  await expect(c).toHaveAttribute("data-tags", "2");
  await page.screenshot({ path: "/tmp/emociel-orb.png" });
  await page.getByRole("button", { name: "Annuler le dernier tag" }).click();
  await expect(c).toHaveAttribute("data-tags", "1");
  await page.getByRole("button", { name: "Rétablir le tag" }).click();
  await expect(c).toHaveAttribute("data-tags", "2");
  await page.getByRole("button", { name: "Entrer dans ma bulle" }).click();
  const world = page.locator("#stage canvas");
  await expect(world).toBeVisible();
  await expect(world).toHaveAttribute("data-camera-position", /.+/);
  const position = await world.getAttribute("data-camera-position"),
    wr = await world.boundingBox();
  await page.mouse.move(wr.width * 0.3, wr.height * 0.3);
  await page.mouse.down();
  await page.mouse.move(wr.width * 0.6, wr.height * 0.4, { steps: 12 });
  await page.waitForTimeout(500);
  await page.mouse.up();
  expect(await world.getAttribute("data-camera-position")).toBe(position);
  await page.getByRole("button", { name: "Vol FPV", exact: true }).click();
  await expect
    .poll(() => world.getAttribute("data-camera-position"))
    .not.toBe(position);
  await page.getByLabel("Dynamique à explorer").selectOption("support");
  await expect(
    page.getByRole("region", { name: "Invitation métaphorique" }),
  ).toContainText("rayon de soleil");
  await page.getByRole("button", { name: "Fermer la question" }).click();
  await page.getByRole("button", { name: "Lire mon ciel" }).click();
  await expect(
    page.getByRole("region", { name: "Lecture descriptive de mon ciel" }),
  ).toContainText("2 tags · 2 ressentis nommés");
  await expect(
    page.getByRole("region", { name: "Lecture descriptive de mon ciel" }),
  ).toContainText("Joie × 1");
  await page
    .getByLabel("Ma lecture de ces ressentis")
    .selectOption("ambivalence");
  await page
    .getByLabel("Besoin à explorer")
    .selectOption({ label: "Un appui" });
  await page.getByRole("button", { name: "Fermer la lecture" }).click();
  await page.getByRole("button", { name: "Recomposer" }).click();
  await expect(c).toHaveAttribute("data-tags", "2");
  expect(errors).toEqual([]);
});

test("descriptive analysis counts declared emotions and spatial neighbours without deriving mental state", async ({
  page,
}) => {
  await page.goto("/?bulle");
  const r = await page.evaluate(async () => {
    const { describeSky, createSkyTexture } =
      await import("/src/emociel/skyModel.js");
    const tags = [
      { id: 1, emotionId: "joy", u: 0.3, v: 0.5, intensity: 1 },
      { id: 2, emotionId: "sadness", u: 0.31, v: 0.51, intensity: 3 },
      { id: 3, emotionId: "joy", u: 0.8, v: 0.5, intensity: 2 },
    ];
    const before = JSON.stringify(tags);
    const d = describeSky(tags),
      texture = createSkyTexture(tags);
    return {
      d,
      unchanged: JSON.stringify(tags) === before,
      size: [texture.width, texture.height],
      empty: describeSky([]),
    };
  });
  expect(r.d.total).toBe(3);
  expect(r.d.diversity).toBe(2);
  expect(r.d.labels).toContainEqual({ label: "Joie", count: 2 });
  expect(r.d.neighbours).toContain("Joie · Tristesse");
  expect(r.unchanged).toBe(true);
  expect(r.d).not.toHaveProperty("diagnosis");
  expect(r.d).not.toHaveProperty("risk");
  expect(r.empty.total).toBe(0);
  expect(r.size).toEqual([1536, 768]);
});

test.describe("mobile orb", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  test("native drag rotates without painting and a tap deposits one tag", async ({
    page,
  }) => {
    await page.goto("/?bulle");
    const c = await orb(page),
      r = await c.boundingBox(),
      client = await page.context().newCDPSession(page);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: r.x + r.width * 0.4, y: r.y + r.height * 0.5 }],
    });
    for (let i = 1; i <= 10; i++)
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          { x: r.x + r.width * (0.4 + i * 0.025), y: r.y + r.height * 0.5 },
        ],
      });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(c).toHaveAttribute("data-tags", "0");
    await page.getByRole("button", { name: "Colère", exact: true }).tap();
    await expect(
      page.getByRole("button", { name: "Colère", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.touchscreen.tap(r.x + r.width * 0.5, r.y + r.height * 0.5);
    await expect(c).toHaveAttribute("data-tags", "1");
    await page.getByRole("button", { name: "Entrer dans ma bulle" }).tap();
    await expect(page.locator("#stage canvas")).toBeVisible();
    await page.getByRole("button", { name: "Recomposer", exact: true }).tap();
    await expect(c).toHaveAttribute("data-tags", "1");
  });
});
