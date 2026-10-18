import { test, expect } from "@playwright/test";
test("twelve sourced discoveries distinguish evidence, limits and poetic interpretation", async ({
  page,
}) => {
  await page.goto("/");
  const r = await page.evaluate(async () => {
    const { LEARNING_TOPICS, LEARNING_SECONDS } =
      await import("/src/learning/learningContent.js");
    return {
      seconds: LEARNING_SECONDS,
      ids: LEARNING_TOPICS.map((t) => t.id),
      brushes: LEARNING_TOPICS.map((t) => t.brush),
      valid: LEARNING_TOPICS.every(
        (t) =>
          t.messages.length === 3 &&
          t.messages[1].nuance.length > 50 &&
          t.messages[2].kind === "Interprétation poétique" &&
          t.doi.startsWith("10.") &&
          t.interaction.length > 20,
      ),
      models: LEARNING_TOPICS.map((t) => t.animation),
    };
  });
  expect(r.seconds).toBe(900);
  expect(new Set(r.ids).size).toBe(12);
  expect(new Set(r.brushes).size).toBe(12);
  expect(new Set(r.models).size).toBe(12);
  expect(r.valid).toBe(true);
  await expect(
    page.getByRole("heading", { name: /Pourquoi cherchons-nous/ }),
  ).toBeVisible();
});
test("gaze requires an uninterrupted 1.5 seconds and fires only once", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createGazeInteraction } =
      await import("/src/learning/createGazeInteraction.js");
    const hits = [],
      gaze = createGazeInteraction({ onSelect: (id) => hits.push(id) });
    for (let i = 0; i < 14; i++) gaze.update("a", 0.1);
    const before = hits.length;
    gaze.update(null, 0.1);
    for (let i = 0; i < 14; i++) gaze.update("a", 0.1);
    const interrupted = hits.length;
    for (let i = 0; i < 30; i++) gaze.update("a", 0.1);
    gaze.update("b", 0.1);
    for (let i = 0; i < 14; i++) gaze.update("b", 0.1);
    return { before, interrupted, hits };
  });
  expect(result).toEqual({ before: 0, interrupted: 0, hits: ["a", "b"] });
});
test("local progress validates data and survives unavailable storage", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { cleanProgress, saveProgress, loadProgress } =
      await import("/src/learning/learningProgress.js");
    const dirty = cleanProgress({
      elapsed: -4,
      opened: { weight: [2], burden: [0, 1, 2, 2], sigh: [0, 2] },
      visited: ["weight", "unknown"],
    });
    const blocked = {
      getItem() {
        throw Error("blocked");
      },
      setItem() {
        throw Error("quota");
      },
    };
    return {
      dirty,
      stored: saveProgress(dirty, blocked),
      fallback: loadProgress(blocked).visited,
    };
  });
  expect(result.dirty.elapsed).toBe(0);
  expect(result.dirty.visited).toEqual(["burden"]);
  expect(result.dirty.opened.weight).toEqual([]);
  expect(result.dirty.opened.sigh).toEqual([0]);
  expect(result.stored).toBe(false);
  expect(result.fallback).toEqual([]);
});

async function exposeJourney(page) {
  await page.route(
    "**/src/learning/PoeticLearningExperience.jsx",
    async (route) => {
      const response = await route.fetch();
      const source = await response.text();
      await route.fulfill({
        response,
        body: source.replace(
          "journey.current = engine.current.startPoeticLearning({",
          "journey.current = window.__learningTest = engine.current.startPoeticLearning({",
        ),
      });
    },
  );
}
async function start(page) {
  await page.goto("/");
  await page.getByRole("checkbox", { name: /Activer le gyroscope/ }).uncheck();
  await page
    .getByRole("button", { name: "Explorer le ciel", exact: true })
    .click();
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-learning-mode",
    "EXPLORE",
  );
}

test("mobile tactile fallback: gaze entry, three messages, automatic painting and reload", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /WebGL|Shader|THREE/.test(m.text()))
      errors.push(m.text());
  });
  await exposeJourney(page);
  await start(page);
  await expect(
    page.getByRole("navigation", { name: "Navigation et audio" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /brosse/i })).toHaveCount(0);
  // The bird physically reaches the first bubble; gaze only suggests a direction.
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-learning-mode",
    "BUBBLE",
    { timeout: 35000 },
  );
  await expect(
    page.getByRole("heading", { name: /Peut-on se sentir plus léger/ }),
  ).toBeVisible({ timeout: 8000 });
  const startPosition = await page
    .locator("canvas")
    .getAttribute("data-camera-position");
  await page.getByRole("button", { name: "Poursuivre la découverte" }).click();
  const canvas = page.locator("canvas"),
    box = await canvas.boundingBox();
  const before = await canvas.getAttribute("data-camera-orientation");
  await page.mouse.move(box.width * 0.6, box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.width * 0.3, box.height * 0.45, { steps: 10 });
  await page.mouse.up();
  await expect
    .poll(() => canvas.getAttribute("data-camera-orientation"))
    .not.toBe(before);
  expect(await canvas.getAttribute("data-camera-position")).toBe(startPosition);
  await page
    .getByRole("button", { name: "Ouvrir : Découverte scientifique" })
    .click();
  await expect(
    page.getByText("Ce que cela ne permet pas de conclure.", { exact: true }),
  ).toBeVisible();
  await page.getByText("Référence scientifique", { exact: true }).click();
  await expect(
    page.getByRole("link", { name: /Consulter la publication/ }),
  ).toHaveAttribute("href", /doi.org/);
  await page.getByRole("button", { name: "Poursuivre la découverte" }).click();
  await page.getByRole("button", { name: "Ouvrir : Résonance" }).click();
  await expect(page.getByText(/Interprétation poétique/)).toBeVisible();
  await page
    .getByRole("button", { name: "Revenir au ciel", exact: true })
    .first()
    .click();
  await expect(canvas).toHaveAttribute("data-learning-progress", "1");
  await expect
    .poll(
      async () =>
        JSON.parse(await canvas.getAttribute("data-learning-paint")).samples,
    )
    .toBeGreaterThan(5);
  await expect(canvas).toHaveAttribute("data-learning-brush", "weight");
  await page.screenshot({ path: "/tmp/oizo-poetic-learning-mobile.png" });
  await page.getByRole("button", { name: "Quitter le parcours" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Poursuivre mon exploration" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("all twelve universes, sequenced unlocks, pause and 15-minute resource bounds", async ({
  page,
}) => {
  test.setTimeout(90000);
  await exposeJourney(page);
  await start(page);
  await page.waitForFunction(() => Boolean(window.__learningTest));
  const r = await page.evaluate(async () => {
    const { LEARNING_TOPICS } =
      await import("/src/learning/learningContent.js");
    const journey = window.__learningTest;
    journey.setTravelling(false);
    // A real RAF continues, but scripted dt is used only to accelerate lifecycle.
    if (journey.state.mode === "BUBBLE") journey.leave();
    const results = [];
    for (const topic of LEARNING_TOPICS) {
      for (let i = 0; i < 35; i++) journey.update(0.1);
      const entered =
        journey.state.mode === "BUBBLE" && journey.state.topicId === topic.id
          ? true
          : journey.enter(topic.id);
      for (let i = 0; i < 12; i++) journey.update(0.1);
      const skip = journey.reveal(2);
      const stages = [];
      for (let i = 0; i < 3; i++) {
        stages.push(journey.reveal(i));
        journey.dismissMessage();
      }
      journey.leave();
      results.push({ entered, skip, stages, brush: journey.state.activeBrush });
    }
    journey.setTravelling(true);
    for (let i = 0; i < 9000; i++) journey.update(0.1);
    const before = journey.state.progress.elapsed;
    journey.setPaused(true);
    for (let i = 0; i < 20; i++) journey.update(0.1);
    const after = journey.state.progress.elapsed;
    return {
      results,
      visited: journey.state.progress.visited.length,
      invitation: journey.state.invitation,
      before,
      after,
      paint: JSON.parse(document.querySelector("canvas").dataset.learningPaint),
    };
  });
  expect(
    r.results.every((x) => x.entered && !x.skip && x.stages.every(Boolean)),
  ).toBe(true);
  expect(new Set(r.results.map((x) => x.brush)).size).toBe(12);
  expect(r.visited).toBe(12);
  expect(r.invitation).toBe(true);
  expect(r.after).toBe(r.before);
  expect(r.paint.strokes).toBeLessThanOrEqual(12);
  expect(r.paint.textures).toBeLessThanOrEqual(12);
});

test("gyroscope explicit permission and denied sensor keep tactile exploration usable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__permissionCalls = 0;
    class Sensor extends Event {
      static async requestPermission() {
        window.__permissionCalls++;
        return "denied";
      }
    }
    window.DeviceOrientationEvent = Sensor;
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explorer le ciel", exact: true })
    .click();
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-gyroscope-status",
    "denied",
  );
  expect(await page.evaluate(() => window.__permissionCalls)).toBe(1);
  await expect(
    page.getByText("Glissez pour guider · relâchez pour explorer", {
      exact: true,
    }),
  ).toBeVisible();
});

test("granted gyroscope rotates the same stable viewpoint without pointer gestures", async ({
  page,
}) => {
  await page.addInitScript(() => {
    class Sensor extends Event {
      static async requestPermission() {
        return "granted";
      }
    }
    window.DeviceOrientationEvent = Sensor;
  });
  await exposeJourney(page);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explorer le ciel", exact: true })
    .click();
  await page.waitForFunction(() => Boolean(window.__learningTest));
  await page.evaluate(() => {
    const journey = window.__learningTest;
    journey.setTravelling(false);
    for (let i = 0; i < 20; i++) journey.update(0.1);
    journey.enter("weight");
  });
  async function orient(alpha, beta) {
    await page.evaluate(
      ({ alpha, beta }) => {
        const event = new Event("deviceorientation");
        Object.defineProperties(event, {
          alpha: { value: alpha },
          beta: { value: beta },
          gamma: { value: 0 },
        });
        window.dispatchEvent(event);
      },
      { alpha, beta },
    );
  }
  await orient(0, 75);
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-gyroscope-status",
    "active",
  );
  const position = await page
    .locator("canvas")
    .getAttribute("data-camera-position");
  const orientation = await page
    .locator("canvas")
    .getAttribute("data-camera-orientation");
  await orient(35, 55);
  await expect
    .poll(() => page.locator("canvas").getAttribute("data-camera-orientation"))
    .not.toBe(orientation);
  expect(
    await page.locator("canvas").getAttribute("data-camera-position"),
  ).toBe(position);
});

test("all twelve original brush engines render and release their GPU resources", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/");
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error" && /WebGL|Shader|THREE/.test(m.text()))
      errors.push(m.text());
  });
  const r = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createAutomaticPainter } =
      await import("/src/learning/createAutomaticPainter.js");
    const { LEARNING_TOPICS } =
      await import("/src/learning/learningContent.js");
    const scene = new THREE.Scene(),
      renderer = new THREE.WebGLRenderer();
    renderer.setSize(96, 96);
    const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
    camera.position.set(0, 2, 8);
    camera.lookAt(0, 0, 0);
    const painter = createAutomaticPainter(scene, true),
      renders = [];
    const pose = {
      position: new THREE.Vector3(),
      direction: new THREE.Vector3(1, 0, 0),
      side: new THREE.Vector3(0, 0, 1),
      up: new THREE.Vector3(0, 1, 0),
    };
    for (const topic of LEARNING_TOPICS) {
      painter.activate(topic.id);
      for (let i = 0; i < 44; i++) {
        pose.position.set((i / 44 - 0.5) * 5, Math.sin(i * 0.1), 0);
        painter.update(0.1, pose, { energy: 0.3, low: 0.2, pulse: 0.15 });
      }
      renderer.render(scene, camera);
      renders.push(renderer.info.render.calls);
    }
    const textures = painter.stats.textures;
    painter.dispose();
    renderer.render(scene, camera);
    const after = { ...renderer.info.memory };
    renderer.dispose();
    renderer.forceContextLoss();
    return { renders, textures, after };
  });
  expect(r.renders).toHaveLength(12);
  expect(r.renders.every((x) => x > 0)).toBe(true);
  expect(r.textures).toBe(12);
  expect(r.after).toEqual({ geometries: 0, textures: 0 });
  expect(errors).toEqual([]);
});

test("an escale exports a real HD PNG while soundtrack failure remains non-blocking", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem(
      "oizo.poetic-learning.v1",
      JSON.stringify({
        version: 1,
        elapsed: 901,
        opened: { weight: [0, 1, 2] },
      }),
    );
  });
  await page.route("**/ambiances/gravity.mp3", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("checkbox", { name: /Activer le gyroscope/ }).uncheck();
  await page
    .getByRole("button", { name: "Poursuivre mon exploration" })
    .click();
  await page
    .getByRole("button", { name: "Une escale, ou poursuivre ?" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Un ciel, plusieurs façons de le regarder.",
    }),
  ).toBeVisible();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Emporter mon aquarelle · PNG HD" })
    .click();
  const download = await downloaded;
  await download.saveAs("/tmp/oizo-poetic-learning-hd.png");
  const { readFile } = await import("node:fs/promises");
  const png = await readFile("/tmp/oizo-poetic-learning-hd.png");
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  expect(Math.max(png.readUInt32BE(16), png.readUInt32BE(20))).toBe(1920);
  await page.getByRole("button", { name: "Poursuivre le voyage" }).click();
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-learning-mode",
    "EXPLORE",
  );
});
