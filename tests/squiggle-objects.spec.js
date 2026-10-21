import { test, expect } from "@playwright/test";
test("shared object textures are deterministic, geometry finite, resources disposed", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createObjectMatter, objectRadius } =
      await import("/src/squiggle/objectMatter.js");
    const { createObjectField } =
      await import("/src/squiggle/createObjectField.js");
    const item = {
      id: 7,
      emotionId: "anger",
      color: "#ff956b",
      size: 48,
      opacity: 0.8,
      points: [{ x: 0.5, y: 0.5 }],
    };
    const a = createObjectMatter(item),
      b = createObjectMatter(item);
    const same = a.canvas.toDataURL() === b.canvas.toDataURL();
    const closedPoles = objectRadius(0, 0, 3, 1) === objectRadius(2, 0, 3, 1);
    const pixels = a.canvas.getContext("2d").getImageData(0, 0, 256, 256).data;
    let translucent = 0;
    for (let i = 3; i < pixels.length; i += 4)
      if (pixels[i] > 0 && pixels[i] < 240) translucent++;

    const field = createObjectField({ mobile: true });
    field.setDocument([item]);
    const mesh = field.group.children[0];
    let finite = true;
    for (const n of mesh.geometry.attributes.position.array)
      if (!Number.isFinite(n)) finite = false;
    const before = mesh.position.clone();
    field.update(10);
    const moving = before.distanceTo(mesh.position) > 0;
    let disposed = 0;
    mesh.geometry.addEventListener("dispose", () => disposed++);
    mesh.material.addEventListener("dispose", () => disposed++);
    const vertices = mesh.geometry.attributes.position.count;
    field.setDocument([]);
    field.dispose();
    a.dispose();
    b.dispose();
    return {
      same,
      closedPoles,
      translucent,
      layers: mesh.children.length,
      finite,
      moving,
      disposed,
      vertices,
      empty: field.group.children.length,
    };
  });
  expect(result.same).toBe(true);
  expect(result.closedPoles).toBe(true);
  expect(result.translucent).toBeGreaterThan(60000);
  expect(result.layers).toBe(1);
  expect(result.finite).toBe(true);
  expect(result.moving).toBe(true);
  expect(result.disposed).toBe(2);
  expect(result.empty).toBe(0);
  expect(result.vertices).toBeLessThan(1000);
});
