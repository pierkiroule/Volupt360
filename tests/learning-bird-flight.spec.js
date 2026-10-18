import { test, expect } from "@playwright/test";

test("all twelve bubbles are luminous at initialization, with no brush or painting", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("checkbox", { name: /Activer le gyroscope/ }).uncheck();
  await page
    .getByRole("button", { name: "Explorer le ciel", exact: true })
    .click();
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-learning-mode", "EXPLORE");
  const nodes = JSON.parse(await canvas.getAttribute("data-learning-bubbles"));
  expect(nodes).toHaveLength(12);
  expect(
    nodes.every((node) => node.visible && node.luminous && !node.visited),
  ).toBe(true);
  expect(await canvas.getAttribute("data-learning-brush")).toBe("");
  expect(
    JSON.parse(await canvas.getAttribute("data-learning-paint")).samples,
  ).toBe(0);
  await expect(
    page.getByRole("button", {
      name: /brosse|Boucle céleste|Spirale des ailes|Ruban infini/i,
    }),
  ).toHaveCount(0);
});

test("the reused pilot approaches only the nearest luminous bubble and makes bounded spontaneous figures", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createLearningFlight } =
      await import("/src/learning/createLearningFlight.js");
    const canvas = document.createElement("canvas"),
      camera = new THREE.PerspectiveCamera();
    const flight = createLearningFlight(canvas, camera, {
      reducedMotion: false,
    });
    const bubbles = [
      { id: "near", mesh: { position: new THREE.Vector3(0, 0, -6) } },
      { id: "far", mesh: { position: new THREE.Vector3(18, 2, -24) } },
    ];
    let pose = flight.pose,
      previous = pose.position.clone(),
      maxStep = 0;
    for (let i = 0; i < 50; i++) {
      pose = flight.update(0.1, {}, bubbles, [], false);
      maxStep = Math.max(maxStep, pose.position.distanceTo(previous));
      previous.copy(pose.position);
    }
    const nearTarget = flight.state.nearestId,
      nearDistance = pose.position.distanceTo(bubbles[0].mesh.position);
    const kinds = new Set();
    // Already visited nodes must never remain automatic destinations.
    for (let i = 0; i < 1300; i++) {
      pose = flight.update(0.1, {}, bubbles, ["near", "far"], true);
      if (pose.acrobatics) kinds.add(pose.acrobatics);
      maxStep = Math.max(maxStep, pose.position.distanceTo(previous));
      previous.copy(pose.position);
    }
    const targetAfter = flight.state.nearestId;
    flight.setEnabled(false);
    const stopped = pose.position.clone();
    flight.update(0.1, {}, bubbles, [], true);
    const pauseError = stopped.distanceTo(pose.position);
    flight.dispose();
    return {
      nearTarget,
      nearDistance,
      targetAfter,
      kinds: [...kinds],
      maxStep,
      pauseError,
    };
  });
  expect(result.nearTarget).toBe("near");
  expect(result.nearDistance).toBeLessThan(6);
  expect(result.targetAfter).toBeNull();
  expect(new Set(result.kinds)).toEqual(
    new Set(["loop", "spiral", "infinity"]),
  );
  expect(result.maxStep).toBeLessThan(0.25);
  expect(result.pauseError).toBe(0);
});

test("touch cancels a surprise immediately and turns right in the camera frame", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createLearningFlight } =
      await import("/src/learning/createLearningFlight.js");
    const canvas = document.createElement("canvas");
    canvas.id = "pilot-test";
    canvas.width = canvas.height = 300;
    canvas.style.cssText =
      "position:fixed;top:0;left:0;width:300px;height:300px;z-index:1000";
    document.body.append(canvas);
    const camera = new THREE.PerspectiveCamera();
    camera.lookAt(0, 0, -1);
    window.__birdFlight = createLearningFlight(canvas, camera, {
      reducedMotion: false,
    });
    const flight = window.__birdFlight;
    for (let i = 0; i < 250; i++) flight.update(0.1, {}, [], [], true);
    window.__beforeTouchFigure = flight.state.acrobatic;
  });
  expect(await page.evaluate(() => window.__beforeTouchFigure)).toBeTruthy();
  await page.mouse.move(100, 150);
  await page.mouse.down();
  await page.mouse.move(205, 150, { steps: 10 });
  const result = await page.evaluate(() => {
    const flight = window.__birdFlight,
      before = flight.pose.direction.clone();
    for (let i = 0; i < 35; i++) flight.update(0.1, {}, [], [], true);
    return {
      manual: flight.state.manual,
      figure: flight.state.acrobatic,
      x: flight.pose.direction.x,
      beforeX: before.x,
    };
  });
  expect(result.manual).toBe(true);
  expect(result.figure).toBeNull();
  expect(result.x).toBeGreaterThan(0.1);
  await page.mouse.up();
  expect(await page.evaluate(() => window.__birdFlight.state.manual)).toBe(
    false,
  );
  await page.evaluate(() => {
    window.__birdFlight.dispose();
    document.getElementById("pilot-test").remove();
  });
});

test("leaving even a partially read bubble activates its brush, dims the node and paints without touch", async ({
  page,
}) => {
  await page.route(
    "**/src/learning/PoeticLearningExperience.jsx",
    async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body: (await response.text()).replace(
          "journey.current = engine.current.startPoeticLearning({",
          "journey.current = window.__learningTest = engine.current.startPoeticLearning({",
        ),
      });
    },
  );
  await page.goto("/");
  await page.getByRole("checkbox", { name: /Activer le gyroscope/ }).uncheck();
  await page
    .getByRole("button", { name: "Explorer le ciel", exact: true })
    .click();
  await page.waitForFunction(() => Boolean(window.__learningTest));
  await page.evaluate(() => {
    const journey = window.__learningTest;
    for (let i = 0; i < 15; i++) journey.update(0.1);
    journey.enter("weight");
    journey.leave();
  });
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-learning-brush", "weight");
  await expect
    .poll(
      async () =>
        JSON.parse(await canvas.getAttribute("data-learning-paint")).samples,
    )
    .toBeGreaterThan(5);
  const nodes = JSON.parse(await canvas.getAttribute("data-learning-bubbles"));
  expect(nodes).toHaveLength(12);
  expect(nodes.find((n) => n.id === "weight")).toMatchObject({
    visited: true,
    luminous: false,
    visible: true,
  });
  expect(nodes.filter((n) => n.luminous)).toHaveLength(11);
  const flight = JSON.parse(await canvas.getAttribute("data-learning-flight"));
  expect(flight.manual).toBe(false);
  expect(flight.nearestId).not.toBe("weight");
  await page.screenshot({ path: "/tmp/oizo-luminous-bubble-flight.png" });
});
