import { test, expect } from "@playwright/test";

test("white watercolor workshop: hold paints, release stops, palette and both views work", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /WebGL|shader|THREE/.test(m.text()))
      errors.push(m.text());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Prendre son envol" }).click();
  const canvas = page.locator("canvas");
  await expect(
    page.getByRole("group", { name: "Choisir une brosse" }),
  ).toBeVisible();
  await expect(canvas).toHaveAttribute("data-mood-background", "#ffffff");
  await expect(
    page.getByRole("group", { name: "Choisir une brosse" }).getByRole("button"),
  ).toHaveCount(5);
  await expect(canvas).toHaveAttribute("data-constellation", "false");
  await expect(canvas).toHaveAttribute("data-painted-samples", "0");
  await page.mouse.move(195, 300);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(450);
  await expect(canvas).toHaveAttribute("data-painted-samples", "0");
  await page.mouse.down();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-painted-samples")))
    .toBeGreaterThan(3);
  await expect(canvas).toHaveAttribute("data-paint-emitter", "brush-tip");
  await expect(canvas).toHaveAttribute("data-paint-emitter-count", "1");
  await expect(canvas).toHaveAttribute("data-mark-count", "1");
  await page.mouse.move(245, 260, { steps: 8 });
  await page.mouse.up();
  await expect(canvas).toHaveAttribute("data-nozzle-paint", "false");
  // Let the existing brush bridge flush the final wing samples and diagnostics.
  await page.waitForTimeout(300);
  const count = await canvas.getAttribute("data-painted-samples");
  await page.waitForTimeout(700);
  await expect(canvas).toHaveAttribute("data-painted-samples", count);
  await page
    .getByRole("group", { name: "Choisir une brosse" })
    .getByRole("button")
    .first()
    .click();
  await expect(
    page
      .getByRole("group", { name: "Choisir une brosse" })
      .getByRole("button")
      .first(),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Contempler en gyro 360°" }).click();
  await expect(canvas).toHaveAttribute("data-camera-mode", "gyro");
  const orientation = await canvas.getAttribute("data-camera-orientation");
  await page.mouse.move(180, 250);
  await page.mouse.down();
  await page.mouse.move(290, 320, { steps: 10 });
  await page.mouse.up();
  await expect
    .poll(() => canvas.getAttribute("data-camera-orientation"))
    .not.toBe(orientation);
  await page.getByRole("button", { name: "Revenir en FPV" }).click();
  await expect(canvas).toHaveAttribute("data-camera-mode", "drone");
  await page.getByRole("button", { name: "Faire une pause" }).click();
  await page.mouse.move(195, 300);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.mouse.up();
  await expect(canvas).toHaveAttribute("data-painted-samples", count);
  await page.getByRole("button", { name: "Reprendre", exact: true }).click();
  await page.getByRole("button", { name: "Sortir", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Prendre son envol" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("brush tip follows the rig through turns and parent transforms", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createOizo } = await import("/src/sonoizo/createOizo.js");
    const bird = createOizo();
    bird.setPaintbrush(true);
    const parent = new THREE.Group();
    parent.position.set(4, -2, 7);
    parent.rotation.y = 0.7;
    parent.add(bird.group);
    const tip = bird.group.getObjectByName("brush-tip");
    const bristles = bird.group.getObjectByName("brush-bristles");
    const actual = new THREE.Vector3(),
      expected = new THREE.Vector3();
    let error = 0;
    for (let i = 0; i < 120; i++) {
      const direction = new THREE.Vector3(
        Math.sin(i * 0.03),
        Math.sin(i * 0.02) * 0.4,
        1,
      ).normalize();
      bird.update({
        time: i / 60,
        position: new THREE.Vector3(i * 0.02, 2, 4),
        direction,
        side: new THREE.Vector3(1, 0, 0),
        up: new THREE.Vector3(0, 1, 0),
        pilotX: 0.4,
        acoustic: { low: 0.2 },
      });
      bird.getBrushTipPosition(actual);
      // The cone apex is +height/2 on its local Y axis.
      bristles.localToWorld(expected.set(0, 0.14, 0));
      parent.worldToLocal(expected);
      error = Math.max(error, actual.distanceTo(expected));
    }
    const visible = bird.group.getObjectByName("winged-paintbrush").visible;
    const wings = ["left-wing", "right-wing"].every(
      (name) => bird.group.getObjectByName(name).isSkinnedMesh,
    );
    const offset = actual.distanceTo(bird.group.position);
    bird.dispose();
    return {
      error,
      visible,
      wings,
      offset,
      removed: parent.children.length === 0,
    };
  });
  expect(result.error).toBeLessThan(0.00001);
  expect(result.offset).toBeGreaterThan(0.8);
  expect(result.visible && result.wings && result.removed).toBe(true);
});

test("manual steering holds a stable heading despite camera feedback; release restores the orbit", async ({
  page,
}) => {
  await page.goto("/");
  const r = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createPointFlight } =
      await import("/src/engine/createPointFlight.js");
    function run(x, y, fps) {
      const f = createPointFlight();
      f.setSculptureAssist(true);
      f.setOrbitTarget(new THREE.Vector3(), 16);
      f.beginPilot();
      const frame = {
        right: new THREE.Vector3(-1, 0, 0),
        up: new THREE.Vector3(0, 1, 0),
      };
      let p, stable;
      for (let i = 0; i < fps * 12; i++) {
        if (p)
          frame.right
            .crossVectors(p.direction, new THREE.Vector3(0, 1, 0))
            .normalize();
        f.setPilot(x, y, frame);
        p = f.update(1 / fps, {});
        if (i === fps * 6) stable = p.direction.clone();
      }
      const heading = p.direction.clone(),
        alignment = stable.dot(p.direction);
      f.releasePilot();
      let maxStep = 0;
      for (let i = 0; i < fps * 360; i++) {
        const before = p.position.clone();
        p = f.update(1 / fps, {});
        maxStep = Math.max(maxStep, before.distanceTo(p.position));
      }
      return {
        heading: heading.toArray(),
        alignment,
        radius: p.position.length(),
        maxStep,
        autonomous: p.autonomous,
      };
    }
    return {
      right: run(0.65, 0, 60),
      left: run(-0.65, 0, 60),
      up: run(0, 0.65, 60),
      neutral: run(0, 0, 60),
      slow: run(0.65, 0, 30),
    };
  });
  expect(r.right.heading[0]).toBeLessThan(-0.3);
  expect(r.left.heading[0]).toBeGreaterThan(0.3);
  expect(r.up.heading[1]).toBeGreaterThan(0.25);
  expect(Math.abs(r.neutral.heading[0])).toBeLessThan(0.001);
  for (const p of Object.values(r)) {
    expect(p.alignment).toBeGreaterThan(0.9999);
    expect(p.radius).toBeLessThan(26);
    expect(p.maxStep).toBeLessThan(0.09);
    expect(p.autonomous).toBe(true);
  }
  expect(Math.abs(r.right.heading[0] - r.slow.heading[0])).toBeLessThan(0.001);
});

test("five brush families have distinct engines, colors and responsive pigment or particle materials", async ({
  page,
}) => {
  await page.goto("/");
  const r = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { WORKSHOP_BRUSHES } = await import("/src/chill/workshopBrushes.js");
    const { createBrushStroke } = await import("/src/engine/brushes.js");
    return WORKSHOP_BRUSHES.map((profile) => {
      const stroke = createBrushStroke(profile.baseId, {
        seed: profile.seed,
        color: new THREE.Color(profile.color),
        dynamics: profile,
      });
      for (let i = 0; i < 12; i++)
        stroke.append({
          position: new THREE.Vector3(i * 0.1, 0, 0),
          direction: new THREE.Vector3(1, 0, 0),
          side: new THREE.Vector3(0, 1, 0),
          up: new THREE.Vector3(0, 0, 1),
          time: i * 0.1,
          energy: 0.5,
          low: 0.4,
          motion: 0.2,
          accent: 0.3,
          wake: true,
          depositionTime: i * 0.1,
        });
      const materials = [];
      stroke.group.traverse((mesh) => {
        if (mesh.isMesh) materials.push(mesh.material);
      });
      const result = {
        id: profile.id,
        color: profile.color,
        engine: profile.baseId,
        count: materials.length,
        material:
          materials[0]?.uniforms.uMaterialMode?.value ??
          materials[0]?.uniforms.uPaintDots?.value,
        gain: profile.responseGain,
      };
      stroke.group.traverse((mesh) => {
        mesh.geometry?.dispose();
        mesh.material?.dispose();
      });
      return result;
    });
  });
  expect(r).toHaveLength(5);
  expect(new Set(r.map((p) => p.engine)).size).toBe(5);
  expect(new Set(r.map((p) => p.color)).size).toBe(5);
  for (const brush of r) {
    expect(brush.count).toBeGreaterThan(0);
    expect(brush.gain).toBeGreaterThan(2);
    expect(brush.material).toBeGreaterThan(0);
  }
});

test("gold particles archive into a shared frozen batch and release their resources", async ({
  page,
}) => {
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error" && /WebGL|shader|THREE/.test(m.text()))
      errors.push(m.text());
  });
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { WORKSHOP_BRUSHES } = await import("/src/chill/workshopBrushes.js");
    const { createBrushStroke, disposeMark } =
      await import("/src/engine/brushes.js");
    const { createPigmentArchive } =
      await import("/src/chill/createPigmentArchive.js");
    const profile = WORKSHOP_BRUSHES.find((p) => p.id === "lucioles");
    const archive = createPigmentArchive();
    for (let j = 0; j < 3; j++) {
      const stroke = createBrushStroke(profile.baseId, {
        seed: j,
        color: new THREE.Color(profile.color),
        dynamics: profile,
      });
      for (let i = 0; i < 15; i++)
        stroke.append({
          position: new THREE.Vector3(i * 0.1, j, 0),
          side: new THREE.Vector3(1, 0, 0),
          up: new THREE.Vector3(0, 1, 0),
          direction: new THREE.Vector3(0, 0, 1),
          energy: 0.5,
        });
      stroke.update(1, { energy: 0.5, low: 0.2, pulse: 0.3 });
      archive.add({
        stroke,
        object: stroke.group,
        brush: profile.id,
        bounds: new THREE.Box3(new THREE.Vector3(), new THREE.Vector3(3, 3, 3)),
      });
      disposeMark(stroke.group);
    }
    archive.settle();
    const data = archive.group.children[0].geometry.attributes;
    const finite = ["position", "aOffset", "aTint", "aBirth"].every((name) =>
      Array.from(data[name].array).every(Number.isFinite),
    );
    const stats = archive.stats;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#fff");
    scene.add(archive.group);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(100, 100);
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    let disposed = 0;
    archive.group.children[0].geometry.addEventListener(
      "dispose",
      () => disposed++,
    );
    archive.dispose();
    renderer.dispose();
    return { finite, stats, disposed };
  });
  expect(result.finite).toBe(true);
  expect(result.stats.traces).toBe(3);
  expect(result.stats.batches).toBe(1);
  expect(result.disposed).toBe(1);
  expect(errors).toEqual([]);
});
