import { test, expect } from "@playwright/test";

test("24 autonomous story fragments echo through recurring motifs without a fixed order", async ({
  page,
}) => {
  await page.goto("/?conte=1");
  const r = await page.evaluate(async () => {
    const { OIZOBUL_STORY } = await import("/src/chill/oizobulStory.js");
    return {
      count: OIZOBUL_STORY.length,
      ids: OIZOBUL_STORY.map((t) => t.id),
      valid: OIZOBUL_STORY.every(
        (t) =>
          t.title &&
          t.brushId &&
          t.text.includes("Oizobul") &&
          t.text.length > 120 &&
          t.text.length < 480,
      ),
      blueWindows: OIZOBUL_STORY.filter((t) => /fenêtre/.test(t.text)).length,
      branches: OIZOBUL_STORY.filter((t) => /branche/.test(t.text)).length,
    };
  });
  expect(r.count).toBe(24);
  expect(new Set(r.ids).size).toBe(24);
  expect(r.valid).toBe(true);
  expect(r.blueWindows).toBeGreaterThan(6);
  expect(r.branches).toBeGreaterThan(6);
});

test("all spheres are initially available; visited spheres dim, remain, and stop attracting the autopilot", async ({
  page,
}) => {
  await page.goto("/?conte=1");
  const r = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createVocalBubbles } =
      await import("/src/sonoizo/createVocalBubbles.js");
    const hits = [];
    const bubbles = createVocalBubbles({
      fragments: Array.from({ length: 24 }, (_, i) => ({
        id: "resonance-" + (i + 1),
      })),
      constellation: true,
      staged: true,
      watercolor: true,
      emergence: {},
      collide: (id) => {
        hits.push(id);
        return true;
      },
    });
    const pose = {
      position: new THREE.Vector3(6, 0, 0),
      direction: new THREE.Vector3(1, 0, 0),
    };
    bubbles.update(0, pose, false);
    const before = bubbles.states,
      geometry = bubbles.group.children[0].geometry;
    pose.position.set(12, 0, 0);
    bubbles.update(0.01, pose, true);
    await new Promise((r) => setTimeout(r, 0));
    bubbles.resume();
    bubbles.update(0.1, pose, true);
    const visited = bubbles.states.find((t) => t.id === "resonance-1");
    const retained = bubbles.group.children.length;
    const target = new THREE.Vector3();
    const found = bubbles.getNearest(pose.position, target);
    const material = bubbles.group.children[0].material.uniforms;
    const result = {
      initial: before.every((t) => t.visible && !t.visited),
      hits,
      visited,
      retained,
      dimmed: material.visited.value,
      found,
      distance: target.distanceTo(pose.position),
      shared: bubbles.group.children.every((m) => m.geometry === geometry),
    };
    bubbles.dispose();
    return result;
  });
  expect(r.initial).toBe(true);
  expect(r.shared).toBe(true);
  expect(r.hits).toEqual(["resonance-1"]);
  expect(r.visited).toMatchObject({ visible: true, visited: true });
  expect(r.dimmed).toBe(1);
  expect(r.retained).toBe(24);
  expect(r.found).toBe(true);
  expect(r.distance).toBeGreaterThan(2);
});

async function start(page) {
  await page.goto("/?conte=1");
  await page.getByRole("checkbox").uncheck();
  await page.getByRole("button", { name: "Prendre son envol" }).click();
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-constellation",
    "true",
  );
}
async function exposeCollision(page) {
  await page.route(
    /\/src\/sonoizo\/createVocalBubbles\.js(?:\?.*)?$/,
    async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body: (await response.text()).replace(
          "  const group = new THREE.Group();",
          "  window.__storyCollision = id=>collide(id);\n  const group = new THREE.Group();",
        ),
      });
    },
  );
}

test("no manual menus or paint before a visit, even when touching; all 24 nodes are ready", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await expect(
    page.getByRole("group", { name: "Choisir une brosse" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("group", { name: "Acrobaties peintes" }),
  ).toHaveCount(0);
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-active-resonance-bubbles",
    "24",
  );
  await expect(page.locator("canvas")).toHaveAttribute("data-active-brush", "");
  await page.mouse.move(190, 400);
  await page.mouse.down();
  await page.mouse.move(240, 350, { steps: 8 });
  await page.mouse.up();
  expect(
    Number(await page.locator("canvas").getAttribute("data-painted-samples")),
  ).toBe(0);
  expect(errors).toEqual([]);
});

test("a fragment remains readable and its brush paints from the wings without touching after leaving", async ({
  page,
}) => {
  await exposeCollision(page);
  await start(page);
  await page.waitForFunction(
    () => typeof window.__storyCollision === "function",
  );
  await page.evaluate(() => window.__storyCollision("resonance-1"));
  await expect(
    page.getByRole("heading", { name: "La plume-fenêtre" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reprendre le vol" }),
  ).toBeVisible();
  // Reading is not cut short by the historical five-second phrase timeout.
  await page.waitForTimeout(5200);
  await expect(page.locator(".resonance-phrase")).toHaveCSS("opacity", "1");
  await expect(
    page.getByRole("heading", { name: "La plume-fenêtre" }),
  ).toBeVisible();
  const before = Number(
    await page.locator("canvas").getAttribute("data-painted-samples"),
  );
  await page.getByRole("button", { name: "Reprendre le vol" }).click();
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-active-brush",
    "aurore",
  );
  await expect
    .poll(async () =>
      Number(await page.locator("canvas").getAttribute("data-painted-samples")),
    )
    .toBeGreaterThan(before + 6);
  await page.evaluate(() => window.__storyCollision("resonance-2"));
  await page.getByRole("button", { name: "Reprendre le vol" }).click();
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-active-brush",
    "voiles",
  );
  await page.screenshot({ path: "/tmp/oizobul-constellation.png" });
});

test("an idle surprise paints and touch immediately restores manual flight without stopping the automatic brush", async ({
  page,
}) => {
  await page.route(
    /\/src\/engine\/createSoundNest\.js(?:\?.*)?$/,
    async (route) => {
      const response = await route.fetch();
      const source = (await response.text())
        .replaceAll("nextSurprise = 24", "nextSurprise = 0.5")
        .replaceAll("lifeTime + 24", "lifeTime + 0.5")
        .replace("idleFlightClock > 4", "idleFlightClock > 0.1")
        .replace(
          "nearestBubble.distanceTo(navigation.position) > 7",
          "nearestBubble.distanceTo(navigation.position) > 0",
        );
      await route.fulfill({ response, body: source });
    },
  );
  await exposeCollision(page);
  await start(page);
  await page.waitForFunction(
    () => typeof window.__storyCollision === "function",
  );
  await page.evaluate(() => window.__storyCollision("resonance-1"));
  await page.getByRole("button", { name: "Reprendre le vol" }).click();
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-acrobatic", "loop");
  const before = Number(await canvas.getAttribute("data-painted-samples"));
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-painted-samples")))
    .toBeGreaterThan(before + 4);
  await page.mouse.move(400, 300);
  await page.mouse.down();
  await page.mouse.move(470, 300, { steps: 6 });
  await expect(canvas).toHaveAttribute("data-acrobatic", "none");
  await page.mouse.up();
  const released = Number(await canvas.getAttribute("data-painted-samples"));
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-painted-samples")))
    .toBeGreaterThan(released + 4);
});

test("constellation sphere geometry is shared and released after disposal", async ({
  page,
}) => {
  await page.goto("/?conte=1");
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error" && /WebGL|Shader|THREE/.test(m.text()))
      errors.push(m.text());
  });
  const r = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createVocalBubbles } =
      await import("/src/sonoizo/createVocalBubbles.js");
    const { OIZOBUL_STORY } = await import("/src/chill/oizobulStory.js");
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(64, 64);
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(90, 1, 0.1, 300);
    camera.position.set(32, 15, 36);
    camera.lookAt(0, 0, 0);
    const bubbles = createVocalBubbles({
      fragments: OIZOBUL_STORY,
      constellation: true,
      watercolor: true,
      collide: () => false,
    });
    scene.add(bubbles.group);
    bubbles.update(
      0.1,
      {
        position: new THREE.Vector3(28, 0, 0),
        direction: new THREE.Vector3(0, 0, 1),
      },
      false,
    );
    renderer.render(scene, camera);
    const before = { ...renderer.info.memory };
    bubbles.dispose();
    renderer.render(scene, camera);
    const after = { ...renderer.info.memory };
    renderer.dispose();
    renderer.forceContextLoss();
    return { before, after };
  });
  expect(r.before.geometries).toBe(1);
  expect(r.after.geometries).toBe(0);
  expect(r.after.textures).toBe(0);
  expect(errors).toEqual([]);
});
