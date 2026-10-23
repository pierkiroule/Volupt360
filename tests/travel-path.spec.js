import { test, expect } from "@playwright/test";

test("tour stays around the work with a continuous, slow heading and a closed return", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { sampleTravel } = await import("/src/simple/TravelPath.ts");
    const out = new Float64Array(6),
      start = [...sampleTravel(0, out)];
    let previous = start,
      maxStep = 0,
      maxTurn = 0,
      minDistance = Infinity,
      maxRadius = 0;
    for (let t = 1 / 60; t < 300; t += 1 / 60) {
      const p = sampleTravel(t, out);
      maxStep = Math.max(
        maxStep,
        Math.hypot(...p.slice(0, 3).map((v, i) => v - previous[i])),
      );
      const d = [p[3] - p[0], p[4] - p[1], p[5] - p[2]];
      const old = [
        previous[3] - previous[0],
        previous[4] - previous[1],
        previous[5] - previous[2],
      ];
      const length = Math.hypot(...d),
        oldLength = Math.hypot(...old);
      minDistance = Math.min(minDistance, length);
      maxTurn = Math.max(
        maxTurn,
        Math.acos(
          Math.min(
            1,
            Math.max(
              -1,
              d.reduce((s, v, i) => s + v * old[i], 0) / length / oldLength,
            ),
          ),
        ),
      );
      maxRadius = Math.max(maxRadius, Math.hypot(p[0], p[1] - 18, p[2] + 5));
      previous = [...p];
    }
    const end = [...sampleTravel((Math.PI * 2) / 0.042, out)];
    return { maxStep, maxTurn, minDistance, maxRadius, start, end };
  });
  expect(result.maxStep).toBeLessThan(0.015);
  expect(result.maxTurn).toBeLessThan(0.004);
  expect(result.minDistance).toBeGreaterThan(3);
  expect(result.maxRadius).toBeLessThan(9);
  result.start.forEach((v, i) => expect(result.end[i]).toBeCloseTo(v, 8));
});
