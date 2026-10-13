import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

test("one available universe starts its imposed ambience and keeps twelve silent brush pads and swipe steering", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const nativePlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      return nativePlay.call(this).then(() => {
        if (!this.paused) window.__ambiencePlayed = true;
      });
    };
  });
  await page.goto("/?instrument=off");
  await expect(
    page.getByRole("heading", { name: "echohypnosis" }),
  ).toBeVisible();
  await expect(
    page.getByText("L’Oizo échohypnotique", { exact: true }),
  ).toBeVisible();
  const picker = page.getByRole("region", { name: "Choisir un univers" });
  await expect(picker.getByRole("button")).toHaveCount(3);
  await expect(
    picker.getByRole("button", { name: "Les Marées Entrer" }),
  ).toBeEnabled();
  await picker.getByRole("button", { name: "Le Souffle Entrer" }).click();
  await expect(picker).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => Boolean(window.__ambiencePlayed)))
    .toBe(true);
  const canvas = page.locator("#stage canvas");
  await expect(canvas).toHaveAttribute("data-vocal-fireflies", "0");
  await expect(canvas).toHaveAttribute("data-drone-distance", "0");
  await expect(page.locator(".twig-pad")).toHaveCount(6);
  await expect(
    page.locator('input[type="file"][accept="audio/*,.mp3"]'),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Sculpter avec Voiles", exact: true })
    .click();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-painted-samples")))
    .toBeGreaterThan(0);
  await page.mouse.move(120, 220);
  await page.mouse.down();
  await page.mouse.move(210, 150, { steps: 5 });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-steering-moves")))
    .toBeGreaterThan(0);
  const input = (await canvas.getAttribute("data-steering-input"))
    .split(",")
    .map(Number);
  expect(input[0]).toBeGreaterThan(0);
  expect(input[1]).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test("fixed anchors carry 24 vocal strings, with proximity vibrations and exclusive actual playback", async ({
  page,
}) => {
  await page.goto("/?instrument=off");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createVocalConstellation } =
      await import("/src/sonoizo/createVocalConstellation.js");
    const { createTwigBank } = await import("/src/sonoizo/createTwigBank.js");
    const { FIREFLY_FRAGMENTS } = await import("/src/sonoizo/poems.js");
    const bank = createTwigBank({ ids: ["voiles"] });
    bank.enableFireflies();
    await bank.loadPoems(FIREFLY_FRAGMENTS);
    await bank.preparePlayback();
    const field = createVocalConstellation({
      fragments: FIREFLY_FRAGMENTS,
      collide: (id) => bank.collide(id),
      getFeatures: () => bank.getVocalFeatures(),
    });
    const before = field.group.children
      .slice(0, 16)
      .map((dot) => dot.position.toArray());
    const midpoint = new THREE.Vector3()
      .addVectors(
        field.group.children[0].position,
        field.group.children[1].position,
      )
      .multiplyScalar(0.5);
    const pose = { position: midpoint };
    field.update(0.1, pose);
    await new Promise((resolve) => setTimeout(resolve, 30));
    field.update(0.1, pose);
    const second = await bank.collide("firefly-2");
    const after = field.group.children
      .slice(0, 16)
      .map((dot) => dot.position.toArray());
    const line = field.group.children.find((child) => child.isLine);
    const result = {
      before,
      after,
      lines: field.group.children.filter((child) => child.isLine).length,
      edges: field.group.children
        .filter((child) => child.isLine)
        .map((line) => line.userData.anchors),
      active: bank.getSnapshot().activeVocalId,
      second,
      collisions: field.collisionCount,
      vibrating:
        Math.abs(line.geometry.attributes.position.getX(8) - midpoint.x) >
          0.001 ||
        Math.abs(line.geometry.attributes.position.getZ(8) - midpoint.z) >
          0.001,
    };
    field.dispose();
    bank.dispose();
    return result;
  });
  expect(result.after).toEqual(result.before);
  expect(result.lines).toBe(24);
  expect(result.before).toHaveLength(16);
  const degrees = Array(16).fill(0),
    reached = new Set([0]);
  for (const [a, b] of result.edges) {
    expect(a).not.toBe(b);
    degrees[a]++;
    degrees[b]++;
  }
  expect(degrees).toEqual(Array(16).fill(3));
  expect(
    new Set(
      result.edges.map(([a, b]) => [a, b].sort((x, y) => x - y).join("-")),
    ).size,
  ).toBe(24);
  for (let i = 0; i < 16; i++)
    for (const [a, b] of result.edges)
      if (reached.has(a) || reached.has(b)) {
        reached.add(a);
        reached.add(b);
      }
  expect(reached.size).toBe(16);
  expect(result.active).toBe("firefly-1");
  expect(result.second).toBe(false);
  expect(result.collisions).toBe(1);
  expect(result.vibrating).toBe(true);
});

test("swipe steering influences continuous flight without replacing it or teleporting", async ({
  page,
}) => {
  await page.goto("/?instrument=off");
  const result = await page.evaluate(async () => {
    const { createSonoizoDance } = await import("/src/sonoizo/SonoizoDance.js");
    const normal = createSonoizoDance(),
      guided = createSonoizoDance();
    const start = guided.update(0.016, []);
    normal.update(0.016, []);
    guided.steer(0.2, 0.1);
    const next = guided.update(0.016, []);
    const firstStep = next.position.distanceTo(start.position);
    let a,
      b,
      maxStep = firstStep,
      previous = next.position.clone();
    normal.update(0.016, []);
    for (let i = 0; i < 300; i++) {
      a = guided.update(0.016, []);
      b = normal.update(0.016, []);
      maxStep = Math.max(maxStep, a.position.distanceTo(previous));
      previous.copy(a.position);
    }
    return {
      firstStep,
      maxStep,
      difference: a.position.distanceTo(b.position),
    };
  });
  expect(result.firstStep).toBeLessThan(0.3);
  expect(result.maxStep).toBeLessThan(0.5);
  expect(result.difference).toBeGreaterThan(0.5);
  expect(result.difference).toBeLessThan(16);
});

test.describe("mobile canvas", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test("a native swipe steers, photo still freezes and exports HD PNG", async ({
    page,
  }) => {
    await page.goto("/?instrument=off");
    await page.getByRole("button", { name: "Le Souffle Entrer" }).tap();
    const canvas = page.locator("#stage canvas");
    await expect(canvas).toHaveAttribute("data-vocal-fireflies", "0");
    await page.touchscreen.tap(195, 250);
    expect(await canvas.getAttribute("data-steering-moves")).toBeNull();
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: 195, y: 300 }],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 245, y: 240 }],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect
      .poll(async () =>
        Number(await canvas.getAttribute("data-steering-moves")),
      )
      .toBeGreaterThan(0);
    await page
      .getByRole("button", { name: "Sculpter avec Filaments", exact: true })
      .tap();
    await expect
      .poll(async () =>
        Number(await canvas.getAttribute("data-painted-samples")),
      )
      .toBeGreaterThan(0);
    await page.getByRole("button", { name: "Vue photo", exact: true }).tap();
    await expect(canvas).toHaveAttribute("data-sculpture-paused", "true");
    await page.waitForTimeout(350);
    const position = await canvas.getAttribute("data-painter-position");
    await page.waitForTimeout(200);
    await expect(canvas).toHaveAttribute("data-painter-position", position);
    await page
      .getByRole("button", { name: "Zoomer la photo", exact: true })
      .tap();
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Télécharger la photo · PNG HD" })
      .tap();
    const asset = await download;
    expect(asset.suggestedFilename()).toMatch(/\.png$/);
    const png = readFileSync(await asset.path());
    expect(Math.max(png.readUInt32BE(16), png.readUInt32BE(20))).toBe(2560);
    await page.getByRole("button", { name: "FPV drone", exact: true }).tap();
    await expect(canvas).toHaveAttribute("data-sculpture-paused", "false");
  });
});

test("a missing universe ambience is reported without blocking sculpture", async ({
  page,
}) => {
  await page.route("**/ambiances/ambiance01.mp3", (route) =>
    route.fulfill({ status: 404, body: "missing" }),
  );
  await page.goto("/?instrument=off");
  await page.getByRole("button", { name: "Le Souffle Entrer" }).click();
  await expect(page.locator(".universe-error")).toContainText(
    "ambiance01.mp3 manque",
  );
  await page
    .getByRole("button", { name: "Sculpter avec Voiles", exact: true })
    .click();
  await expect
    .poll(async () =>
      Number(
        await page
          .locator("#stage canvas")
          .getAttribute("data-painted-samples"),
      ),
    )
    .toBeGreaterThan(0);
});

test("relative steering turns right and left and climbs and descends", async ({
  page,
}) => {
  await page.goto("/?instrument=off");
  const projections = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createSonoizoDance } = await import("/src/sonoizo/SonoizoDance.js");
    return [
      [0.15, 0],
      [-0.15, 0],
      [0, 0.15],
      [0, -0.15],
    ].map(([x, y]) => {
      const guided = createSonoizoDance(),
        baseline = createSonoizoDance();
      const reference = baseline.update(0.016, []);
      guided.update(0.016, []);
      const camera = new THREE.PerspectiveCamera();
      camera.position
        .copy(reference.position)
        .addScaledVector(reference.direction, -10);
      camera.up.copy(reference.up);
      camera.lookAt(reference.position);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(
          camera.quaternion,
        ),
        up = reference.up.clone();
      guided.steer(x, y);
      let a, b;
      for (let i = 0; i < 30; i++) {
        a = guided.update(0.016, []);
        b = baseline.update(0.016, []);
      }
      const displacement = a.position.clone().sub(b.position);
      return {
        right: displacement.dot(right),
        up: displacement.dot(up),
        turn: a.direction.clone().sub(b.direction).dot(right),
      };
    });
  });
  expect(projections[0].right).toBeGreaterThan(0.1);
  expect(projections[0].turn).toBeGreaterThan(0);
  expect(projections[1].right).toBeLessThan(-0.1);
  expect(projections[1].turn).toBeLessThan(0);
  expect(projections[2].up).toBeGreaterThan(0.1);
  expect(projections[3].up).toBeLessThan(-0.1);
});

test("tiny motions are ignored and losing focus cancels a captured gesture", async ({
  page,
}) => {
  await page.goto("/?instrument=off");
  await page.getByRole("button", { name: "Le Souffle Entrer" }).click();
  const canvas = page.locator("#stage canvas");
  await expect(canvas).toHaveAttribute("data-drone-distance", "0");
  await page.mouse.move(200, 200);
  await page.mouse.down();
  await page.mouse.move(202, 201);
  expect(await canvas.getAttribute("data-steering-moves")).toBeNull();
  await page.mouse.move(230, 200);
  await expect(canvas).toHaveAttribute("data-steering-moves", "1");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.mouse.move(270, 170);
  await expect(canvas).toHaveAttribute("data-steering-moves", "1");
  await page.mouse.up();
});

test("discreet zoom remains visible with folded tools and changes distance in the right direction", async ({
  page,
}) => {
  await page.goto("/?instrument=off");
  await page.getByRole("button", { name: "Le Souffle Entrer" }).click();
  const zoom = page.getByRole("navigation", { name: "Zoom", exact: true });
  await expect(zoom).toBeVisible();
  const canvas = page.locator("#stage canvas");
  await expect(canvas).toHaveAttribute("data-drone-distance", "0");
  await expect(
    zoom.getByRole("button", { name: "Rapprocher la caméra" }),
  ).toBeDisabled();
  await zoom.getByRole("button", { name: "Éloigner la caméra" }).click();
  await expect(canvas).toHaveAttribute("data-drone-distance", "0.1");
  await zoom.getByRole("button", { name: "Rapprocher la caméra" }).click();
  await expect(canvas).toHaveAttribute("data-drone-distance", "0");

  await expect(
    page.getByRole("slider", { name: "Distance du drone" }),
  ).toHaveCount(0);
  await expect(zoom).toBeVisible();
});
