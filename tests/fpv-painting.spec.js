import { test, expect } from "@playwright/test";
test("three FPV brushes paint while travelling, stop on contemplation, and enter PNG", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Vague", exact: true }).click();
  await page
    .getByRole("button", { name: "Entrer dans mon monde", exact: true })
    .click();
  const canvas = page.locator(".squiggle-world canvas");
  await expect(
    page.getByRole("group", { name: "Brosses de voyage" }).getByRole("button"),
  ).toHaveCount(3);
  await expect(canvas).toHaveAttribute(
    "data-material-style",
    "living-watercolor-ribbons",
  );
  for (const [i, name] of ["Voile", "Encre", "Grains"].entries()) {
    await page
      .getByRole("button", { name: "Brosse " + name, exact: true })
      .click();
    await expect(canvas).toHaveAttribute("data-flight-brush", String(i));
    const start = +(await canvas.getAttribute("data-painted-segments"));
    await expect
      .poll(async () => +(await canvas.getAttribute("data-painted-segments")))
      .toBeGreaterThan(start);
  }
  const r = await canvas.boundingBox();
  await page.mouse.move(r.width * 0.4, r.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(r.width * 0.65, r.height * 0.5, { steps: 20 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Contempler", exact: true }).click();
  const stopped = await canvas.getAttribute("data-painted-segments");
  await page.waitForTimeout(250);
  await expect(canvas).toHaveAttribute("data-painted-segments", stopped);
  const photo = page.waitForEvent("download");
  await page.getByRole("button", { name: "Photographier ce regard" }).click();
  expect((await photo).suggestedFilename()).toMatch(/png$/);
  await page
    .getByRole("button", { name: "Voyager en FPV", exact: true })
    .click();
  await expect
    .poll(async () => +(await canvas.getAttribute("data-painted-segments")))
    .toBeGreaterThan(+stopped);
  expect(errors).toEqual([]);
});
test("flight paint keeps one bounded ring buffer and breaks paths across pauses", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/three/build/three.module.js");
    const { createFlightBrushes } =
      await import("/src/squiggle/createFlightBrushes.js");
    const field = createFlightBrushes({ mobile: true }),
      camera = new THREE.PerspectiveCamera();
    for (let i = 0; i < 2600; i++) {
      camera.position.x = i * 0.04;
      field.update(camera, 0.05, { active: true, brush: i % 3 });
    }
    const interrupted = field.count;
    for (let i = 0; i < 2600; i++) {
      camera.position.x = i * 0.04;
      field.update(camera, 0.05, { active: true, brush: 0 });
    }
    const geometry = field.group.children[0].geometry,
      buffer = geometry.attributes.position.array;
    const count = field.count,
      snapshot = buffer.slice();
    field.update(camera, 0.1, { active: false });
    camera.position.x += 0.2;
    field.update(camera, 0.1, { active: true });
    const noBridge =
        field.count === count && buffer.every((v, i) => v === snapshot[i]),
      finite = buffer.every(Number.isFinite);
    let disposed = 0;
    geometry.addEventListener("dispose", () => disposed++);
    field.group.children[0].material.addEventListener(
      "dispose",
      () => disposed++,
    );
    field.dispose();
    return {
      interrupted,
      count,
      noBridge,
      finite,
      disposed,
      capacity: field.capacity,
    };
  });
  expect(result.interrupted).toBe(0);
  expect(result.count).toBe(result.capacity);
  expect(result.noBridge).toBe(true);
  expect(result.finite).toBe(true);
  expect(result.disposed).toBe(2);
});
