import { test, expect } from "@playwright/test";
test("one drag places one textured object, with undo, redo, 3D and PNG", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  const paper = page.locator(".squiggle-paper");
  await expect(paper).toHaveAttribute("data-animation-time", /\d/);
  const r = await paper.boundingBox();
  await page.mouse.move(r.width * 0.35, r.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(r.width * 0.58, r.height * 0.45, { steps: 18 });
  await page.mouse.up();
  await expect(paper).toHaveAttribute("data-strokes", "1");
  const pixels = await paper.evaluate((c) => {
    const ctx = c.getContext("2d");
    const bright = (x, y) =>
      Math.max(
        ...ctx.getImageData(x * c.width, y * c.height, 1, 1).data.slice(0, 3),
      );
    return { start: bright(0.35, 0.4), end: bright(0.58, 0.45) };
  });
  expect(pixels.start).toBeLessThan(20);
  expect(pixels.end).toBeGreaterThan(35);
  await page
    .getByRole("button", { name: "Annuler le placement", exact: true })
    .click();
  await expect(paper).toHaveAttribute("data-strokes", "0");
  await page
    .getByRole("button", { name: "Autres outils", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Rétablir le placement", exact: true })
    .click();
  await expect(paper).toHaveAttribute("data-strokes", "1");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG ↓", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/png$/);
  await page
    .getByRole("button", { name: "Autres outils", exact: true })
    .click();
  await page.screenshot({ path: "/tmp/projective-objects-2d.png" });
  await page
    .getByRole("button", { name: "Entrer en 360", exact: true })
    .click();
  const world = page.locator(".squiggle-world canvas");
  await expect(world).toHaveAttribute("data-objects", "1");
  await expect(world).toHaveAttribute(
    "data-material-style",
    "projective-objects",
  );
  await page.screenshot({ path: "/tmp/projective-objects-3d.png" });
  await page
    .getByRole("button", { name: "Revenir au dessin 2D", exact: true })
    .click();
  await expect(paper).toHaveAttribute("data-strokes", "1");
  expect(errors).toEqual([]);
});
test("shared object textures are deterministic, geometry finite, resources disposed", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createObjectMatter } =
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
      finite,
      moving,
      disposed,
      vertices,
      empty: field.group.children.length,
    };
  });
  expect(result.same).toBe(true);
  expect(result.finite).toBe(true);
  expect(result.moving).toBe(true);
  expect(result.disposed).toBe(2);
  expect(result.empty).toBe(0);
  expect(result.vertices).toBeLessThan(1000);
});
test("mobile touch placement and FPV travel remain accessible", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator(".squiggle-paper")).toHaveAttribute(
    "data-animation-time",
    /\d/,
  );
  await page.touchscreen.tap(195, 350);
  await expect(page.locator(".squiggle-paper")).toHaveAttribute(
    "data-strokes",
    "1",
  );
  await page.getByRole("button", { name: "Entrer en 360", exact: true }).tap();
  const world = page.locator(".squiggle-world canvas");
  await expect(world).toHaveAttribute("data-objects", "1");
  await page.getByRole("button", { name: "Voyager en FPV", exact: true }).tap();
  await expect(
    page.getByRole("button", { name: "Arrêter le voyage FPV", exact: true }),
  ).toBeVisible();
  await page.touchscreen.tap(195, 350);
  await expect(world).toHaveAttribute("data-strokes", "1");
  await context.close();
});
