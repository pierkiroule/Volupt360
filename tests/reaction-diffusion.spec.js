import { test, expect } from "@playwright/test";

test("real GPU field persists, receives bounded musical seeds, freezes and frees targets", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const T = await import("/node_modules/three/build/three.module.js");
    const { ReactionDiffusion } =
      await import("/src/simple/ReactionDiffusion.ts");
    const renderer = new T.WebGLRenderer();
    renderer.setSize(128, 128);
    const errors = [];
    renderer.debug.onShaderError = (gl, p, v, f) =>
      errors.push(gl.getShaderInfoLog(f));
    const field = new ReactionDiffusion(true);
    field.setPalette(["warm", "water", "night"]);
    const silence = { energy: 0, low: 0, high: 0, onset: 0 },
      music = { energy: 0.8, low: 0.7, high: 0.4, onset: 0.8 };
    const scene = new T.Scene(),
      camera = new T.Camera();
    const quad = new T.Mesh(
      new T.PlaneGeometry(2, 2),
      new T.ShaderMaterial({
        uniforms: { map: { value: null } },
        vertexShader:
          "varying vec2 v;void main(){v=uv;gl_Position=vec4(position,1.);}",
        fragmentShader:
          "uniform sampler2D map;varying vec2 v;void main(){vec2 c=texture2D(map,v).rg;gl_FragColor=vec4(c,0.,1.);}",
      }),
    );
    scene.add(quad);
    const output = new T.WebGLRenderTarget(128, 128, { depthBuffer: false });
    const pixels = new Uint8Array(128 * 128 * 4);
    const read = () => {
      quad.material.uniforms.map.value = field.texture;
      renderer.setRenderTarget(output);
      renderer.render(scene, camera);
      renderer.readRenderTargetPixels(output, 0, 0, 128, 128, pixels);
      renderer.setRenderTarget(null);
      let hash = 0,
        active = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        hash = (Math.imul(hash, 31) + pixels[i] + pixels[i + 1] * 3) >>> 0;
        if (pixels[i + 1] > 10) active++;
      }
      return { hash, active };
    };
    field.update(renderer, 1 / 60, silence, false);
    const initial = read();
    for (let i = 0; i < 600; i++)
      field.update(renderer, 1 / 60, silence, false);
    const dry = read(),
      silentState = field.inspect();
    for (let i = 0; i < 600; i++) field.update(renderer, 1 / 60, music, false);
    const wet = read(),
      musicalState = field.inspect();
    for (let i = 0; i < 120; i++) field.update(renderer, 1 / 60, music, true);
    const paused = read(),
      pausedState = field.inspect();
    field.setPalette(["water"]);
    const preserved = read();
    const beforeTextures = renderer.info.memory.textures;
    field.reset();
    field.update(renderer, 1 / 60, silence, false);
    const restored = field.inspect();
    renderer.setRenderTarget(output);
    field.update(renderer, 0.1, music, false);
    const restoredTarget = renderer.getRenderTarget() === output;
    renderer.setRenderTarget(null);
    field.dispose();
    const afterTextures = renderer.info.memory.textures;
    const noTexture = field.texture === null;
    const disabled = new ReactionDiffusion(true, false);
    disabled.update(renderer, 1, music, false);
    const disabledState = disabled.inspect();
    disabled.dispose();
    // Explicit capability fallback uses no GPU targets.
    const fallback = new ReactionDiffusion(true);
    fallback.update(
      {
        capabilities: { isWebGL2: false },
        getRenderTarget: () => null,
        setRenderTarget: () => {},
      },
      0.1,
      music,
      false,
    );
    const fallbackState = fallback.inspect();
    fallback.dispose();
    quad.geometry.dispose();
    quad.material.dispose();
    output.dispose();
    renderer.dispose();
    return {
      errors,
      initial,
      dry,
      wet,
      paused,
      preserved,
      silentState,
      musicalState,
      pausedState,
      beforeTextures,
      afterTextures,
      restored,
      restoredTarget,
      noTexture,
      disabledState,
      fallbackState,
    };
  });
  expect(result.errors).toEqual([]);
  expect(result.initial.active).toBeGreaterThan(100);
  expect(result.dry.hash).not.toBe(result.initial.hash);
  expect(result.dry.active).toBeGreaterThan(50);
  expect(result.wet.hash).not.toBe(result.dry.hash);
  expect(result.silentState.deposits).toBe(0);
  expect(result.musicalState.deposits).toBeGreaterThan(2);
  expect(result.musicalState.deposits).toBeLessThanOrEqual(9);
  expect(result.paused).toEqual(result.wet);
  expect(result.preserved).toEqual(result.paused);
  expect(result.pausedState).toEqual(result.musicalState);
  expect(result.musicalState.steps).toBeLessThanOrEqual(1600);
  expect(result.musicalState.targets).toBe(2);
  expect(result.afterTextures).toBe(result.beforeTextures - 2);
  expect(result.noTexture).toBe(true);
  expect(result.restored.state).toBe("active");
  expect(result.restoredTarget).toBe(true);
  expect(result.disabledState.state).toBe("disabled");
  expect(result.disabledState.targets).toBe(0);
  expect(result.fallbackState.state).toBe("fallback");
  expect(result.fallbackState.targets).toBe(0);
});

test("world integrates one field and freezes it on pause without extra scene draws", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /shader|WebGL|GL_INVALID/.test(m.text()))
      errors.push(m.text());
  });
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-reaction", "idle");
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  await expect(canvas).toHaveAttribute("data-reaction", "active");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-reaction-steps")))
    .toBeGreaterThan(8);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-reaction-paused", "true");
  const steps = await canvas.getAttribute("data-reaction-steps");
  await page.waitForTimeout(250);
  expect(await canvas.getAttribute("data-reaction-steps")).toBe(steps);
  expect(Number(await canvas.getAttribute("data-calls"))).toBeLessThanOrEqual(
    14,
  );
  await page.getByRole("button", { name: "Reprendre", exact: true }).click();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-reaction-steps")))
    .toBeGreaterThan(Number(steps));
  expect(errors).toEqual([]);
});
