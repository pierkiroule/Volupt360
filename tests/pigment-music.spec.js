import { test, expect } from "@playwright/test";

test("real Pigment Drift GPU field keeps deposits, evolves in silence, freezes on pause and frees resources", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { PigmentMusic } = await import("/src/simple/PigmentMusic.ts");
    const p = new PigmentMusic();
    const silence = { energy: 0, low: 0, high: 0, onset: 0 };
    p.update(0.1, silence, false);
    const idle = p.inspect();
    p.setPalette(["warm", "water"]);
    for (let i = 0; i < 48; i++)
      p.update(
        1 / 12,
        { energy: 0.35, low: 0.5, high: 0.25, onset: 0.1 },
        false,
      );
    const active = p.inspect();
    const checksum = () => {
      const data = p.engine.save().data;
      return {
        sum: data.reduce((a, b) => a + b, 0),
        hash: data.reduce(
          (a, b) => Math.imul(a ^ b, 16777619) >>> 0,
          2166136261,
        ),
      };
    };
    const wet = checksum();
    for (let i = 0; i < 12; i++) p.update(1 / 12, silence, false);
    const dry = checksum(),
      afterSilence = p.inspect();
    for (let i = 0; i < 12; i++)
      p.update(1 / 12, { energy: 1, low: 1, high: 1, onset: 1 }, true);
    const paused = checksum(),
      afterPause = p.inspect();
    p.setPalette(["soft", "tired"]);
    const recolored = checksum();
    const width = p.texture.image.width,
      glError = p.engine.gl.getError();
    p.dispose();
    const disposed = p.texture === null;
    return {
      idle,
      active,
      wet,
      dry,
      paused,
      afterSilence,
      afterPause,
      recolored,
      width,
      glError,
      disposed,
    };
  });
  expect(result.idle.state).toBe("idle");
  expect(result.active.state).toBe("active");
  expect(result.active.deposits).toBeGreaterThan(3);
  expect(result.wet.sum).toBeGreaterThan(1000);
  expect(result.dry.hash).not.toBe(result.wet.hash);
  expect(result.paused).toEqual(result.dry);
  expect(result.afterSilence.deposits).toBe(result.active.deposits);
  expect(result.afterPause).toEqual(result.afterSilence);
  expect(result.recolored).toEqual(result.dry);
  expect(result.width).toBe(192);
  expect(result.glError).toBe(0);
  expect(result.disposed).toBe(true);
});

test("unsupported float simulation falls back without breaking the scene", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { PigmentMusic } = await import("/src/simple/PigmentMusic.ts");
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type === "webgl2") return null;
      return original.call(this, type, ...args);
    };
    const p = new PigmentMusic();
    p.update(0.1, { energy: 0.5, low: 0.5, high: 0.5, onset: 0.2 }, false);
    const state = p.inspect();
    p.dispose();
    HTMLCanvasElement.prototype.getContext = original;
    return state;
  });
  expect(result.state).toBe("fallback");
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-renderer",
    "simple-silk",
  );
});

test("actual sampled music drives pigment deposits in the 3D world", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /shader|WebGL|INVALID/i.test(m.text()))
      errors.push(m.text());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-pigment", "idle");
  await page.getByLabel("Réglages musique").click();
  await page.getByRole("button", { name: "Activer la musique" }).click();
  await expect(canvas).toHaveAttribute("data-pigment", "active", {
    timeout: 20000,
  });
  await expect
    .poll(
      async () => Number(await canvas.getAttribute("data-pigment-deposits")),
      { timeout: 15000 },
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Couper la musique" }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.waitForTimeout(250);
  const deposits = await canvas.getAttribute("data-pigment-deposits");
  await page.waitForTimeout(400);
  expect(await canvas.getAttribute("data-pigment-deposits")).toBe(deposits);
  await page.screenshot({ path: "test-results/music-pigment.png" });
  expect(errors).toEqual([]);
});

test("loss of the simulation context releases its texture and selects the procedural fallback", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { PigmentMusic } = await import("/src/simple/PigmentMusic.ts");
    const p = new PigmentMusic();
    p.update(0.2, { energy: 0.3, low: 0.4, high: 0.3, onset: 0.1 }, false);
    const before = p.inspect();
    p.engine.gl.getExtension("WEBGL_lose_context").loseContext();
    await new Promise((r) => setTimeout(r, 100));
    const after = p.inspect(),
      empty = p.texture === null;
    p.dispose();
    return { before, after, empty };
  });
  expect(result.before.state).toBe("active");
  expect(result.after.state).toBe("fallback");
  expect(result.empty).toBe(true);
});
