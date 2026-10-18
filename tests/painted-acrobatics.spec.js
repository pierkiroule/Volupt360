import { test, expect } from "@playwright/test";

test("three flight figures are distinct, continuous, pauseable and manually interruptible", async ({
  page,
}) => {
  await page.goto("/?original=1");
  const results = await page.evaluate(async () => {
    const { createPointFlight } =
      await import("/src/engine/createPointFlight.js");
    const THREE = await import("/node_modules/.vite/deps/three.js");
    return ["loop", "spiral", "infinity"].map((id) => {
      const flight = createPointFlight({ seed: 37 });
      let pose = flight.update(0.016, {});
      const origin = pose.position.clone(),
        before = pose.direction.clone();
      const started = flight.beginAcrobatic(id),
        second = flight.beginAcrobatic(id);
      let maxStep = 0,
        minDot = 1,
        maxY = -Infinity,
        minY = Infinity,
        maxX = -Infinity,
        minX = Infinity,
        active = false;
      const previous = pose.position.clone();
      for (let i = 0; i < 580; i++) {
        pose = flight.update(1 / 60, {});
        active ||= Boolean(pose.acrobatics);
        maxStep = Math.max(maxStep, previous.distanceTo(pose.position));
        previous.copy(pose.position);
        minDot = Math.min(minDot, before.dot(pose.direction));
        maxY = Math.max(maxY, pose.position.y - origin.y);
        minY = Math.min(minY, pose.position.y - origin.y);
        maxX = Math.max(maxX, pose.position.x - origin.x);
        minX = Math.min(minX, pose.position.x - origin.x);
      }
      const ended = !pose.acrobatics;
      flight.beginAcrobatic(id);
      flight.update(0.1, {});
      const paused = pose.position.clone();
      flight.update(0, {});
      const pauseDistance = paused.distanceTo(pose.position);
      flight.beginPilot();
      flight.setPilot(0.4, 0.2, {
        right: new THREE.Vector3(-1, 0, 0),
        up: new THREE.Vector3(0, 1, 0),
      });
      pose = flight.update(1 / 60, {});
      return {
        id,
        started,
        second,
        active,
        ended,
        maxStep,
        minDot,
        maxY,
        minY,
        maxX,
        minX,
        pauseDistance,
        cancelled: !pose.acrobatics,
      };
    });
  });
  for (const r of results) {
    expect(r.started).toBe(true);
    expect(r.second).toBe(false);
    expect(r.active).toBe(true);
    expect(r.ended).toBe(true);
    expect(r.maxStep).toBeLessThan(0.06);
    expect(r.pauseDistance).toBe(0);
    expect(r.cancelled).toBe(true);
  }
  expect(results[0].minDot).toBeLessThan(-0.9);
  expect(
    new Set(results.map((r) => `${r.maxY.toFixed(2)}:${r.maxX.toFixed(2)}`))
      .size,
  ).toBe(3);
});

test("triangular tools above the brushes paint from both wings during all three figures", async ({
  page,
}) => {
  test.setTimeout(75000);
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?original=1");
  await page.getByRole("button", { name: "Prendre son envol" }).click();
  const canvas = page.locator("#stage canvas");
  const group = page.getByRole("group", { name: "Acrobaties peintes" });
  await expect(group.getByRole("button")).toHaveCount(3);
  const figureBounds = await group.boundingBox(),
    brushBounds = await page
      .getByRole("group", { name: "Choisir une brosse" })
      .boundingBox();
  expect(figureBounds.y + figureBounds.height).toBeLessThanOrEqual(
    brushBounds.y + 1,
  );
  await page
    .getByRole("button", { name: "Filaments légers", exact: true })
    .click();
  for (const [id, label] of [
    ["loop", "Boucle céleste"],
    ["spiral", "Spirale des ailes"],
    ["infinity", "Ruban infini"],
  ]) {
    const before = Number(await canvas.getAttribute("data-painted-samples"));
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(canvas).toHaveAttribute("data-acrobatic", id);
    await expect(canvas).toHaveAttribute("data-nozzle-brush", "aurore");
    await expect(canvas).toHaveAttribute("data-paint-emitter", "wings");
    await page.waitForTimeout(500);
    expect(
      Number(await canvas.getAttribute("data-painted-samples")),
    ).toBeGreaterThan(before + 4);
    await expect(canvas).toHaveAttribute("data-acrobatic", "none", {
      timeout: 12000,
    });
    await expect(canvas).toHaveAttribute("data-nozzle-paint", "false");
  }
  await page
    .getByRole("button", { name: "Spirale des ailes", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-acrobatic", "spiral");
  await page.getByRole("button", { name: "Faire une pause" }).click();
  const time = await canvas.getAttribute("data-life-time"),
    samples = await canvas.getAttribute("data-painted-samples");
  await page.waitForTimeout(250);
  expect(await canvas.getAttribute("data-life-time")).toBe(time);
  expect(await canvas.getAttribute("data-painted-samples")).toBe(samples);
  await page.getByRole("button", { name: "Reprendre", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Faire une pause", exact: true }),
  ).toBeVisible();
  await page.mouse.move(160, 330);
  await page.mouse.down();
  await page.mouse.move(180, 350);
  await expect(canvas).toHaveAttribute("data-acrobatic", "none");
  await expect(canvas).toHaveAttribute("data-nozzle-paint", "true");
  await page.mouse.up();
  await page.screenshot({ path: "/tmp/oizo-painted-acrobatics.png" });
  expect(errors).toEqual([]);
});
