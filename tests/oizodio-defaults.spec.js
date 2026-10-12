import { test, expect } from "@playwright/test";
import { createDefaultMelody } from "../src/sonoizo/createDefaultMelodies.js";

test("twelve deterministic mellow melodies have bounded amplitude, duration and distinct phrases", () => {
  const fingerprints = new Set();
  for (let i = 0; i < 12; i++) {
    const { data, sampleRate } = createDefaultMelody(i);
    expect(data.length / sampleRate).toBeLessThanOrEqual(5);
    expect(data).toEqual(createDefaultMelody(i).data);
    let peak = 0,
      squares = 0;
    for (const value of data) {
      if (!Number.isFinite(value)) throw new Error("Non-finite PCM sample");
      peak = Math.max(peak, Math.abs(value));
      squares += value * value;
    }
    expect(peak).toBeLessThan(0.5);
    expect(Math.sqrt(squares / data.length)).toBeGreaterThan(0.02);
    expect(Math.abs(data[data.length - 1])).toBeLessThan(0.001);
    fingerprints.add(data.slice(5000, 5010).join(","));
  }
  expect(fingerprints.size).toBe(12);
});

test("default mobile opens ready to sculpt silently with folding tools and three square viewpoints", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.__contexts = 0;
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor(...args) {
        super(...args);
        window.__contexts++;
      }
    };
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const pad = page.getByRole("button", {
    name: "Jouer le fragment Voiles",
    exact: true,
  });
  await expect(pad).toBeEnabled();
  await expect(page.locator(".twig-pad.is-filled")).toHaveCount(12);
  expect(await page.evaluate(() => window.__contexts)).toBe(0);
  await expect(
    page.getByRole("slider", { name: "Distance du drone" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Poèmes", exact: true }),
  ).toHaveCount(0);
  const views = page
    .getByRole("navigation", { name: "Vues caméra" })
    .getByRole("button");
  await expect(views).toHaveCount(3);
  const box = await views.first().boundingBox();
  expect(box.width).toBe(36);
  expect(box.height).toBe(36);
  await pad.click();
  const canvas = page.locator("#stage canvas");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-painted-samples")))
    .toBeGreaterThan(2);
  await page
    .getByRole("button", { name: "Déplier les fonctionnalités" })
    .click();
  await expect(
    page.getByRole("slider", { name: "Distance du drone" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Poèmes", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Écouter Voiles", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Replier les fonctionnalités" })
    .click();
  await expect(pad).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Écouter Voiles", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "FPV 360° gyro", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-camera-mode", "gyro");
  await page.getByRole("button", { name: "FPV drone", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-camera-mode", "drone");
  expect(errors).toEqual([]);
});
