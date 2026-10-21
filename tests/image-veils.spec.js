import { test, expect } from "@playwright/test";
test("local images remain readable on bounded shared sheets and release GPU resources", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createImageVeils } =
      await import("/src/squiggle/createImageVeils.js");
    const { loadLocalTextures } = await import("/src/squiggle/localTexture.js");
    const THREE = await import("/node_modules/three/build/three.module.js");
    const sources = await loadLocalTextures(),
      veils = createImageVeils();
    veils.setMaterials({ a: sources[0], b: sources[1], duplicate: sources[0] });
    const entries = veils.group.children;
    const readable = entries.every((m) =>
      sources.some((s) => s.canvas === m.material.uniforms.image.value.image),
    );
    const planes = entries.every((m) => m.geometry.type === "PlaneGeometry"),
      shared = entries.every((m) => m.geometry === entries[0].geometry);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 1, 8);
    veils.update(10, camera, { mid: 0.5 });
    let disposed = 0;
    entries[0].geometry.addEventListener("dispose", () => disposed++);
    for (const m of entries) {
      m.material.addEventListener("dispose", () => disposed++);
      m.material.uniforms.image.value.addEventListener(
        "dispose",
        () => disposed++,
      );
    }
    const count = veils.count;
    veils.dispose();
    return {
      count,
      readable,
      planes,
      shared,
      disposed,
      empty: veils.group.children.length,
      intact: sources.every((s) => s.canvas.width === 256),
    };
  });
  expect(result).toEqual({
    count: 2,
    readable: true,
    planes: true,
    shared: true,
    disposed: 5,
    empty: 0,
    intact: true,
  });
});
