import { test, expect } from "@playwright/test";
test("watercolor worlds omit photo bubbles in preview and travel and retain PNG capture", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  await expect(page.locator(".squibble-orb canvas")).toHaveAttribute(
    "data-photo-bubbles",
    "0",
  );
  await page.getByRole("button", { name: "Vague", exact: true }).click();
  await page
    .getByRole("button", { name: "Entrer dans mon monde", exact: true })
    .click();
  await expect(page.locator(".squiggle-world canvas")).toHaveAttribute(
    "data-photo-bubbles",
    "0",
  );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Photographier ce regard" }).click();
  expect((await download).suggestedFilename()).toMatch(/png$/);
  expect(errors).toEqual([]);
});
test("image bubbles use unmodified color maps, shared geometry and dispose owned GPU resources", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/three/build/three.module.js");
    const { createPhotoBubbles } =
      await import("/src/squiggle/createPhotoBubbles.js");
    const { loadLocalTextures } = await import("/src/squiggle/localTexture.js");
    const sources = await loadLocalTextures(),
      bubbles = createPhotoBubbles();
    bubbles.setMaterials({ a: sources[0], b: sources[1], c: sources[0] });
    const entries = bubbles.group.children;
    const readable = entries.every((m) =>
      sources.some((s) => s.canvas === m.material.uniforms.photo.value.image),
    );
    const shared = entries.every((m) => m.geometry === entries[0].geometry);
    const camera = new THREE.PerspectiveCamera();
    bubbles.update(5, camera, { energy: 0.5 });
    let disposed = 0;
    entries[0].geometry.addEventListener("dispose", () => disposed++);
    for (const t of new Set(
      entries.map((m) => m.material.uniforms.photo.value),
    ))
      t.addEventListener("dispose", () => disposed++);
    const count = bubbles.count;
    bubbles.dispose();
    return {
      readable,
      shared,
      count,
      disposed,
      empty: bubbles.group.children.length,
      sourcesIntact: sources.every((s) => s.canvas.width === 256),
    };
  });
  expect(result).toEqual({
    readable: true,
    shared: true,
    count: 4,
    disposed: 3,
    empty: 0,
    sourcesIntact: true,
  });
});
