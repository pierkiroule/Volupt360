import { test, expect } from "@playwright/test";
test("pigment alpha plates reproduce seeds, retain paper reserves and connect continuous ribbons", async ({
  page,
}) => {
  await page.goto("/?original=1");
  const r = await page.evaluate(async () => {
    const { createWatercolorAlpha } =
      await import("/src/chill/createWatercolorAlpha.js");
    const read = (c) =>
      c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    const a = read(createWatercolorAlpha("wash", 731, 128)),
      b = read(createWatercolorAlpha("wash", 731, 128)),
      c = read(createWatercolorAlpha("wash", 732, 128)),
      continuous = read(createWatercolorAlpha("wash", 731, 128, true));
    let changed = 0,
      identical = true,
      empty = 0;
    const levels = new Set();
    for (let i = 3; i < a.length; i += 4) {
      levels.add(a[i]);
      if (a[i] !== b[i]) identical = false;
      if (a[i] !== c[i]) changed++;
      if (a[i] === 0) empty++;
    }
    return {
      identical,
      changed,
      levels: levels.size,
      empty,
      connected:
        continuous[64 * 4 + 3] > 0 && continuous[(127 * 128 + 64) * 4 + 3] > 0,
    };
  });
  expect(r.identical).toBe(true);
  expect(r.changed).toBeGreaterThan(100);
  expect(r.levels).toBeGreaterThan(64);
  expect(r.empty).toBeGreaterThan(100);
  expect(r.connected).toBe(true);
});

test("welcome uses the local handwritten font and a procedural watercolor mask", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?original=1");
  await page.evaluate(() => document.fonts.ready);
  const r = await page.evaluate(() => ({
    font: document.fonts.check("24px Caveat"),
    mask: getComputedStyle(
      document.querySelector(".chill-experience"),
    ).getPropertyValue("--paper-alpha"),
    family: getComputedStyle(document.querySelector(".chill-welcome h2"))
      .fontFamily,
    overflow: document.documentElement.scrollWidth > innerWidth,
  }));
  expect(r.font).toBe(true);
  expect(r.mask).toContain("data:image/png");
  expect(r.family).toContain("Caveat");
  expect(r.overflow).toBe(false);
  await page.screenshot({ path: "/tmp/haikuarelle-welcome.png" });
});
