import { test, expect } from "@playwright/test";
test("terrain, biomes and clustered placements are deterministic and bounded", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { composeLandscape } =
      await import("/src/landscape/LandscapeComposer.ts");
    const { DEFAULT_SETTINGS, BIOMES } =
      await import("/src/landscape/types.ts");
    const a = composeLandscape(DEFAULT_SETTINGS),
      b = composeLandscape(DEFAULT_SETTINGS);
    const scenes = Object.keys(BIOMES).map((biome) => {
      const world = composeLandscape({
        ...DEFAULT_SETTINGS,
        biome,
        density: 1,
      });
      return {
        biome,
        count: world.objects.length,
        kinds: [...new Set(world.objects.map((p) => p.kind))],
        finite: world.objects.every((p) =>
          [p.x, p.y, p.z, p.scale].every(Number.isFinite),
        ),
        slopes: world.objects
          .filter((p) => p.kind === "tree")
          .every((p) => p.slope <= 0.6),
        height: world.terrain.height(12, 4),
        clusters: new Set(world.objects.map((p) => p.cluster)).size,
      };
    });
    let minGap = Infinity;
    for (let i = 0; i < a.objects.length; i++)
      for (let j = i + 1; j < a.objects.length; j++)
        minGap = Math.min(
          minGap,
          Math.hypot(
            a.objects[i].x - a.objects[j].x,
            a.objects[i].z - a.objects[j].z,
          ),
        );
    return {
      same: JSON.stringify(a.objects) === JSON.stringify(b.objects),
      scenes,
      minGap,
    };
  });
  expect(result.same).toBe(true);
  expect(
    result.scenes.every(
      (s) =>
        s.count > 10 &&
        s.count <= 355 &&
        s.finite &&
        s.slopes &&
        s.clusters > 2,
    ),
  ).toBe(true);
  expect(result.scenes.find((s) => s.biome === "desert").kinds).not.toContain(
    "tree",
  );
  expect(new Set(result.scenes.map((s) => s.height)).size).toBe(5);
  expect(result.minGap).toBeGreaterThan(0.3);
});
test("offline assets do not block generation, flight, regeneration or local restore", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /WebGL|shader|GL_INVALID|THREE/i.test(m.text()))
      errors.push(m.text());
  });
  await page.route("https://api.polyhaven.com/**", (r) => r.abort());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Générer un paysage", exact: true })
    .click();
  await expect(page.locator("canvas")).toHaveAttribute("data-biome", "forest", {
    timeout: 20000,
  });
  await expect(page.locator(".landscape-source")).toContainText("procéduraux");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("landscape-composer.saved.v1")),
  );
  await page.getByRole("button", { name: "Explorer", exact: true }).click();
  await page.waitForTimeout(250);
  const p = await page.locator("canvas").getAttribute("data-position");
  await page.waitForTimeout(400);
  expect(await page.locator("canvas").getAttribute("data-position")).not.toBe(
    p,
  );
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.waitForTimeout(100);
  const frozen = await page.locator("canvas").getAttribute("data-position");
  await page.waitForTimeout(200);
  expect(await page.locator("canvas").getAttribute("data-position")).toBe(
    frozen,
  );
  await page.screenshot({ path: "test-results/landscape-composer-mobile.png" });
  await page.reload();
  await page
    .getByRole("button", {
      name: "Retrouver mon paysage enregistré",
      exact: true,
    })
    .click();
  await expect(page.locator("canvas")).toHaveAttribute("data-biome", "forest", {
    timeout: 20000,
  });
  await expect(page.locator(".landscape-title")).toContainText(
    String(stored.seed),
  );
  await page.getByRole("button", { name: "Réglages", exact: true }).click();
  await page.getByLabel("Biome", { exact: true }).selectOption("coast");
  await page.getByLabel("Atmosphère", { exact: true }).selectOption("dusk");
  await page.getByRole("button", { name: "Régénérer", exact: true }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-biome", "coast", {
    timeout: 20000,
  });
  expect(errors).toEqual([]);
});
test("GLTF dependency manifests are loaded from declared URLs and released (synthetic fixture)", async ({
  page,
}) => {
  const headers = { "access-control-allow-origin": "*" };
  const data = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  await page.route("https://api.polyhaven.com/**", async (r) => {
    const u = new URL(r.request().url());
    let value = {};
    if (u.pathname === "/assets" && u.searchParams.get("type") === "models")
      value = { test_rock: { name: "Test rock", categories: ["rock"] } };
    if (u.pathname === "/files/test_rock")
      value = {
        gltf: {
          "1k": {
            gltf: {
              url: "https://dl.polyhaven.org/test-fixtures/test.gltf",
              size: 1000,
              include: {
                "data.bin": {
                  url: "https://dl.polyhaven.org/test-fixtures/data.bin",
                  size: 36,
                },
              },
            },
          },
        },
      };
    await r.fulfill({
      contentType: "application/json",
      headers,
      body: JSON.stringify(value),
    });
  });
  await page.route("https://dl.polyhaven.org/test-fixtures/**", async (r) => {
    if (r.request().url().endsWith(".bin"))
      return r.fulfill({ headers, body: Buffer.from(data.buffer) });
    return r.fulfill({
      headers,
      contentType: "model/gltf+json",
      body: JSON.stringify({
        asset: { version: "2.0" },
        scene: 0,
        scenes: [{ nodes: [0] }],
        nodes: [{ mesh: 0 }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
        buffers: [{ uri: "data.bin", byteLength: 36 }],
        bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }],
        accessors: [
          {
            bufferView: 0,
            componentType: 5126,
            count: 3,
            type: "VEC3",
            min: [0, 0, 0],
            max: [1, 1, 0],
          },
        ],
      }),
    });
  });
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { AssetLibrary, inspectFiles } =
      await import("/src/landscape/AssetLibrary.ts");
    const library = new AssetLibrary();
    const model = await library.loadModel("test_rock");
    let meshes = 0,
      disposed = 0;
    model.scene.traverse((o) => {
      if (o.isMesh) {
        meshes++;
        o.geometry.addEventListener("dispose", () => disposed++);
      }
    });
    library.dispose();
    return {
      meshes,
      disposed,
      bad: inspectFiles({ x: { url: "https://evil.example/model.glb" } })
        .length,
    };
  });
  expect(result).toEqual({ meshes: 1, disposed: 1, bad: 0 });
});
test("all five biomes and four atmospheres render with a local asset budget", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /WebGL|shader|GL_INVALID|THREE/i.test(m.text()))
      errors.push(m.text());
  });
  await page.route("https://api.polyhaven.com/**", (r) => r.abort());
  await page.goto("/");
  for (const [i, biome] of [
    "forest",
    "mountain",
    "desert",
    "coast",
    "dream",
  ].entries()) {
    if (i)
      await page.getByRole("button", { name: "Réglages", exact: true }).click();
    await page.getByLabel("Biome", { exact: true }).selectOption(biome);
    await page
      .getByLabel("Atmosphère", { exact: true })
      .selectOption(["dawn", "day", "dusk", "night"][i % 4]);
    await page
      .getByRole("button", {
        name: i ? "Régénérer" : "Générer un paysage",
        exact: true,
      })
      .click();
    await expect(page.locator("canvas")).toHaveAttribute("data-biome", biome, {
      timeout: 20000,
    });
    const count = Number(
      await page.locator("canvas").getAttribute("data-objects"),
    );
    expect(count).toBeGreaterThan(10);
    expect(count).toBeLessThanOrEqual(355);
    await page.waitForTimeout(150);
  }
  expect(errors).toEqual([]);
});
test("exploration preserves the view chosen in orbit mode", async ({
  page,
}) => {
  await page.route("https://api.polyhaven.com/**", (r) => r.abort());
  await page.goto("/");
  await page
    .getByRole("button", { name: "Générer un paysage", exact: true })
    .click();
  await expect(page.locator("canvas")).toHaveAttribute("data-biome", "forest", {
    timeout: 20000,
  });
  await page.mouse.move(550, 250);
  await page.mouse.down();
  await page.mouse.move(680, 290, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  const before = (await page.locator("canvas").getAttribute("data-heading"))
    .split(",")
    .map(Number);
  await page.getByRole("button", { name: "Explorer", exact: true }).click();
  await page.waitForTimeout(150);
  const after = (await page.locator("canvas").getAttribute("data-heading"))
    .split(",")
    .map(Number);
  expect(
    Math.abs(before.reduce((sum, v, i) => sum + v * after[i], 0)),
  ).toBeGreaterThan(0.999);
});
