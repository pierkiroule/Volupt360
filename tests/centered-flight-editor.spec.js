import { test, expect } from "@playwright/test";

test("FPV drone keeps the moving bird within a gentle off-centre composition", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createCameraRig } = await import("/src/engine/createCameraRig.js");
    const camera = new THREE.PerspectiveCamera(86, 0.6, 0.08, 1000),
      canvas = document.createElement("canvas"),
      landscape = new THREE.Group();
    const state = {
      position: new THREE.Vector3(),
      direction: new THREE.Vector3(0, 0, 1),
      velocity: new THREE.Vector3(),
      bounds: { center: new THREE.Vector3(), radius: 20 },
      active: true,
      windEnabled: true,
      energy: 0.4,
      motion: 0,
    };
    const rig = createCameraRig(
      camera,
      canvas,
      landscape,
      () => state,
      () => {},
    );
    let error = 0,
      distance;
    for (let i = 0; i < 600; i++) {
      const t = i / 60;
      state.position.set(
        Math.sin(t * 0.5) * 18,
        Math.sin(t * 0.8) * 7,
        Math.cos(t * 0.5) * 18,
      );
      state.direction
        .set(Math.cos(t * 0.5), Math.cos(t * 0.8) * 0.6, -Math.sin(t * 0.5))
        .normalize();
      rig.update(1 / 60);
      camera.updateMatrixWorld();
      const projected = state.position.clone().project(camera);
      error = Math.max(error, Math.hypot(projected.x, projected.y));
      distance = camera.position.distanceTo(state.position);
    }
    const fov = camera.fov;
    await rig.setMode("global");
    rig.update(1 / 60);
    camera.updateMatrixWorld();
    const point = new THREE.Vector3(12, 12, 12).project(camera);
    rig.dispose();
    return {
      error,
      distance,
      fov,
      globalFits: Math.abs(point.x) < 1 && Math.abs(point.y) < 1,
    };
  });
  expect(result.error).toBeLessThan(0.2);
  expect(result.error).toBeGreaterThan(0.005);
  expect(result.distance).toBeGreaterThan(5);
  expect(result.fov).toBeGreaterThanOrEqual(86);
  expect(result.fov).toBeLessThanOrEqual(88);
  expect(result.globalFits).toBe(true);
});

test("global view rotates the live work and returns to the previous FPV or gyro view", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  const canvas = page.locator("#stage canvas"),
    toggle = page.getByRole("button", {
      name: "Vue globale 360°",
      exact: true,
    });
  await expect(
    page.getByRole("navigation", { name: "Zoom", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".landscape-palette button")).toHaveCount(6);
  for (const view of ["drone", "gyro"]) {
    if (view === "gyro")
      await page
        .getByRole("button", { name: "FPV 360° gyro", exact: true })
        .click();
    await toggle.click();
    await expect(canvas).toHaveAttribute("data-camera-mode", "global");
    await expect(canvas).toHaveAttribute("data-sculpture-paused", "false");
    const revision = Number(await canvas.getAttribute("data-flight-revision"));
    await page.mouse.move(140, 340);
    await page.mouse.down();
    await page.mouse.move(260, 420, { steps: 8 });
    await page.mouse.up();
    await expect
      .poll(async () =>
        Number(await canvas.getAttribute("data-flight-revision")),
      )
      .toBeGreaterThan(revision);
    await toggle.click();
    await expect(canvas).toHaveAttribute("data-camera-mode", view);
  }
});

test("long press opens brush editor, imports an alpha and keeps chosen settings", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  const brush = page.getByRole("button", { name: "Lavis", exact: true });
  async function open() {
    const box = await brush.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.mouse.up();
  }
  await open();
  await page.getByLabel("Couleur", { exact: true }).fill("#a53b57");
  await page.getByLabel("Taille", { exact: true }).fill("1.4");
  await page.getByLabel("Opacité", { exact: true }).fill("0.45");
  const base64 = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const x = c.getContext("2d");
    x.fillRect(8, 8, 16, 16);
    return c.toDataURL().split(",")[1];
  });
  await page.getByLabel("Texture alpha", { exact: true }).setInputFiles({
    name: "ink-alpha.png",
    mimeType: "image/png",
    buffer: Buffer.from(base64, "base64"),
  });
  await page.getByRole("button", { name: "Appliquer", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await open();
  await expect(page.getByLabel("Couleur", { exact: true })).toHaveValue(
    "#a53b57",
  );
  await expect(page.getByLabel("Taille", { exact: true })).toHaveValue("1.4");
  await expect(page.getByLabel("Opacité", { exact: true })).toHaveValue("0.45");
  await expect(page.getByRole("dialog")).toContainText("ink-alpha.png");
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await page.mouse.move(180, 350);
  await page.mouse.down();
  await expect(page.locator("#stage canvas")).toHaveAttribute(
    "data-nozzle-paint",
    "true",
  );
  await page.waitForTimeout(500);
  await page.mouse.up();
  await expect
    .poll(async () =>
      Number(
        await page
          .locator("#stage canvas")
          .getAttribute("data-painted-samples"),
      ),
    )
    .toBeGreaterThan(2);
  await page.screenshot({ path: "/tmp/centered-flight-editor.png" });
  expect(errors).toEqual([]);
});

test("alpha import preserves transparency and replaced masks survive only while painted marks use them", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { loadAlphaTexture } =
      await import("/src/engine/loadAlphaTexture.js");
    const { createWatercolorTexture } =
      await import("/src/engine/createWatercolorTexture.js");
    const { createSoundNest } = await import("/src/engine/createSoundNest.js");
    const { LANDSCAPE_BRUSHES } =
      await import("/src/materials/landscapePalette.js");
    async function image(transparent) {
      const c = document.createElement("canvas");
      c.width = c.height = 32;
      const x = c.getContext("2d");
      if (!transparent) {
        x.fillStyle = "white";
        x.fillRect(0, 0, 32, 32);
      }
      x.fillStyle = transparent ? "rgba(30,90,20,0.5)" : "black";
      x.fillRect(8, 8, 16, 16);
      return new File(
        [await new Promise((resolve) => c.toBlob(resolve, "image/png"))],
        "alpha.png",
        { type: "image/png" },
      );
    }
    const masks = [];
    for (const transparent of [true, false]) {
      const binding = await loadAlphaTexture(await image(transparent), 64);
      const pixels = binding.texture.image
        .getContext("2d")
        .getImageData(0, 0, 64, 64).data;
      masks.push({ center: pixels[(32 * 64 + 32) * 4 + 3], edge: pixels[3] });
      binding.texture.dispose();
    }
    const container = document.createElement("div");
    document.body.append(container);
    const engine = createSoundNest(container),
      profile = LANDSCAPE_BRUSHES[0];
    engine.setGeneratedBrush(profile.id, profile);
    const old = createWatercolorTexture({ color: profile.color }, 13, 64);
    let releases = 0;
    old.texture.addEventListener("dispose", () => releases++);
    engine.setBrushTexture(profile.id, old);
    let playing = true;
    engine.setPlayer(
      {
        getState: () => ({ playing }),
        getFeatures: () => ({
          rms: 0.1,
          energy: 0.7,
          low: 0.4,
          high: 0.3,
          flux: 0.1,
          freq: 1200,
        }),
      },
      () => {},
    );
    const limit = performance.now() + 2500;
    while (
      Number(container.querySelector("canvas").dataset.markCount || 0) < 1 &&
      performance.now() < limit
    )
      await new Promise((resolve) => setTimeout(resolve, 100));
    playing = false;
    await new Promise((resolve) => setTimeout(resolve, 450));
    const marks = Number(container.querySelector("canvas").dataset.markCount);
    await engine.updateBrush({ ...profile, color: "#a53b57" });
    const beforeReset = releases;
    engine.reset();
    const afterReset = releases;
    engine.dispose();
    container.remove();
    return { masks, marks, beforeReset, afterReset, afterDispose: releases };
  });
  expect(result.masks[0].center).toBeGreaterThan(120);
  expect(result.masks[0].center).toBeLessThan(135);
  expect(result.masks[0].edge).toBe(0);
  expect(result.masks[1]).toEqual({ center: 255, edge: 0 });
  expect(result.marks).toBeGreaterThan(0);
  expect(result.beforeReset).toBe(0);
  expect(result.afterReset).toBe(1);
  expect(result.afterDispose).toBe(1);
});

test("bird attitude follows climbs and dives and banks consistently into either turn", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createOizo } = await import("/src/sonoizo/createOizo.js");
    function fly(slope, yawRate) {
      const bird = createOizo(),
        direction = new THREE.Vector3(),
        right = new THREE.Vector3(),
        up = new THREE.Vector3(),
        side = new THREE.Vector3();
      const wings = [];
      bird.group.traverse((object) => {
        if (object.isSkinnedMesh) wings.push(object);
      });
      let maxStep = 0,
        previous;
      for (let i = 0; i < 360; i++) {
        const t = i / 60,
          horizontal = Math.sqrt(1 - slope * slope);
        direction.set(
          Math.sin(t * yawRate) * horizontal,
          slope,
          Math.cos(t * yawRate) * horizontal,
        );
        right.crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
        side.copy(right).negate();
        up.crossVectors(direction, right).normalize();
        bird.update({
          time: t,
          position: new THREE.Vector3(),
          direction,
          side,
          up,
        });
        const angles = wings.flatMap((w) =>
          w.skeleton.bones.flatMap((b) => [
            b.rotation.x,
            b.rotation.y,
            b.rotation.z,
          ]),
        );
        if (previous)
          maxStep = Math.max(
            maxStep,
            ...angles.map((a, index) => Math.abs(a - previous[index])),
          );
        previous = angles;
      }
      const facing = bird.group.getWorldDirection(new THREE.Vector3()).y,
        bank = bird.group.children[0].rotation.z,
        fold = Math.abs(wings[0].skeleton.bones[2].rotation.y);
      bird.dispose();
      return { facing, bank, fold, maxStep };
    }
    return {
      up: fly(0.65, 0),
      down: fly(-0.65, 0),
      right: fly(0, 0.45),
      left: fly(0, -0.45),
    };
  });
  expect(result.up.facing).toBeGreaterThan(0.6);
  expect(result.down.facing).toBeLessThan(-0.6);
  expect(result.down.fold).toBeGreaterThan(result.up.fold + 0.05);
  expect(result.right.bank).toBeLessThan(-0.2);
  expect(result.left.bank).toBeGreaterThan(0.2);
  for (const flight of Object.values(result))
    expect(flight.maxStep).toBeLessThan(0.07);
});
