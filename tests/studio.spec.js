import { test, expect } from "@playwright/test";
async function start(page) {
  await page.goto("/?studio");
  await page.getByRole("button", { name: "Créer une œuvre" }).click();
  await expect(page.locator(".studio-drawing")).toHaveAttribute(
    "data-ready",
    "true",
  );
}
async function paint(page, y = 0.45) {
  const box = await page.locator(".studio-drawing").boundingBox();
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * y);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width * 0.7,
    box.y + box.height * (y + 0.1),
    { steps: 14 },
  );
  await page.mouse.up();
}

test("real drawing, hybrid material, undo/redo, local effect, save and restore", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await paint(page);
  await expect(page.locator("main")).toHaveAttribute("data-strokes", "1");
  await page.getByRole("button", { name: "Les douze brosses" }).click();
  await expect(page.getByRole("button", { name: /^Choisir / })).toHaveCount(12);
  await page
    .getByRole("button", { name: "Choisir Encre", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Brosse hybride" })
    .selectOption("branch");
  await page.getByRole("button", { name: "Fermer le panneau" }).click();
  await paint(page, 0.65);
  await expect(page.locator("main")).toHaveAttribute("data-strokes", "2");
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.locator("main")).toHaveAttribute("data-strokes", "1");
  await page.getByRole("button", { name: "Rétablir", exact: true }).click();
  await expect(page.locator("main")).toHaveAttribute("data-strokes", "2");
  await page.getByRole("button", { name: "Animer", exact: true }).click();
  await paint(page, 0.45);
  await expect(page.locator("main")).toHaveAttribute("data-effects", "1");
  await page.screenshot({ path: "/tmp/studio-animate.png" });
  await expect(page.getByRole("status")).toContainText("Enregistré");
  await page.reload();
  await page
    .getByRole("button", { name: "Reprendre mon dernier dessin" })
    .click();
  await expect(page.locator("main")).toHaveAttribute("data-strokes", "2");
  await expect(page.locator("main")).toHaveAttribute("data-effects", "1");
  await page.getByRole("button", { name: "Sauvegarder et exporter" }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exporter le projet JSON", exact: true })
    .click();
  const file = await download;
  const fs = await import("node:fs/promises");
  const json = JSON.parse(await fs.readFile(await file.path(), "utf8"));
  expect(json.version).toBe(1);
  expect(json.strokes[1].secondary).toBe("branch");
  expect(json.effects[0].targets.length).toBeGreaterThan(0);
  await page.getByLabel("Importer un fichier projet").setInputFiles({
    name: "invalide.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.locator("main")).toHaveAttribute("data-strokes", "2");
  await page.getByLabel("Importer un fichier projet").setInputFiles({
    name: "dessin.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(json)),
  });
  await expect(page.locator("main")).toHaveAttribute("data-strokes", "2");
  await expect(page.getByRole("alert")).toContainText("Projet importé");
  expect(errors).toEqual([]);
});

test("continuous depth transition, true 3D view, gyro, immersive return and PNG", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /WebGL|shader|THREE/i.test(m.text()))
      errors.push(m.text());
  });
  await page.addInitScript(() => {
    window.DeviceOrientationEvent.requestPermission = async () => "granted";
  });
  await start(page);
  await paint(page);
  await page.getByRole("button", { name: "Contempler", exact: true }).click();
  const canvas = page.locator(".studio-three canvas");
  await expect(canvas).toHaveAttribute("data-depth", "0.000");
  const depth = page.getByRole("slider", { name: "Profondeur" });
  await depth.fill("0.5");
  await expect(canvas).toHaveAttribute("data-depth", "0.500");
  await depth.fill("1");
  await expect(canvas).toHaveAttribute("data-depth", "1.000");
  await page.screenshot({ path: "/tmp/studio-sculpture.png" });
  await depth.fill("0");
  await expect(canvas).toHaveAttribute("data-depth", "0.000");
  await page
    .getByRole("button", { name: "Entrer dans l’œuvre", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-immersive", "true");
  await page.getByRole("button", { name: "Gyroscope", exact: true }).click();
  const send = (a) =>
    page.evaluate((a) => {
      const e = new Event("deviceorientation");
      Object.assign(e, { alpha: a, beta: 90, gamma: 0 });
      window.dispatchEvent(e);
    }, a);
  await send(0);
  const pos = await canvas.getAttribute("data-camera-position"),
    before = await canvas.getAttribute("data-camera-heading");
  await send(35);
  await expect
    .poll(() => canvas.getAttribute("data-camera-heading"))
    .not.toBe(before);
  await expect(canvas).toHaveAttribute("data-camera-position", pos);
  await page.getByRole("button", { name: "Retour à l’atelier" }).click();
  await expect(page.locator("main")).toHaveAttribute("data-strokes", "1");
  await page.getByRole("button", { name: "Sauvegarder et exporter" }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter PNG", exact: true }).click();
  const file = await downloaded;
  const fs = await import("node:fs/promises");
  const bytes = await fs.readFile(await file.path());
  expect(bytes.readUInt32BE(16)).toBe(1600);
  expect(bytes.readUInt32BE(20)).toBe(1200);
  expect(errors).toEqual([]);
});

test("all twelve renderers are distinct, seeded and reversible effects stay local", async ({
  page,
}) => {
  await page.goto("/?studio");
  const result = await page.evaluate(async () => {
    const { newProject, BRUSH_IDS } = await import("/src/studio/model.ts");
    const { drawStroke } = await import("/src/studio/Renderer2D.ts");
    const { paintEffect, motion } =
      await import("/src/studio/EffectBrushEngine.ts");
    const p = newProject(),
      base = {
        id: "a",
        points: [
          { x: 0.2, y: 0.4, time: 0, pressure: 0.5, speed: 1 },
          { x: 0.5, y: 0.6, time: 80, pressure: 0.8, speed: 2 },
          { x: 0.8, y: 0.4, time: 180, pressure: 0.5, speed: 1 },
        ],
        color: "#546e91",
        size: 35,
        opacity: 0.8,
        seed: 42,
        createdAt: 0,
        parameters: {},
      };
    const signatures = BRUSH_IDS.map((brush) => {
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 225;
      const ctx = canvas.getContext("2d");
      ctx.scale(0.25, 0.25);
      drawStroke(ctx, { ...base, brush });
      const data = ctx.getImageData(0, 0, 300, 225).data;
      let hash = 2166136261,
        count = 0;
      for (let i = 0; i < data.length; i++) {
        hash = Math.imul(hash ^ data[i], 16777619);
        if (i % 4 === 3 && data[i]) count++;
      }
      return { hash, count };
    });
    const stroke = { ...base, brush: "ink" };
    p.strokes = [
      stroke,
      {
        ...stroke,
        id: "b",
        points: stroke.points.map((q) => ({ ...q, y: 0.9 })),
      },
    ];
    const copy = JSON.stringify(p.strokes);
    const effect = paintEffect(
      p,
      "wave",
      [{ x: 0.5, y: 0.6 }],
      { intensity: 0.7, speed: 0.8, radius: 0.12, duration: 0 },
      0,
    );
    const affected = motion([effect], stroke, 1, 600, 540, 3),
      unaffected = motion([effect], p.strokes[1], 1, 600, 810, 3);
    for (let t = 0; t < 100; t++) motion([effect], stroke, 1, 600, 540, t);
    const original = motion([], stroke, 1, 600, 540, 3);
    return {
      unique: new Set(signatures.map((s) => s.hash)).size,
      visible: signatures.every((s) => s.count > 30),
      targets: effect.targets,
      affected,
      unaffected,
      original,
      immutable: copy === JSON.stringify(p.strokes),
    };
  });
  expect(result.unique).toBe(12);
  expect(result.visible).toBe(true);
  expect(result.targets).toEqual(["a"]);
  expect(result.affected.x).not.toBe(600);
  expect(result.unaffected.x).toBe(600);
  expect(result.original.x).toBe(600);
  expect(result.original.y).toBe(540);
  expect(result.immutable).toBe(true);
});

test("project validation, partial eraser and original-space transduction round-trip", async ({
  page,
}) => {
  await page.goto("/?studio");
  const result = await page.evaluate(async () => {
    const { newProject, validateProject } =
      await import("/src/studio/model.ts");
    const { erase } = await import("/src/studio/DrawingEngine.ts");
    const { transduce, TransductionEngine } =
      await import("/src/studio/TransductionEngine.ts");
    const p = newProject();
    p.strokes = [
      {
        id: "a",
        brush: "ink",
        points: Array.from({ length: 21 }, (_, i) => ({
          x: 0.2 + i * 0.03,
          y: 0.5,
          time: i * 20,
          pressure: 0.6,
          speed: 1,
        })),
        color: "#546e91",
        size: 20,
        opacity: 0.7,
        seed: 3,
        createdAt: 0,
        parameters: {},
      },
    ];
    const cut = erase(p, [{ x: 0.5, y: 0.5 }], 0.07);
    const valid = validateProject(JSON.parse(JSON.stringify(p)));
    let rejected = false;
    try {
      validateProject({
        ...p,
        strokes: [{ ...p.strokes[0], color: "url(evil)" }],
      });
    } catch {
      rejected = true;
    }
    const engine = new TransductionEngine(p, true);
    engine.update(p, 0, 0, false);
    const geometry = engine.group.children.find((o) => o.isMesh).geometry,
      array = geometry.attributes.position.array,
      flat = Array.from(array);
    engine.update(p, 3, 1, false);
    const spatial = Array.from(array);
    engine.update(p, 3, 0, true);
    const reset = Array.from(array);
    const stable = array === geometry.attributes.position.array;
    let disposed = 0;
    geometry.addEventListener("dispose", () => disposed++);
    engine.dispose();
    return {
      valid: valid.strokes.length,
      segments: cut.strokes.length,
      rejected,
      flat: transduce(600, 450, 0),
      different: flat.some((v, i) => Math.abs(v - spatial[i]) > 0.01),
      reset: flat.every((v, i) => v === reset[i]),
      stable,
      disposed,
    };
  });
  expect(result).toMatchObject({
    valid: 1,
    segments: 2,
    rejected: true,
    flat: { x: 0, y: 0, z: 0 },
    different: true,
    reset: true,
    stable: true,
    disposed: 1,
  });
});

test("mobile touch, second finger cancels drawing, and reduced motion stays paused", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await start(page);
  const session = await context.newCDPSession(page);
  const box = await page.locator(".studio-drawing").boundingBox(),
    x = box.x + box.width * 0.4,
    y = box.y + box.height * 0.5;
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y, id: 1 }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: x + 40, y: y + 15, id: 1 }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.locator("main")).toHaveAttribute("data-strokes", "1");
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y, id: 1 }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x, y, id: 1 },
      { x: x + 50, y: y + 40, id: 2 },
    ],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.locator("main")).toHaveAttribute("data-strokes", "1");
  const canvas = page.locator(".studio-drawing"),
    time = await canvas.getAttribute("data-time");
  await page.waitForTimeout(150);
  await expect(canvas).toHaveAttribute("data-time", time);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/studio-mobile.png" });
  await context.close();
});

test("all effect grammars remain finite and local, duration ends and disabled means original", async ({
  page,
}) => {
  await page.goto("/?studio");
  const results = await page.evaluate(async () => {
    const { newProject, EFFECT_IDS } = await import("/src/studio/model.ts");
    const { paintEffect, motion } =
      await import("/src/studio/EffectBrushEngine.ts");
    const p = newProject();
    const s = {
      id: "one",
      brush: "ink",
      points: [
        { x: 0.5, y: 0.5, time: 0, pressure: 0.5, speed: 1 },
        { x: 0.6, y: 0.55, time: 10, pressure: 0.5, speed: 1 },
      ],
      color: "#789abc",
      size: 20,
      opacity: 0.7,
      seed: 12,
      createdAt: 0,
      parameters: {},
    };
    p.strokes = [s];
    return EFFECT_IDS.map((type) => {
      const e = paintEffect(
        p,
        type,
        [{ x: 0.5, y: 0.5 }],
        { intensity: 0.8, speed: 1, radius: 0.3, duration: 10 },
        0,
      );
      e.seed = 17;
      const alive = motion([e], s, 0, 600, 450, 2),
        expired = motion([e], s, 0, 600, 450, 11),
        off = motion([{ ...e, enabled: false }], s, 0, 600, 450, 2);
      return {
        type,
        finite: Object.values(alive).every(Number.isFinite),
        expired: expired.x === 600 && expired.y === 450 && expired.alpha === 1,
        off: off.x === 600 && off.y === 450 && off.alpha === 1,
      };
    });
  });
  expect(results).toHaveLength(12);
  expect(results.every((r) => r.finite && r.expired && r.off)).toBe(true);
});

test("native sound is voluntary, bounded, audible and cleaned after repeated starts", async ({
  page,
}) => {
  await start(page);
  await page
    .getByRole("button", { name: "Activer le son", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Couper le son" }),
  ).toHaveAttribute("aria-pressed", "true");
  const result = await page.evaluate(async () => {
    const { AudioEngine } = await import("/src/studio/AudioEngine.ts");
    const audio = new AudioEngine();
    const before = audio.diagnostics;
    await audio.enable(true);
    const ctx = audio.context,
      analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    audio.master.connect(analyser);
    audio.gesture("watercolor", 0.3, 0.5, 0.6);
    await new Promise((r) => setTimeout(r, 250));
    const data = new Float32Array(1024);
    analyser.getFloatTimeDomainData(data);
    const peak = Math.max(...data.map(Math.abs));
    const active = audio.diagnostics;
    audio.setPaused(true);
    const gain = audio.master.gain.value;
    await new Promise((r) => setTimeout(r, 1700));
    const after = audio.diagnostics;
    await audio.enable(false);
    await audio.enable(true);
    audio.dispose();
    analyser.disconnect();
    return { before, active, after, closed: audio.diagnostics, peak, gain };
  });
  expect(result.before.state).toBe("closed");
  expect(result.peak).toBeGreaterThan(0.00001);
  expect(result.peak).toBeLessThan(0.99);
  expect(result.active.active).toBeLessThanOrEqual(8);
  expect(result.after.active).toBe(0);
  expect(result.closed).toMatchObject({ nodes: 0, active: 0, state: "closed" });
});

test("exports real animated WebM and a reset keeps an archived copy", async ({
  page,
}) => {
  await start(page);
  await paint(page);
  await page.getByRole("button", { name: "Animer", exact: true }).click();
  await paint(page);
  await page.getByRole("button", { name: "Sauvegarder et exporter" }).click();
  const videoButton = page.getByRole("button", {
    name: /Exporter l’animation WebM/,
  });
  test.skip(await videoButton.isDisabled(), "MediaRecorder WebM unavailable");
  const download = page.waitForEvent("download");
  await videoButton.click();
  const file = await download;
  const fs = await import("node:fs/promises");
  const data = await fs.readFile(await file.path());
  expect(data.length).toBeGreaterThan(1000);
  expect(data.subarray(0, 4).toString("hex")).toBe("1a45dfa3");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Réinitialiser cette œuvre" }).click();
  await expect(page.locator("main")).toHaveAttribute("data-strokes", "0");
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.locator("main")).toHaveAttribute("data-strokes", "1");
  const saved = await page.evaluate(async () => {
    const { ProjectStore } = await import("/src/studio/ProjectStore.ts");
    return (await ProjectStore.list()).map((p) => ({
      title: p.title,
      count: p.strokes.length,
    }));
  });
  expect(
    saved.some((p) => p.title.includes("avant effacement") && p.count === 1),
  ).toBe(true);
});

test("all spatial brush families render on WebGL and release GPU allocations", async ({
  page,
}) => {
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error" && /shader|WebGL|THREE/i.test(m.text()))
      errors.push(m.text());
  });
  await page.goto("/?studio");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/three/build/three.module.js");
    const { newProject, BRUSH_IDS } = await import("/src/studio/model.ts");
    const { TransductionEngine } =
      await import("/src/studio/TransductionEngine.ts");
    const p = newProject();
    p.strokes = BRUSH_IDS.map((brush, k) => ({
      id: "brush" + k,
      brush,
      points: Array.from({ length: 15 }, (_, i) => ({
        x: 0.12 + i * 0.05,
        y: 0.1 + k * 0.06 + Math.sin(i * 0.4) * 0.02,
        time: i * 20,
        pressure: 0.6,
        speed: 1,
      })),
      color: "#587c87",
      size: 28,
      opacity: 0.8,
      seed: 31,
      createdAt: 0,
      parameters: {},
    }));
    const engine = new TransductionEngine(p, true);
    engine.update(p, 3, 0.8, false);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(256, 192);
    renderer.setClearColor("#f5f0e5");
    const target = new THREE.WebGLRenderTarget(256, 192);
    renderer.setRenderTarget(target);
    const scene = new THREE.Scene();
    scene.add(engine.group);
    const camera = new THREE.PerspectiveCamera(44, 256 / 192, 0.1, 80);
    camera.position.z = 19;
    renderer.render(scene, camera);
    const before = { ...renderer.info.memory },
      calls = renderer.info.render.calls;
    const pixels = new Uint8Array(256 * 192 * 4);
    renderer.readRenderTargetPixels(target, 0, 0, 256, 192, pixels);
    const variety = new Set();
    for (let i = 0; i < pixels.length; i += 4)
      variety.add(pixels[i] + "," + pixels[i + 1] + "," + pixels[i + 2]);
    engine.dispose();
    const after = { ...renderer.info.memory };
    target.dispose();
    renderer.dispose();
    return {
      before,
      after,
      calls,
      variety: variety.size,
      empty: engine.group.children.length,
    };
  });
  expect(result.variety).toBeGreaterThan(50);
  expect(result.calls).toBeLessThan(60);
  expect(result.after.geometries).toBe(0);
  expect(result.after.textures).toBeLessThanOrEqual(1);
  expect(result.empty).toBe(0);
  expect(errors).toEqual([]);
});
