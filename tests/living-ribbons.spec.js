import { test, expect } from "@playwright/test";
test("open ribbon trajectories stay bounded and reuse geometry throughout their life", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createLivingRibbons } =
      await import("/src/squiggle/createLivingRibbons.js");
    const { generateUniverse, EMOJI_INGREDIENTS } =
      await import("/src/squiggle/squibbleUniverse.js");
    const items = generateUniverse([
      EMOJI_INGREDIENTS[0],
      EMOJI_INGREDIENTS[1],
    ]);
    const field = createLivingRibbons({ mobile: true });
    field.setDocument(items);
    const mesh = field.group.children[0],
      g = mesh.geometry,
      buffer = g.attributes.position.array;
    const before = buffer.slice(0, 100),
      life = g.attributes.life.array;
    const periods = new Set(),
      offsets = new Set();
    for (let i = 0; i < g.drawRange.count; i += 48 * 3 * 6) {
      periods.add(life[i * 4 + 1]);
      offsets.add(life[i * 4 + 2]);
    }
    field.update(5, { bass: 0.8, mid: 0.3, treble: 0.2, pulse: 0.4 });
    field.update(55, { bass: 0.2, mid: 0.6, treble: 0.7, pulse: 0 });
    const stable =
      buffer === g.attributes.position.array &&
      before.every((v, i) => v === buffer[i]);
    const finite = buffer.every(Number.isFinite),
      vertices = g.drawRange.count,
      count = field.count,
      children = field.group.children.length;
    let disposed = 0;
    g.addEventListener("dispose", () => disposed++);
    mesh.material.addEventListener("dispose", () => disposed++);
    field.setDocument([]);
    const empty = g.drawRange.count;
    field.dispose();
    return {
      stable,
      finite,
      vertices,
      count,
      children,
      periods: periods.size,
      offsets: offsets.size,
      disposed,
      empty,
      doubleSided: mesh.material.side,
    };
  });
  expect(result).toMatchObject({
    stable: true,
    finite: true,
    count: 36,
    children: 1,
    disposed: 2,
    empty: 0,
    doubleSided: 2,
  });
  expect(result.vertices).toBeLessThan(42000);
  expect(result.periods).toBe(36);
  expect(result.offsets).toBe(36);
});
test("ribbons actually grow and fade on the GPU without reconstructing buffers", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/three/build/three.module.js");
    const { createLivingRibbons } =
      await import("/src/squiggle/createLivingRibbons.js");
    const field = createLivingRibbons({ mobile: true });
    field.setDocument([
      {
        id: 1,
        emotionId: "peace",
        color: "#66cbd0",
        size: 40,
        radius: 6,
        points: [{ x: 0.3, y: 0.5 }],
      },
    ]);
    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(192, 192);
    renderer.setClearColor("#05070d");
    const target = new THREE.WebGLRenderTarget(192, 192);
    renderer.setRenderTarget(target);
    const scene = new THREE.Scene();
    scene.add(field.group);
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 60);
    camera.position.z = 18;
    const mesh = field.group.children[0],
      data = mesh.geometry.attributes.life.array,
      period = data[1],
      offset = data[2];
    const sample = (age) => {
      field.update((age - offset + 1) * period);
      renderer.render(scene, camera);
      const px = new Uint8Array(192 * 192 * 4);
      renderer.readRenderTargetPixels(target, 0, 0, 192, 192, px);
      let bright = 0;
      for (let i = 0; i < px.length; i += 4)
        if (Math.max(px[i], px[i + 1], px[i + 2]) > 35) bright++;
      return bright;
    };
    const early = sample(0.025),
      drawn = sample(0.61),
      faded = sample(0.995);
    field.dispose();
    target.dispose();
    renderer.dispose();
    return { early, drawn, faded };
  });
  expect(result.drawn).toBeGreaterThan(50);
  expect(result.early).toBeLessThan(result.drawn * 0.3);
  expect(result.faded).toBeLessThan(result.drawn * 0.1);
});
