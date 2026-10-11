import { test, expect } from "@playwright/test";

function audioFixture() {
  const rate = 22050;
  const samples = rate * 4;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) {
    const frequency = Math.floor(i / (rate / 8)) % 2 ? 880 : 220;
    wav.writeInt16LE(
      Math.round(Math.sin((2 * Math.PI * frequency * i) / rate) * 20000),
      44 + i * 2,
    );
  }
  return wav;
}

test("3D scene, brushes, camera, PNG export and reset", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("#stage canvas")).toHaveCount(1);
  await expect(page.getByRole("alert")).toHaveCount(0);
  for (const label of [
    "✺ Pigments",
    "✒ Filaments",
    "◌ Bulles légères",
    "✱ Splatch noir",
  ]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(
      page.getByRole("button", { name: label, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  await page.locator("#inside").click(); // freeze auto-flight for image comparison
  await expect(page.locator("#inside")).toContainText("Drone auto");
  const blank = await page.locator("canvas").screenshot();
  await page.locator("canvas").click({ position: { x: 400, y: 250 } });
  const painted = await page.locator("canvas").screenshot();
  expect(painted.equals(blank)).toBe(false);
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#capture").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^NID-SONORE-.*\.png$/);
  expect(await download.failure()).toBeNull();
  await page.locator("#reset").click();
  const cleared = await page.locator("canvas").screenshot();
  expect(cleared.equals(painted)).toBe(false);
  await page.locator("#life").fill("20");
  await expect(page.locator("#lifeValue")).toHaveText("20");
  await page.locator("#turn360").click();
  await expect(page.locator("#turn360")).toBeDisabled();
  await expect(page.locator("#turn360")).toBeEnabled({ timeout: 20000 });
  expect(errors).toEqual([]);
});

test("local audio import, playback, seeking and scratch", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.locator("#file").setInputFiles({
    name: "test-sonore.wav",
    mimeType: "audio/wav",
    buffer: audioFixture(),
  });
  await expect(page.locator("#status")).toHaveText("test-sonore.wav");
  await expect(page.locator("#fileRow")).toBeVisible();
  await expect(page.locator("#play")).toHaveText("❚❚");
  await expect(page.locator("#time")).not.toHaveText("0:00", {
    timeout: 10000,
  });
  await page.locator("#play").click();
  await expect(page.locator("#play")).toHaveText("▶");
  await page.locator("#seek").fill("400");
  await expect(page.locator("#time")).toHaveText("0:01");
  const bar = await page.locator("#seek").boundingBox();
  await page.mouse.move(bar.x + bar.width * 0.4, bar.y + bar.height / 2);
  await page.mouse.down();
  await expect(page.locator("#fileRow")).toHaveClass(/scratching/);
  await page.mouse.move(bar.x + bar.width * 0.65, bar.y + bar.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(page.locator("#fileRow")).not.toHaveClass(/scratching/);
  expect(errors).toEqual([]);
});

test.describe("mobile", () => {
  test.use({ hasTouch: true });
  test("mobile controls remain accessible", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.locator("#stage canvas")).toHaveCount(1);
    await expect(page.locator("#capture")).toBeInViewport();
    await expect(page.locator("#life")).toBeInViewport();
    await page
      .getByRole("button", { name: "✱ Splatch noir", exact: true })
      .click();
    await page.locator("canvas").tap({ position: { x: 180, y: 200 } });
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
});
