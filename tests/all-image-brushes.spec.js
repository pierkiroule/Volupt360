import { test, expect } from "@playwright/test";

test("every brush owns an independent photo, renders its binding and keeps photos across worlds", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?instrument=off");
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 96;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#4d9d62";
    ctx.fillRect(0, 0, 96, 64);
    ctx.fillStyle = "#ed7163";
    ctx.fillRect(0, 0, 48, 32);
    return canvas.toDataURL().split(",")[1];
  });
  for (const world of ["ÉTHER", "ABYSSE", "MÉMOIRE"]) {
    await page.getByRole("button", { name: `Choisir ${world}` }).click();
    await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
    const pads = page.locator(".twig-pad");
    for (let i = 0; i < 6; i++) {
      const pad = pads.nth(i),
        name = (await pad.getAttribute("aria-label")).replace(
          "Sculpter avec ",
          "",
        );
      const id = (await pad.getAttribute("class"))
        .split(" ")
        .find((value) => value.startsWith("twig-") && value !== "twig-pad")
        .slice(5);
      await expect(pad).toHaveAttribute("data-image-ready", "false");
      await pad.click();
      await page.getByLabel(`Importer l’image de ${name}`).setInputFiles({
        name: "landscape.png",
        mimeType: "image/png",
        buffer: Buffer.from(image, "base64"),
      });
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(pad).toHaveAttribute("data-image-ready", "true");
      await pad.click();
      await expect
        .poll(async () =>
          (
            (await page
              .locator("#stage canvas")
              .getAttribute("data-imported-brushes")) || ""
          )
            .split(",")
            .includes(id),
        )
        .toBe(true);
    }
    await page.getByRole("button", { name: "Changer d’univers" }).click();
  }
  await page.getByRole("button", { name: "Choisir ÉTHER" }).click();
  await page.getByRole("button", { name: "Entrer dans le paysage" }).click();
  for (let i = 0; i < 6; i++)
    await expect(page.locator(".twig-pad").nth(i)).toHaveAttribute(
      "data-image-ready",
      "true",
    );
  const stage = page.locator("#stage canvas");
  await page.mouse.move(170, 350);
  await page.mouse.down();
  await expect(stage).toHaveAttribute("data-nozzle-paint", "true");
  await page.mouse.move(230, 320, { steps: 5 });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await stage.getAttribute("data-steering-moves")))
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Vue photo", exact: true }).click();
  await expect(stage).toHaveAttribute("data-sculpture-paused", "true");
  expect(errors).toEqual([]);
});

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
