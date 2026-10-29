import { test, expect } from "@playwright/test";

test("overlapping projective fields use stable buffers, spatial neighborhoods and frozen pause", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { ProjectiveComposition } =
      await import("/src/simple/ProjectiveComposition.ts");
    const c = new ProjectiveComposition();
    c.setPalette(["warm", "water", "night"]);
    const centers = c.centers.slice(),
      neighbors = c.neighbors.slice(),
      colors = c.colors.slice(),
      weights = c.contact;
    let maxRadius = 0,
      peak = 0,
      minDistance = Infinity,
      maxDistance = 0;
    for (let i = 0; i < 1200; i++) {
      c.update(i * 0.1, 0.1);
      for (let j = 0; j < 6; j++) {
        maxRadius = Math.max(
          maxRadius,
          Math.hypot(c.centers[j].x, c.centers[j].y - 18, c.centers[j].z + 5),
        );
        peak = Math.max(peak, c.contact[j]);
      }
      const d = c.centers[0].distanceTo(c.centers[1]);
      minDistance = Math.min(minDistance, d);
      maxDistance = Math.max(maxDistance, d);
    }
    const frozen = JSON.stringify([
      c.centers,
      c.neighbors,
      Array.from(c.contact),
      c.colors,
      c.seed,
    ]);
    c.update(999, 0);
    const same =
      JSON.stringify([
        c.centers,
        c.neighbors,
        Array.from(c.contact),
        c.colors,
        c.seed,
      ]) === frozen;
    const stable =
      centers.every((p, i) => c.centers[i] === p) &&
      neighbors.every((p, i) => c.neighbors[i] === p) &&
      colors.every((p, i) => c.colors[i] === p) &&
      c.contact === weights;
    return {
      maxRadius,
      peak,
      minDistance,
      maxDistance,
      same,
      stable,
      seed: c.seed,
    };
  });
  expect(result.maxRadius).toBeLessThan(6);
  expect(result.peak).toBeGreaterThan(0.5);
  expect(result.maxDistance - result.minDistance).toBeGreaterThan(0.4);
  expect(result.same).toBe(true);
  expect(result.stable).toBe(true);
  expect(result.seed.u).toBeGreaterThan(0);
  expect(result.seed.u).toBeLessThan(1);
});

test("musical responses choose one local field and decay smoothly without disturbing pause", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { AbstractResonances } =
      await import("/src/simple/AbstractResonances.ts");
    const { makeWatercolorAtlas } =
      await import("/src/simple/WatercolorAtlas.ts");
    const paper = makeWatercolorAtlas(),
      forms = new AbstractResonances(paper, true);
    forms.setMusic(
      { energy: 0.8, low: 0.5, high: 0.5, onset: 0.4, note: 64 },
      0.1,
    );
    const u = forms.mesh.material.uniforms,
      first = { lane: u.soundLane.value, bloom: u.soundBloom.value };
    for (let i = 0; i < 60; i++)
      forms.setMusic(
        { energy: 0.8, low: 0.5, high: 0.5, onset: 0, note: 64 },
        1 / 60,
      );
    const after = u.soundBloom.value;
    forms.setMusic({ energy: 1, low: 1, high: 1, onset: 1, note: 66 }, 0);
    const paused = { lane: u.soundLane.value, bloom: u.soundBloom.value };
    forms.dispose();
    paper.dispose();
    return { first, after, paused };
  });
  expect(result.first.lane).toBe(4);
  expect(result.first.bloom).toBeGreaterThan(0.9);
  expect(result.after).toBeLessThan(result.first.bloom);
  expect(result.after).toBeGreaterThan(0.4);
  expect(result.paused.lane).toBe(4);
  expect(result.paused.bloom).toBe(result.after);
});

test("the complete projective world reseeds at a meeting and remains readable on mobile", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /WebGL|shader|GL_INVALID/.test(m.text()))
      errors.push(m.text());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  const canvas = page.locator("canvas");
  await expect
    .poll(
      async () => Number(await canvas.getAttribute("data-reaction-encounters")),
      { timeout: 15000 },
    )
    .toBeGreaterThan(0);
  await expect(canvas).toHaveAttribute("data-ready", "inside");
  await page.screenshot({ path: testInfo.outputPath("projective-world.png") });
  expect(Number(await canvas.getAttribute("data-calls"))).toBeLessThanOrEqual(
    14,
  );
  expect(Number(await canvas.getAttribute("data-accents"))).toBeLessThanOrEqual(
    135,
  );
  expect(errors).toEqual([]);
});
