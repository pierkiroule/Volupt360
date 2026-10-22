import { test, expect } from "@playwright/test";
async function place(page, name, x, y) {
  await page.getByRole("button", { name, exact: true }).click();
  const b = await page.locator(".weather-disk").boundingBox();
  await page.mouse.click(b.x + b.width * x, b.y + b.height * y);
}
test("compose, adjust, move, undo and visit the same sky", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?meteo");
  await expect(
    page.getByRole("button", { name: "Entrer dans mon ciel ↗" }),
  ).toBeDisabled();
  await place(page, "Pluie", 0.32, 0.45);
  await place(page, "Rayonnement", 0.67, 0.4);
  await place(page, "Vent", 0.55, 0.7);
  await expect(page.locator("main")).toHaveAttribute("data-zones", "3");
  await page
    .getByRole("slider", { name: "Proportion", exact: true })
    .fill("0.4");
  await page.getByRole("slider", { name: "Opacité", exact: true }).fill("0.45");
  await expect(page.locator("output").last()).toHaveText("45 %");
  const b = await page.locator(".weather-disk").boundingBox();
  await page.mouse.move(b.x + b.width * 0.55, b.y + b.height * 0.7);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * 0.6, b.y + b.height * 0.6, {
    steps: 5,
  });
  await page.mouse.up();
  await page.getByRole("button", { name: "Retirer", exact: true }).click();
  await expect(page.locator("main")).toHaveAttribute("data-zones", "2");
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.locator("main")).toHaveAttribute("data-zones", "3");
  await page.getByRole("button", { name: "Entrer dans mon ciel ↗" }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-zones", "3");
  await expect(page.getByRole("button", { name: "Contempler", exact: true })).toBeVisible();
  await page.waitForTimeout(300);
  const before = await page.locator("canvas").getAttribute("data-position");
  await page.waitForTimeout(400);
  await expect.poll(() => page.locator("canvas").getAttribute("data-position")).not.toBe(before);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.waitForTimeout(100);
  const frozen = await page.locator("canvas").getAttribute("data-position");
  await page.waitForTimeout(250);
  expect(await page.locator("canvas").getAttribute("data-position")).toBe(
    frozen,
  );
  await page.screenshot({ path: "test-results/weather-3d.png" });
  await page.getByRole("button", { name: "← Disque", exact: true }).click();
  await expect(page.locator(".weather-disk")).toHaveAttribute(
    "data-zones",
    "3",
  );
  expect(errors).toEqual([]);
});
test("explicit local save, reload and mobile tools fit", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?meteo");
  await place(page, "Orage", 0.4, 0.4);
  await place(page, "Crépuscule", 0.7, 0.65);
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.locator(".meteo-notice")).toContainText("cet appareil");
  await page.reload();
  await expect(page.locator("main")).toHaveAttribute("data-zones", "2");
  expect(
    await page.evaluate(
      () => document.querySelector(".meteo").scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/weather-mobile.png" });
});
test("all weather materials stay finite and malformed saved data is rejected", async ({
  page,
}) => {
  await page.goto("/?meteo");
  const result = await page.evaluate(async () => {
    const m = await import("/src/weather/weatherModel.ts");
    localStorage.setItem(
      m.STORAGE_KEY,
      JSON.stringify({
        version: 1,
        zones: [
          {
            id: "bad",
            kind: "rain",
            x: 0,
            y: 0,
            size: 500,
            opacity: 1,
            seed: 1,
          },
        ],
      }),
    );
    return {
      saved: m.readSaved(),
      positions: m.WEATHER.map((w, i) =>
        m.skyPosition({
          id: String(i),
          kind: w.id,
          x: 0.3,
          y: 0.5,
          size: 0.2,
          opacity: 0.8,
          seed: i,
        }),
      ),
    };
  });
  expect(result.saved).toEqual([]);
  expect(result.positions.flat().every(Number.isFinite)).toBe(true);
  const directions = await page.evaluate(async () => {
    const m = await import("/src/weather/weatherModel.ts");
    const z = {
      id: "test",
      kind: "cloud",
      y: 0,
      size: 0.3,
      opacity: 0.8,
      seed: 1,
    };
    return [m.skyPosition({ ...z, x: 0 }), m.skyPosition({ ...z, x: 0.9 })];
  });
  expect(directions[0][2]).toBeLessThan(0);
  expect(directions[1][2]).toBeGreaterThan(0);
  for (const [index, name] of [
    "Rayonnement",
    "Nuages",
    "Pluie",
    "Orage",
    "Vent",
    "Brume",
    "Neige",
    "Crépuscule",
  ].entries()) {
    await place(
      page,
      name,
      0.2 + (index % 4) * 0.2,
      0.35 + Math.floor(index / 4) * 0.3,
    );
  }
  await page.getByRole("button", { name: "Entrer dans mon ciel ↗" }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-zones", "8");
});
test("imaginary weather compiles its watercolor shaders, pauses and preserves the scene", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /WebGL|shader|GL_INVALID|THREE/i.test(m.text()))
      errors.push(m.text());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?meteo");
  await place(page, "Aurore imaginaire", 0.28, 0.35);
  await place(page, "Pluie suspendue", 0.7, 0.38);
  await place(page, "Reflets irisés", 0.5, 0.72);
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  const textures = await page.evaluate(async () => {
    const m = await import("/src/weather/weatherModel.ts");
    const a = m.pigment(173, "#776396"),
      b = m.pigment(173, "#776396");
    const ca = a.getContext("2d").getImageData(0, 0, 256, 256).data,
      cb = b.getContext("2d").getImageData(0, 0, 256, 256).data;
    return {
      reproducible: ca.every((v, i) => v === cb[i]),
      alphas: new Set(Array.from(ca).filter((_, i) => i % 4 === 3)).size,
    };
  });
  expect(textures.reproducible).toBe(true);
  expect(textures.alphas).toBeGreaterThan(80);
  await page.getByRole("button", { name: "Entrer dans mon ciel ↗" }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-birds", "5");
  await expect(page.locator("canvas")).toHaveAttribute("data-zones", "3");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/weather-projective.png" });
  expect(errors).toEqual([]);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: "← Disque", exact: true }).click();
  await expect(page.locator(".weather-disk")).toHaveAttribute(
    "data-zones",
    "3",
  );
  await page.reload();
  await expect(page.locator("main")).toHaveAttribute("data-zones", "3");
});
test("watercolor ground renders and flight keeps clearance above hills", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /WebGL|shader|GL_INVALID|THREE/i.test(m.text()))
      errors.push(m.text());
  });
  await page.goto("/?meteo");
  await place(page, "Rayonnement", 0.5, 0.5);
  await place(page, "Pluie", 0.3, 0.4);
  await page.getByRole("button", { name: "Entrer dans mon ciel ↗" }).click();
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-landscape",
    "watercolor",
  );
  const ranges = await page.evaluate(async () => {
    const m = await import("/src/weather/WeatherLandscape.tsx");
    let min = Infinity,
      max = -Infinity;
    for (let x = -12; x <= 12; x += 0.5)
      for (let z = -12; z <= 12; z += 0.5) {
        const h = m.groundHeight(x, z);
        if (!Number.isFinite(h)) throw Error("nonfinite ground");
        min = Math.min(min, h);
        max = Math.max(max, h);
      }
    return {
      min,
      max,
      river: Array.from({ length: 12 }, (_, i) => m.riverCenter(i - 6)),
    };
  });
  expect(ranges.max - ranges.min).toBeGreaterThan(0.5);
  expect(ranges.river.every(Number.isFinite)).toBe(true);
  await page.mouse.move(600, 300);
  await page.mouse.down();
  await page.mouse.move(600, 430, { steps: 5 });
  await page.waitForTimeout(650);
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Contempler", exact: true })).toBeVisible();
  await page.waitForTimeout(600);
  const clearance = await page.evaluate(async () => {
    const m = await import("/src/weather/WeatherLandscape.tsx");
    const [x, y, z] = document
      .querySelector("canvas")
      .dataset.position.split(",")
      .map(Number);
    return y - m.groundHeight(x, z);
  });
  expect(clearance).toBeGreaterThanOrEqual(1.29);
  await page.screenshot({ path: "test-results/weather-ground.png" });
  expect(errors).toEqual([]);
});
test("tilted-phone gyro turns preserve a level horizon and fixed contemplation position", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "DeviceOrientationEvent", {
      configurable: true,
      value: class extends Event {
        static async requestPermission() {
          return "granted";
        }
      },
    });
  });
  await page.goto("/?meteo");
  await place(page, "Rayonnement", 0.5, 0.5);
  await page.getByRole("button", { name: "Entrer dans mon ciel ↗" }).click();
  await page.getByRole("button", { name: "Contempler", exact: true }).click();
  await page.getByRole("button", { name: "360°", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "360°", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(100);
  const pose = async (alpha, beta, gamma) =>
    page.evaluate(
      (p) => {
        const e = new Event("deviceorientation");
        Object.assign(e, p);
        window.dispatchEvent(e);
      },
      { alpha, beta, gamma },
    );
  const initialPosition = await page
    .locator("canvas")
    .getAttribute("data-position");
  await pose(20, 45, 25);
  await page.waitForTimeout(100);
  const before = await page.locator("canvas").getAttribute("data-heading");
  await pose(110, 45, 25);
  await page.waitForTimeout(450);
  const after = await page.locator("canvas").getAttribute("data-heading");
  expect(after).not.toBe(before);
  const roll = await page.evaluate(async () => {
    const { Euler, Quaternion } =
      await import("/node_modules/three/build/three.module.js");
    const values = document
      .querySelector("canvas")
      .dataset.heading.split(",")
      .map(Number);
    return new Euler().setFromQuaternion(new Quaternion(...values), "YXZ").z;
  });
  expect(Math.abs(roll)).toBeLessThan(0.001);
  expect(await page.locator("canvas").getAttribute("data-position")).toBe(
    initialPosition,
  );
  await pose(200, 70, -25);
  await page.waitForTimeout(300);
  const nextRoll = await page.evaluate(async () => {
    const { Euler, Quaternion } =
      await import("/node_modules/three/build/three.module.js");
    return new Euler().setFromQuaternion(
      new Quaternion(
        ...document
          .querySelector("canvas")
          .dataset.heading.split(",")
          .map(Number),
      ),
      "YXZ",
    ).z;
  });
  expect(Math.abs(nextRoll)).toBeLessThan(0.001);
});
test("horizon calibration remains finite across screen rotations, poles and heading wrap", async ({
  page,
}) => {
  await page.goto("/?meteo");
  const result = await page.evaluate(async () => {
    const { HorizonGyro, angleDelta } =
      await import("/src/weather/HorizonGyro.ts");
    const { deviceQuaternion } = await import("/src/scene/gyroOrientation.ts");
    const samples = [];
    for (const screen of [0, 90, 180, 270]) {
      const h = new HorizonGyro();
      for (const alpha of [350, 359, 1, 10, 80, 180]) {
        const p = h.update(deviceQuaternion(alpha, 45, 25, screen), 0.2, 0.1);
        samples.push({ yaw: p.yaw, pitch: p.pitch });
      }
      h.reset();
      for (const beta of [90, 30, 1, 0, -1, -30]) {
        const p = h.update(deviceQuaternion(20, beta, 0, screen), 0, 0);
        samples.push({ yaw: p.yaw, pitch: p.pitch });
      }
    }
    return { samples, wrap: angleDelta((-358 * Math.PI) / 180) };
  });
  expect(
    result.samples.every(
      (p) =>
        Number.isFinite(p.yaw) &&
        Number.isFinite(p.pitch) &&
        Math.abs(p.pitch) <= 1.15,
    ),
  ).toBe(true);
  expect(result.wrap).toBeCloseTo((2 * Math.PI) / 180, 6);
});
test("emoji skydomes are deterministic, seamless and react to the composition", async ({
  page,
}) => {
  await page.goto("/?meteo");
  const result = await page.evaluate(async () => {
    const m = await import("/src/weather/skydomeTexture.ts");
    const z = {
      id: "sky",
      kind: "sun",
      x: 0.1,
      y: -0.3,
      size: 0.35,
      opacity: 0.85,
      seed: 123,
    };
    const a = m.createSkyCanvas([z], 512),
      b = m.createSkyCanvas([z], 512),
      c = m.createSkyCanvas([{ ...z, kind: "storm" }], 512),
      d = m.createSkyCanvas([{ ...z, opacity: 0.15, size: 0.12 }], 512);
    const pixels = (canvas) =>
      canvas.getContext("2d").getImageData(0, 0, 512, 256).data;
    const p = pixels(a),
      q = pixels(b);
    let seams = true;
    for (let row = 0; row < 256; row++)
      for (let channel = 0; channel < 4; channel++)
        if (p[row * 512 * 4 + channel] !== p[(row * 512 + 511) * 4 + channel])
          seams = false;
    const hash = (canvas) => {
      let value = 2166136261;
      const bytes = pixels(canvas);
      for (let i = 0; i < bytes.length; i += 17)
        value = Math.imul(value ^ bytes[i], 16777619);
      return value >>> 0;
    };
    return {
      same: p.every((v, i) => v === q[i]),
      seams,
      hashes: [a, c, d].map(hash),
      base: m.skyPaperColor([]).getHexString(),
    };
  });
  expect(result.same).toBe(true);
  expect(result.seams).toBe(true);
  expect(new Set(result.hashes).size).toBe(3);
  expect(result.base).toBe("eff1ec");
});
test("generated skydome renders in 360 and its drift stops on pause", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /WebGL|shader|GL_INVALID|THREE/i.test(m.text()))
      errors.push(m.text());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?meteo");
  await place(page, "Aurore imaginaire", 0.4, 0.32);
  await place(page, "Crépuscule", 0.7, 0.6);
  await page.getByRole("button", { name: "Entrer dans mon ciel ↗" }).click();
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-skydome",
    "watercolor",
  );
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.waitForTimeout(100);
  const t = await page.locator("canvas").getAttribute("data-sky-time");
  await page.waitForTimeout(250);
  expect(await page.locator("canvas").getAttribute("data-sky-time")).toBe(t);
  await page.screenshot({ path: "test-results/weather-skydome.png" });
  expect(errors).toEqual([]);
});
