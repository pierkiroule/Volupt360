import { test, expect } from "@playwright/test";

test("six-minute active session finishes the washes, then completes its eight-second departure exactly once", async ({
  page,
}) => {
  await page.goto("/");
  const r = await page.evaluate(async () => {
    const { createChillSession } =
      await import("/src/chill/createChillSession.js");
    let completions = 0;
    const progress = [];
    const s = createChillSession({
      onProgress: (x) => progress.push(x),
      onComplete: () => completions++,
    });
    s.update(359);
    const before = s.progress;
    s.update(1);
    const departing = s.departing,
      night = s.progress;
    s.update(8);
    s.update(30);
    return {
      before,
      departing,
      night,
      complete: s.complete,
      elapsed: s.elapsed,
      completions,
      last: progress.at(-1),
    };
  });
  expect(r.before).toBeLessThan(1);
  expect(r.departing).toBe(true);
  expect(r.night).toBe(1);
  expect(r.complete).toBe(true);
  expect(r.elapsed).toBe(368);
  expect(r.completions).toBe(1);
  expect(r.last).toBe(368);
});

test("mobile chill starts one universe with six brushes, two views, immediate paint and a real pause", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "L’Oizo de l’Haïkuarelle Virtuelle",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Prendre son envol" }).click();
  const canvas = page.locator("#stage canvas");
  await expect(canvas).toHaveAttribute("data-oizo-visible", "true");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-music-energy")))
    .toBeGreaterThan(0.01);
  await expect(
    page.getByRole("navigation", { name: "Vues caméra" }).getByRole("button"),
  ).toHaveCount(2);
  await expect(
    page.getByRole("group", { name: "Choisir une brosse" }).getByRole("button"),
  ).toHaveCount(6);
  await expect(
    page.getByRole("button", { name: /photo|capture|globale/i }),
  ).toHaveCount(0);
  for (const brush of [
    "Lavis aérien",
    "Pigment sec",
    "Encre fine",
    "Éclats d’encre",
    "Encre diluée",
    "Empreintes",
  ]) {
    await page.getByRole("button", { name: brush, exact: true }).click();
    await page.mouse.move(150, 340);
    await page.mouse.down();
    await expect(canvas).toHaveAttribute("data-nozzle-paint", "true");
    await page.waitForTimeout(150);
    await page.mouse.up();
  }
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-mark-count")))
    .toBeGreaterThan(5);
  await page.getByRole("button", { name: "Faire une pause" }).click();
  const time = await canvas.getAttribute("data-life-time");
  await page.waitForTimeout(300);
  expect(await canvas.getAttribute("data-life-time")).toBe(time);
  await page.getByRole("button", { name: "Reprendre", exact: true }).click();
  await page.getByRole("button", { name: "Gyro 360°" }).click();
  await expect(canvas).toHaveAttribute("data-camera-mode", "gyro");
  await page.getByRole("button", { name: "FPV", exact: true }).click();
  await page.screenshot({ path: "/tmp/oizo-chill.png" });
  expect(errors).toEqual([]);
});

test("completed journey opens global artwork and offers a downloadable PNG souvenir", async ({
  page,
}) => {
  // Accelerate only the session clock module; production retains 360 + 8 seconds.
  await page.route("**/src/chill/experienceTimeline.js", async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    await route.fulfill({
      response,
      body: source
        .replace("EXPERIENCE_SECONDS = 360", "EXPERIENCE_SECONDS = 3")
        .replace("FINALE_SECONDS = 8", "FINALE_SECONDS = 1"),
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Prendre son envol" }).click();
  await page.mouse.move(400, 350);
  await page.mouse.down();
  await page.waitForTimeout(300);
  await page.mouse.up();
  await expect(
    page.getByRole("heading", { name: "Votre paysage se dépose" }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page.locator("#stage canvas")).toHaveAttribute(
    "data-camera-mode",
    "global",
  );
  await page.screenshot({ path: "/tmp/oizo-chill-night.png" });
  await page
    .getByRole("button", { name: "Préparer ma photo souvenir" })
    .click();
  await expect(
    page.getByRole("link", { name: "Télécharger la photo PNG HD" }),
  ).toHaveAttribute("href", /^blob:/);
  const image = await page
    .getByRole("link", { name: "Télécharger la photo PNG HD" })
    .evaluate(async (link) => {
      const blob = await (await fetch(link.href)).blob();
      const bitmap = await createImageBitmap(blob);
      const result = {
        width: bitmap.width,
        height: bitmap.height,
        type: blob.type,
      };
      bitmap.close();
      return result;
    });
  expect(image.type).toBe("image/png");
  expect(Math.max(image.width, image.height)).toBe(1920);
  expect(errors).toEqual([]);
});

test("particle trails stay bounded and visibly respond to musical energy", async ({
  page,
}) => {
  await page.goto("/");
  const r = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createChillTrails } =
      await import("/src/chill/createChillTrails.js");
    const trails = createChillTrails(true),
      renderer = new THREE.WebGLRenderer(),
      scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100),
      target = new THREE.WebGLRenderTarget(96, 96);
    renderer.setSize(96, 96);
    renderer.setRenderTarget(target);
    camera.position.z = 8;
    scene.add(trails.object);
    for (let i = 0; i < 6; i++)
      trails.emit(
        new THREE.Vector3((i - 2.5) * 0.3, 0, 0),
        new THREE.Color("#c7d8ef"),
        i,
      );
    trails.update(0.8, 1, { energy: 0 });
    renderer.render(scene, camera);
    const quiet = new Uint8Array(96 * 96 * 4);
    renderer.readRenderTargetPixels(target, 0, 0, 96, 96, quiet);
    trails.update(0, 1, { energy: 1 });
    renderer.render(scene, camera);
    const loud = new Uint8Array(96 * 96 * 4);
    renderer.readRenderTargetPixels(target, 0, 0, 96, 96, loud);
    let difference = 0;
    for (let i = 0; i < quiet.length; i++)
      difference += Math.abs(quiet[i] - loud[i]);
    const before = trails.object.geometry.attributes.position.count;
    for (let i = 0; i < 5000; i++)
      trails.emit(new THREE.Vector3(), new THREE.Color("#abc"), i % 6);
    const after = trails.object.geometry.attributes.position.count;
    trails.dispose();
    target.dispose();
    renderer.dispose();
    return { before, after, difference };
  });
  expect(r.before).toBe(640);
  expect(r.after).toBe(640);
  expect(r.difference).toBeGreaterThan(0);
});
