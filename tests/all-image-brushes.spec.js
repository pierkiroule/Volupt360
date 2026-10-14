import { test, expect } from "@playwright/test";

test("photographic RGB and proportions survive analysis and reach ribbon and particle shaders", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createImageBrush } = await import("/src/engine/ImageBrush.js");
    const { createBrushStroke, disposeMark } =
      await import("/src/engine/brushes.js");
    const canvas = document.createElement("canvas");
    canvas.width = 192;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ee3333";
    ctx.fillRect(0, 0, 96, 96);
    ctx.fillStyle = "#3333ee";
    ctx.fillRect(96, 0, 96, 96);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve));
    const profile = await createImageBrush(
      new File([blob], "pattern.png", { type: "image/png" }),
    );
    const pixels = profile.binding.texture.image
      .getContext("2d")
      .getImageData(0, 0, 192, 96).data;
    const renderer = new THREE.WebGLRenderer(),
      scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    renderer.setSize(96, 96);
    camera.position.z = 4;
    const target = new THREE.WebGLRenderTarget(96, 96),
      data = new Uint8Array(96 * 96 * 4);
    const output = [];
    for (const id of ["voiles", "plumes"]) {
      const stroke = createBrushStroke(id, {
        seed: 0.1,
        color: new THREE.Color("white"),
        texture: profile.binding,
      });
      const material = stroke.group.children[0].material;
      const geometry = new THREE.PlaneGeometry(2, 2, 1, 1);
      if (id === "plumes") {
        for (const [name, size] of [
          ["aOffset", 3],
          ["aTint", 3],
          ["aSeed", 1],
          ["aBirth", 1],
        ]) {
          const values = new Float32Array(4 * size);
          if (name === "aTint") values.fill(1);
          geometry.setAttribute(name, new THREE.BufferAttribute(values, size));
        }
      } else
        geometry.setAttribute(
          "color",
          new THREE.Float32BufferAttribute(Array(12).fill(1), 3),
        );
      material.uniforms.uTime.value = 0;
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.readRenderTargetPixels(target, 0, 0, 96, 96, data);
      let red = 0,
        blue = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > data[i + 2] * 1.6 && data[i] > 20) red++;
        if (data[i + 2] > data[i] * 1.6 && data[i + 2] > 20) blue++;
      }
      output.push({ id, red, blue });
      scene.remove(mesh);
      geometry.dispose();
      disposeMark(stroke.group);
    }
    const dimensions = [
        profile.binding.texture.image.width,
        profile.binding.texture.image.height,
      ],
      redPixel = [...pixels.slice(0, 4)],
      bluePixel = [...pixels.slice(191 * 4, 192 * 4)];
    target.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    profile.binding.texture.dispose();
    return { dimensions, redPixel, bluePixel, output };
  });
  expect(result.dimensions).toEqual([192, 96]);
  expect(result.redPixel[0]).toBeGreaterThan(result.redPixel[2] * 3);
  expect(result.bluePixel[2]).toBeGreaterThan(result.bluePixel[0] * 3);
  for (const output of result.output) {
    expect(output.red).toBeGreaterThan(5);
    expect(output.blue).toBeGreaterThan(5);
  }
});
