import { test, expect } from "@playwright/test";

test("weather combinations retain distinct phenomena, independent of selection order", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { composeWeather, PHENOMENA } =
      await import("/src/simple/composition.ts");
    return {
      sunRain: composeWeather(["warm", "water"]),
      reverse: composeWeather(["water", "warm"]),
      windRain: composeWeather(["air", "water"]),
      moon: composeWeather(["tired"]),
      windSnow: composeWeather(["air", "surprise"]),
      moonFog: composeWeather(["soft", "tired"]),
      fallback: composeWeather(["invalid"]),
      signatures: Object.values(PHENOMENA).map((p) => p.kind),
    };
  });
  expect(result.sunRain).toEqual(result.reverse);
  expect(result.sunRain.rainbow).toBe(1);
  expect(result.sunRain.encounters).toEqual([1, 0, 0]);
  expect(result.windSnow.encounters).toEqual([0, 1, 0]);
  expect(result.moonFog.encounters).toEqual([0, 0, 1]);
  expect(result.sunRain.kinds).toEqual([0, 1]);
  expect(result.windRain.slant).toBe(1);
  expect(result.windRain.rainbow).toBe(0);
  expect(result.moon.climate[2]).toBe(1);
  expect(result.fallback.entries).toEqual(["warm"]);
  expect(new Set(result.signatures).size).toBe(12);
});

test("all twelve weather worlds render without shader errors within the same GPU budget", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /WebGL|shader|THREE|GL_INVALID/i.test(m.text()))
      errors.push(m.text());
  });
  await page.goto("/");
  for (const id of [
    "warm",
    "water",
    "air",
    "soft",
    "night",
    "spark",
    "wonder",
    "surprise",
    "confused",
    "tired",
    "trust",
    "longing",
  ]) {
    await page.evaluate(
      (id) => localStorage.setItem("cosmo-simple.v1", JSON.stringify([id])),
      id,
    );
    await page.reload();
    const canvas = page.locator("canvas");
    await expect(canvas).toHaveAttribute("data-composition", id);
    await expect(canvas).toHaveAttribute("data-sky", "watercolor");
    await expect(canvas).toHaveAttribute("data-calls", "9");
    if (["warm", "water", "air", "surprise", "wonder", "tired"].includes(id))
      await page.screenshot({ path: `test-results/weather-${id}.png` });
  }
  await page.evaluate(() =>
    localStorage.setItem("cosmo-simple.v1", JSON.stringify(["warm", "water"])),
  );
  await page.reload();
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-interaction", "sun-rain");
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  await expect(canvas).toHaveAttribute("data-ready", "inside");
  const time = await canvas.getAttribute("data-time");
  await expect.poll(() => canvas.getAttribute("data-time")).not.toBe(time);
  await page.screenshot({ path: "test-results/weather-sun-rain.png" });
  expect(errors).toEqual([]);
});
