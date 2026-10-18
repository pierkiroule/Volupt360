import { test, expect } from "@playwright/test";

test("bubble 15 prepares silently, resumes into a tit's shared flight, then frees its resources", async ({
  page,
}) => {
  await page.goto("/");
  const r = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createNarrativeEventManager } =
      await import("/src/narrative/createNarrativeEventManager.js");
    const manager = createNarrativeEventManager();
    const ctx = {
      position: new THREE.Vector3(),
      direction: new THREE.Vector3(0, 0, 1),
      side: new THREE.Vector3(-1, 0, 0),
      up: new THREE.Vector3(0, 1, 0),
      paintAnchor: new THREE.Vector3(),
    };
    const prepared = manager.prepare("resonance-15"),
      before = { ...manager.stats };
    const started = manager.resume(ctx),
      initial = { ...manager.stats };
    const positions = [];
    for (let i = 0; i < 340; i++) {
      ctx.position.z += 0.15;
      manager.update(0.1, ctx);
      if (i === 60 || i === 180) {
        const bird = manager.group.getObjectByProperty("name", "");
        positions.push(
          manager.group.children[0]?.children[0]?.position.toArray(),
        );
      }
    }
    const ended = { ...manager.stats },
      children = manager.group.children.length;
    manager.dispose();
    return { prepared, before, started, initial, ended, children, positions };
  });
  expect(r.prepared).toBe(true);
  expect(r.before.active).toBe(0);
  expect(r.before.prepared).toBe("event-15");
  expect(r.started).toBe(true);
  expect(r.initial.companions).toBe(1);
  expect(r.positions[0]).not.toEqual(r.positions[1]);
  expect(r.ended.active).toBe(0);
  expect(r.ended.companions).toBe(0);
  expect(r.children).toBe(0);
});

test("actual contemplation prepares event 15 and only resuming reveals the companion while touch and music continue", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/src/sonoizo/createVocalBubbles.js", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        "  const group = new THREE.Group();",
        "  setTimeout(()=>collide(fragments[14].id), 1000);\n  const group = new THREE.Group();",
      ),
    });
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Prendre son envol" }).click();
  const canvas = page.locator("#stage canvas");
  await expect(
    page.getByRole("button", { name: "Reprendre le vol" }),
  ).toBeVisible();
  const during = JSON.parse(await canvas.getAttribute("data-narrative"));
  expect(during.prepared).toBe("event-15");
  expect(during.active).toBe(0);
  await page.getByRole("button", { name: "Reprendre le vol" }).click();
  await expect
    .poll(
      async () =>
        JSON.parse(await canvas.getAttribute("data-narrative")).companions,
    )
    .toBe(1);
  await page
    .getByRole("button", { name: "Ondulations de pigments", exact: true })
    .click();
  await page.mouse.move(165, 330);
  await page.mouse.down();
  await page.waitForTimeout(300);
  await page.mouse.up();
  expect(
    Number(await canvas.getAttribute("data-painted-samples")),
  ).toBeGreaterThan(0);
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-music-energy")))
    .toBeGreaterThan(0.001);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "/tmp/oizo-narrative-tit.png" });
  expect(errors).toEqual([]);
});

test("all 24 events render, finish naturally and release GPU allocations on mobile-sized WebGL", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const r = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { NARRATIVE_EVENTS } =
      await import("/src/narrative/narrativeEventConfig.js");
    const { createNarrativeEventManager } =
      await import("/src/narrative/createNarrativeEventManager.js");
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(96, 96);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#e5e2da");
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 200),
      counts = [],
      positions = [];
    for (const config of NARRATIVE_EVENTS) {
      const manager = createNarrativeEventManager();
      scene.add(manager.group);
      const ctx = {
        position: new THREE.Vector3(),
        direction: new THREE.Vector3(0, 0, 1),
        side: new THREE.Vector3(-1, 0, 0),
        up: new THREE.Vector3(0, 1, 0),
        paintAnchor: new THREE.Vector3(0, 0, 4),
        manual: false,
        acrobatic: false,
      };
      const accepted = manager.trigger(config.id, ctx);
      let peak = 0,
        peakObjects = 0;
      for (let i = 0; i < 400; i++) {
        if (i % 30 === 0) {
          camera.position.copy(ctx.position).add(new THREE.Vector3(0, 2, -11));
          camera.lookAt(ctx.position.x, ctx.position.y + 1, ctx.position.z + 3);
        }
        ctx.position.z += 0.04;
        manager.update(0.1, ctx);
        peak = Math.max(peak, manager.stats.active);
        peakObjects = Math.max(peakObjects, manager.group.children.length);
        if (i === 30 || i === 100 || i === 240) renderer.render(scene, camera);
      }
      counts.push({
        id: config.id,
        accepted,
        peak,
        peakObjects,
        active: manager.stats.active,
        persistent: manager.stats.persistent,
        effects: { ...manager.effects },
      });
      manager.dispose();
      renderer.render(scene, camera);
      positions.push({
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
      });
    }
    renderer.dispose();
    return { counts, positions };
  });
  expect(r.counts).toHaveLength(24);
  for (const result of r.counts) {
    expect(result.accepted, result.id).toBe(true);
    expect(result.peak, result.id).toBe(1);
    expect(result.active, result.id).toBe(0);
    expect(result.persistent, result.id).toBeLessThanOrEqual(1);
  }
  expect(r.positions.every((x) => x.geometries === 0 && x.textures === 0)).toBe(
    true,
  );
  expect(errors).toEqual([]);
});

test("overlapping events stay bounded and finish retains only lightweight landmarks", async ({
  page,
}) => {
  await page.goto("/");
  const r = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createNarrativeEventManager } =
      await import("/src/narrative/createNarrativeEventManager.js");
    const manager = createNarrativeEventManager();
    const ctx = {
      position: new THREE.Vector3(),
      direction: new THREE.Vector3(0, 0, 1),
      side: new THREE.Vector3(-1, 0, 0),
      up: new THREE.Vector3(0, 1, 0),
      paintAnchor: new THREE.Vector3(),
    };
    let maxActive = 0,
      maxCompanions = 0,
      maxPersistent = 0;
    for (let n = 1; n <= 24; n++) {
      manager.trigger(`event-${String(n).padStart(2, "0")}`, ctx);
      for (let i = 0; i < 60; i++) {
        manager.update(0.1, ctx);
        maxActive = Math.max(maxActive, manager.stats.active);
        maxCompanions = Math.max(maxCompanions, manager.stats.companions);
        maxPersistent = Math.max(maxPersistent, manager.stats.persistent);
      }
    }
    manager.finish();
    const final = { ...manager.stats };
    manager.clear();
    const cleared = { ...manager.stats };
    manager.dispose();
    return { maxActive, maxCompanions, maxPersistent, final, cleared };
  });
  expect(r.maxActive).toBeLessThanOrEqual(3);
  expect(r.maxCompanions).toBeLessThanOrEqual(2);
  expect(r.maxPersistent).toBeLessThanOrEqual(4);
  expect(r.final.active).toBe(0);
  expect(r.final.persistent).toBeLessThanOrEqual(4);
  expect(r.cleared.persistent).toBe(0);
  expect(r.cleared.active).toBe(0);
});

test("the optional refuge only perches on true proximity and releases immediately", async ({
  page,
}) => {
  await page.goto("/");
  const r = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createNarrativeEventManager } =
      await import("/src/narrative/createNarrativeEventManager.js");
    const manager = createNarrativeEventManager();
    const ctx = {
      position: new THREE.Vector3(),
      direction: new THREE.Vector3(0, 0, 1),
      side: new THREE.Vector3(-1, 0, 0),
      up: new THREE.Vector3(0, 1, 0),
      paintAnchor: new THREE.Vector3(),
      manual: false,
      acrobatic: false,
    };
    manager.trigger("event-06", ctx);
    for (let i = 0; i < 30; i++) manager.update(0.1, ctx);
    const far = manager.isPerched;
    ctx.position.copy(ctx.memory.branch.point);
    manager.update(0.1, ctx);
    const close = manager.isPerched,
      heldPosition = ctx.position.clone();
    manager.releasePerch();
    const released = manager.isPerched;
    const unchanged = heldPosition.equals(ctx.position);
    manager.dispose();
    return { far, close, released, unchanged };
  });
  expect(r).toEqual({
    far: false,
    close: true,
    released: false,
    unchanged: true,
  });
});

test("help resources remain accessible from welcome and inside a contemplation", async ({
  page,
}) => {
  await page.route("**/src/sonoizo/createVocalBubbles.js", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        "  const group = new THREE.Group();",
        "  window.__triggerNarrativeBubble = ()=>collide(fragments[0].id);\n  const group = new THREE.Group();",
      ),
    });
  });
  await page.goto("/");
  const help = page.getByRole("button", {
    name: "Ressources d’aide",
    exact: true,
  });
  await help.click();
  await expect(
    page.getByRole("link", { name: "3114", exact: true }),
  ).toHaveAttribute("href", "tel:3114");
  await page
    .getByRole("button", { name: "Fermer les ressources d’aide" })
    .click();
  await page.getByRole("button", { name: "Prendre son envol" }).click();
  await page.waitForFunction(
    () => typeof window.__triggerNarrativeBubble === "function",
  );
  await page.evaluate(() => window.__triggerNarrativeBubble());
  await expect(
    page.getByRole("button", { name: "Reprendre le vol" }),
  ).toBeVisible();
  await help.click();
  await expect(
    page.getByRole("link", { name: "112", exact: true }),
  ).toHaveAttribute("href", "tel:112");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(help).toBeFocused();
});

test("spirals and memory contrast affect actual pigment shaders without changing stored geometry", async ({
  page,
}) => {
  await page.goto("/");
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const r = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createBrushStroke, disposeMark } =
      await import("/src/engine/brushes.js");
    const stroke = createBrushStroke("voiles", {
      seed: 5,
      color: new THREE.Color("#396e9c"),
      dynamics: { materialMode: 1, width: 1.1, opacity: 0.8 },
    });
    for (let i = 0; i < 30; i++)
      stroke.append({
        position: new THREE.Vector3((i - 15) * 0.2, Math.sin(i * 0.2) * 0.6, 0),
        direction: new THREE.Vector3(1, 0, 0),
        side: new THREE.Vector3(0, 1, 0),
        up: new THREE.Vector3(0, 0, 1),
        time: i * 0.1,
        energy: 0.5,
        low: 0.3,
        density: 0.8,
      });
    stroke.finish();
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(128, 128);
    const target = new THREE.WebGLRenderTarget(128, 128);
    renderer.setRenderTarget(target);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#eee9de");
    scene.add(stroke.group);
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, 0);
    const materials = [];
    stroke.group.traverse((n) => {
      if (n.material?.uniforms) materials.push(n.material.uniforms);
    });
    const geometry =
        stroke.group.children[0].geometry.attributes.position.array,
      original = geometry.slice();
    const draw = (spiral, contrast) => {
      for (const u of materials) {
        u.uNarrativeSpiral.value = spiral;
        u.uNarrativeContrast.value = contrast;
        u.uNarrativeTime.value = 8;
        u.uWakeClock.value = 10000;
        u.uTime.value = 0;
      }
      renderer.render(scene, camera);
      const bytes = new Uint8Array(128 * 128 * 4);
      renderer.readRenderTargetPixels(target, 0, 0, 128, 128, bytes);
      return bytes;
    };
    const base = draw(0, 0),
      spiral = draw(1, 0),
      contrast = draw(0, 1);
    const difference = (a, b) =>
        a.reduce((n, v, i) => n + Math.abs(v - b[i]), 0),
      sum = (a) => a.reduce((n, v, i) => n + (i % 4 === 3 ? 0 : v), 0);
    const result = {
      swirl: difference(base, spiral),
      contrast: difference(base, contrast),
      darkened: sum(contrast) < sum(base),
      unchanged: original.every((v, i) => v === geometry[i]),
    };
    disposeMark(stroke.group);
    target.dispose();
    renderer.dispose();
    return result;
  });
  expect(r.swirl).toBeGreaterThan(0);
  expect(r.contrast).toBeGreaterThan(0);
  expect(r.darkened).toBe(true);
  expect(r.unchanged).toBe(true);
  expect(errors).toEqual([]);
});
