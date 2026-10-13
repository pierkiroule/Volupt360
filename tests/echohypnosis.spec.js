import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

test("one available universe starts its imposed ambience and keeps twelve silent brush pads and wind taps", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const nativePlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      return nativePlay.call(this).then(() => {
        if (!this.paused) window.__ambiencePlayed = true;
      });
    };
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "echohypnosis" }),
  ).toBeVisible();
  await expect(
    page.getByText("L’Oizo échohypnotique", { exact: true }),
  ).toBeVisible();
  const picker = page.getByRole("region", { name: "Choisir un univers" });
  await expect(picker.getByRole("button")).toHaveCount(3);
  await expect(
    picker.getByRole("button", { name: "Les Marées Bientôt" }),
  ).toBeDisabled();
  await picker.getByRole("button", { name: "Le Souffle Entrer" }).click();
  await expect(picker).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => Boolean(window.__ambiencePlayed)))
    .toBe(true);
  const canvas = page.locator("#stage canvas");
  await expect(canvas).toHaveAttribute("data-vocal-fireflies", "24");
  await expect(page.locator(".twig-pad")).toHaveCount(12);
  await expect(
    page.locator('input[type="file"][accept="audio/*,.mp3"]'),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Sculpter avec Voiles", exact: true })
    .click();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-painted-samples")))
    .toBeGreaterThan(0);
  await canvas.click({ position: { x: 120, y: 120 } });
  await expect(canvas).toHaveAttribute("data-wind-taps", "1");
  expect(errors).toEqual([]);
});

test("fixed anchors carry 24 vocal strings, with proximity vibrations and exclusive actual playback", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createVocalConstellation } =
      await import("/src/sonoizo/createVocalConstellation.js");
    const { createTwigBank } = await import("/src/sonoizo/createTwigBank.js");
    const { FIREFLY_FRAGMENTS } = await import("/src/sonoizo/poems.js");
    const bank = createTwigBank({ ids: ["voiles"] });
    bank.enableFireflies();
    await bank.loadPoems(FIREFLY_FRAGMENTS);
    await bank.preparePlayback();
    const field = createVocalConstellation({
      fragments: FIREFLY_FRAGMENTS,
      collide: (id) => bank.collide(id),
      getFeatures: () => bank.getVocalFeatures(),
    });
    const before = field.group.children
      .slice(0, 24)
      .map((dot) => dot.position.toArray());
    const midpoint = new THREE.Vector3()
      .addVectors(
        field.group.children[0].position,
        field.group.children[1].position,
      )
      .multiplyScalar(0.5);
    const pose = { position: midpoint };
    field.update(0.1, pose);
    await new Promise((resolve) => setTimeout(resolve, 30));
    field.update(0.1, pose);
    const second = await bank.collide("firefly-2");
    const after = field.group.children
      .slice(0, 24)
      .map((dot) => dot.position.toArray());
    const line = field.group.children.find((child) => child.isLine);
    const result = {
      before,
      after,
      lines: field.group.children.filter((child) => child.isLine).length,
      active: bank.getSnapshot().activeVocalId,
      second,
      collisions: field.collisionCount,
      vibrating:
        Math.abs(line.geometry.attributes.position.getX(8) - midpoint.x) >
          0.001 ||
        Math.abs(line.geometry.attributes.position.getZ(8) - midpoint.z) >
          0.001,
    };
    field.dispose();
    bank.dispose();
    return result;
  });
  expect(result.after).toEqual(result.before);
  expect(result.lines).toBe(24);
  expect(result.active).toBe("firefly-1");
  expect(result.second).toBe(false);
  expect(result.collisions).toBe(1);
  expect(result.vibrating).toBe(true);
});

test("wind influences continuous flight without replacing it or teleporting", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createSonoizoDance } = await import("/src/sonoizo/SonoizoDance.js");
    const normal = createSonoizoDance(),
      guided = createSonoizoDance();
    const start = guided.update(0.016, []);
    normal.update(0.016, []);
    guided.blow(0.8, 0.4);
    const next = guided.update(0.016, []);
    const firstStep = next.position.distanceTo(start.position);
    let a,
      b,
      maxStep = firstStep,
      previous = next.position.clone();
    normal.update(0.016, []);
    for (let i = 0; i < 300; i++) {
      a = guided.update(0.016, []);
      b = normal.update(0.016, []);
      maxStep = Math.max(maxStep, a.position.distanceTo(previous));
      previous.copy(a.position);
    }
    return {
      firstStep,
      maxStep,
      difference: a.position.distanceTo(b.position),
    };
  });
  expect(result.firstStep).toBeLessThan(0.3);
  expect(result.maxStep).toBeLessThan(0.5);
  expect(result.difference).toBeGreaterThan(0.5);
  expect(result.difference).toBeLessThan(8);
});

test.describe("mobile canvas", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test("a native touch emits wind, photo still freezes and exports HD PNG", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Le Souffle Entrer" }).tap();
    const canvas = page.locator("#stage canvas");
    await expect(canvas).toHaveAttribute("data-vocal-fireflies", "24");
    await page.touchscreen.tap(195, 250);
    await expect(canvas).toHaveAttribute("data-wind-taps", "1");
    await page
      .getByRole("button", { name: "Sculpter avec Encres", exact: true })
      .tap();
    await expect
      .poll(async () =>
        Number(await canvas.getAttribute("data-painted-samples")),
      )
      .toBeGreaterThan(0);
    await page.getByRole("button", { name: "Vue photo", exact: true }).tap();
    await expect(canvas).toHaveAttribute("data-sculpture-paused", "true");
    await page.waitForTimeout(350);
    const position = await canvas.getAttribute("data-painter-position");
    await page.waitForTimeout(200);
    await expect(canvas).toHaveAttribute("data-painter-position", position);
    await page
      .getByRole("button", { name: "Zoomer la photo", exact: true })
      .tap();
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Télécharger la photo · PNG HD" })
      .tap();
    const asset = await download;
    expect(asset.suggestedFilename()).toMatch(/\.png$/);
    const png = readFileSync(await asset.path());
    expect(Math.max(png.readUInt32BE(16), png.readUInt32BE(20))).toBe(2560);
    await page.getByRole("button", { name: "FPV drone", exact: true }).tap();
    await expect(canvas).toHaveAttribute("data-sculpture-paused", "false");
  });
});

test("a missing universe ambience is reported without blocking sculpture", async ({
  page,
}) => {
  await page.route("**/ambiances/ambiance01.mp3", (route) =>
    route.fulfill({ status: 404, body: "missing" }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Le Souffle Entrer" }).click();
  await expect(page.locator(".universe-error")).toContainText(
    "ambiance01.mp3 manque",
  );
  await page
    .getByRole("button", { name: "Sculpter avec Voiles", exact: true })
    .click();
  await expect
    .poll(async () =>
      Number(
        await page
          .locator("#stage canvas")
          .getAttribute("data-painted-samples"),
      ),
    )
    .toBeGreaterThan(0);
});
