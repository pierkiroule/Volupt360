import { test, expect } from "@playwright/test";

test("twelve distinct spatial scores and seven encounter scores preserve order and all three choices", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { universeIdentity, UNIVERSES } =
      await import("/src/simple/UniverseIdentity.ts");
    const singles = Object.keys(UNIVERSES).map((id) => universeIdentity([id]));
    const pairs = [
      ["warm", "water"],
      ["air", "night"],
      ["soft", "tired"],
      ["air", "surprise"],
      ["warm", "tired"],
      ["water", "tired"],
      ["wonder", "night"],
    ].map((ids) => universeIdentity(ids));
    return {
      singles,
      pairs,
      repeat: universeIdentity(["warm", "water"]),
      reverse: universeIdentity(["water", "warm"]),
      triple: universeIdentity(["warm", "water", "confused"]),
      fallback: universeIdentity(["invalid"]),
    };
  });
  expect(new Set(result.singles.map((p) => p.mode)).size).toBe(12);
  expect(new Set(result.singles.map((p) => p.sky.join(","))).size).toBe(12);
  expect(new Set(result.pairs.map((p) => p.mode)).size).toBe(7);
  expect(result.pairs.every((p) => p.mode >= 12)).toBe(true);
  expect(result.repeat).toEqual(result.pairs[0]);
  expect(result.reverse.seed).not.toBe(result.repeat.seed);
  expect(result.reverse.instruments).not.toEqual(result.repeat.instruments);
  expect(result.triple.modes).toEqual([0, 1, 8]);
  expect(result.triple.colors[2]).not.toBe(result.repeat.colors[2]);
  expect(result.triple.space).not.toEqual(result.repeat.space);
  expect(result.triple.drums).not.toEqual(result.repeat.drums);
  expect(result.fallback.key).toBe("warm");
  for (const p of [...result.singles, ...result.pairs, result.triple]) {
    expect(p.drums.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
    expect(p.space.every((n) => n > 0.5 && n < 2.1)).toBe(true);
  }
});

test("different worlds change actual geometry and rendered pixels within the same GPU budget", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/three/build/three.module.js");
    const { AbstractResonances } =
      await import("/src/simple/AbstractResonances.ts");
    const { makeWatercolorAtlas } =
      await import("/src/simple/WatercolorAtlas.ts");
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(96, 96);
    const errors = [];
    renderer.debug.onShaderError = (gl, p, v, f) =>
      errors.push(gl.getShaderInfoLog(f) || gl.getProgramInfoLog(p));
    const paper = makeWatercolorAtlas(),
      forms = new AbstractResonances(paper, true),
      scene = new THREE.Scene();
    scene.background = new THREE.Color("#c7c7c7");
    scene.add(forms.mesh);
    const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
    camera.position.set(0, 18, 10);
    camera.lookAt(0, 18, -5);
    const target = new THREE.WebGLRenderTarget(96, 96);
    renderer.setRenderTarget(target);
    const pixels = new Uint8Array(96 * 96 * 4),
      signatures = [],
      modes = [];
    const configs = [
      ["warm"],
      ["water"],
      ["air"],
      ["soft"],
      ["night"],
      ["spark"],
      ["wonder"],
      ["surprise"],
      ["confused"],
      ["tired"],
      ["trust"],
      ["longing"],
      ["warm", "water"],
      ["air", "night"],
      ["soft", "tired"],
      ["air", "surprise"],
      ["warm", "tired"],
      ["water", "tired"],
      ["wonder", "night"],
    ];
    for (const ids of configs) {
      forms.setPalette(ids);
      forms.update(8, 1, true, true);
      renderer.render(scene, camera);
      renderer.readRenderTargetPixels(target, 0, 0, 96, 96, pixels);
      signatures.push(
        pixels.reduce((a, b) => Math.imul(a ^ b, 16777619) >>> 0, 2166136261),
      );
      modes.push(forms.mesh.material.uniforms.worldMode.value);
    }
    const calls = renderer.info.render.calls,
      triangles = renderer.info.render.triangles;
    forms.dispose();
    paper.dispose();
    target.dispose();
    renderer.dispose();
    return { errors, signatures, modes, calls, triangles };
  });
  expect(result.errors).toEqual([]);
  expect(new Set(result.signatures).size).toBe(19);
  expect(new Set(result.modes).size).toBe(19);
  expect(result.calls).toBe(1);
  expect(result.triangles).toBeLessThan(4000);
});

test("ordered selections reach the complete world and persist without extra preview draws", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  for (const [ids, name] of [
    [["warm"], "joie-en-corolles"],
    [["water"], "tristesse-en-rivieres"],
    [["soft", "tired"], "replis-en-suspens"],
    [["air", "night"], "forces-en-tension"],
  ]) {
    await page.evaluate(
      (ids) => localStorage.setItem("cosmo-simple.v1", JSON.stringify(ids)),
      ids,
    );
    await page.reload();
    const canvas = page.locator("canvas");
    await expect(canvas).toHaveAttribute("data-universe", name);
    await expect(canvas).toHaveAttribute("data-sequence", ids.join(">"));
    await expect(canvas).toHaveAttribute("data-calls", "9");
    await page.screenshot({ path: `test-results/universe-${name}.png` });
  }
});

test("each world keeps its own transposed harmony coherent down to the bass register", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { WeatherScore } = await import("/src/simple/WeatherScore.ts");
    const { UNIVERSES } = await import("/src/simple/UniverseIdentity.ts");
    const { bassRegister } = await import("/src/simple/ElectroRhythm.ts");
    const failures = [];
    let count = 0;
    for (const id of Object.keys(UNIVERSES)) {
      const score = new WeatherScore([id], 91);
      for (let t = 0; t < 120; t += 0.2) {
        for (const e of score.advance(t)) {
          count++;
          const pc = (((e.note - score.profile.transpose) % 12) + 12) % 12;
          if (
            !(score.profile.major ? [0, 2, 4, 7, 9] : [0, 2, 5, 7, 9]).includes(
              pc,
            )
          )
            failures.push([id, e.note]);
        }
      }
      for (const note of score.harmonyNotes) {
        const bass = bassRegister(note - 12);
        if (bass < 26 || bass > 45 || bass % 12 !== (note - 12) % 12)
          failures.push([id, bass]);
      }
    }
    return { failures, count };
  });
  expect(result.failures).toEqual([]);
  expect(result.count).toBeGreaterThan(500);
});
