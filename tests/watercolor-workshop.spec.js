import { test, expect } from "@playwright/test";

test("white watercolor workshop: hold paints, release stops, palette and both views work", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Prendre son envol" }).click();
  const canvas = page.locator("canvas");
  await expect(
    page.getByRole("group", { name: "Choisir une brosse" }),
  ).toBeVisible();
  await expect(canvas).toHaveAttribute("data-mood-background", "#ffffff");
  await expect(canvas).toHaveAttribute("data-constellation", "false");
  await expect(canvas).toHaveAttribute("data-painted-samples", "0");
  await page.mouse.move(195, 300);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(450);
  await expect(canvas).toHaveAttribute("data-painted-samples", "0");
  await page.mouse.down();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-painted-samples")))
    .toBeGreaterThan(3);
  await expect(canvas).toHaveAttribute("data-paint-emitter", "brush-tip");
  await expect(canvas).toHaveAttribute("data-paint-emitter-count", "1");
  await expect(canvas).toHaveAttribute("data-mark-count", "1");
  await page.mouse.move(245, 260, { steps: 8 });
  await page.mouse.up();
  await expect(canvas).toHaveAttribute("data-nozzle-paint", "false");
  // Let the existing brush bridge flush the final wing samples and diagnostics.
  await page.waitForTimeout(300);
  const count = await canvas.getAttribute("data-painted-samples");
  await page.waitForTimeout(700);
  await expect(canvas).toHaveAttribute("data-painted-samples", count);
  await page
    .getByRole("group", { name: "Choisir une brosse" })
    .getByRole("button")
    .first()
    .click();
  await expect(
    page
      .getByRole("group", { name: "Choisir une brosse" })
      .getByRole("button")
      .first(),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Contempler en gyro 360°" }).click();
  await expect(canvas).toHaveAttribute("data-camera-mode", "gyro");
  const orientation = await canvas.getAttribute("data-camera-orientation");
  await page.mouse.move(180, 250);
  await page.mouse.down();
  await page.mouse.move(290, 320, { steps: 10 });
  await page.mouse.up();
  await expect
    .poll(() => canvas.getAttribute("data-camera-orientation"))
    .not.toBe(orientation);
  await page.getByRole("button", { name: "Revenir en FPV" }).click();
  await expect(canvas).toHaveAttribute("data-camera-mode", "drone");
  await page.getByRole("button", { name: "Faire une pause" }).click();
  await page.mouse.move(195, 300);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.mouse.up();
  await expect(canvas).toHaveAttribute("data-painted-samples", count);
  await page.getByRole("button", { name: "Reprendre", exact: true }).click();
  await page.getByRole("button", { name: "Sortir", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Prendre son envol" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("brush tip follows the rig through turns and parent transforms", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createOizo } = await import("/src/sonoizo/createOizo.js");
    const bird = createOizo();
    bird.setPaintbrush(true);
    const parent = new THREE.Group();
    parent.position.set(4, -2, 7);
    parent.rotation.y = 0.7;
    parent.add(bird.group);
    const tip = bird.group.getObjectByName("brush-tip");
    const bristles = bird.group.getObjectByName("brush-bristles");
    const actual = new THREE.Vector3(),
      expected = new THREE.Vector3();
    let error = 0;
    for (let i = 0; i < 120; i++) {
      const direction = new THREE.Vector3(
        Math.sin(i * 0.03),
        Math.sin(i * 0.02) * 0.4,
        1,
      ).normalize();
      bird.update({
        time: i / 60,
        position: new THREE.Vector3(i * 0.02, 2, 4),
        direction,
        side: new THREE.Vector3(1, 0, 0),
        up: new THREE.Vector3(0, 1, 0),
        pilotX: 0.4,
        acoustic: { low: 0.2 },
      });
      bird.getBrushTipPosition(actual);
      // The cone apex is +height/2 on its local Y axis.
      bristles.localToWorld(expected.set(0, 0.14, 0));
      parent.worldToLocal(expected);
      error = Math.max(error, actual.distanceTo(expected));
    }
    const visible = bird.group.getObjectByName("winged-paintbrush").visible;
    const wings = ["left-wing", "right-wing"].every(
      (name) => bird.group.getObjectByName(name).isSkinnedMesh,
    );
    const offset = actual.distanceTo(bird.group.position);
    bird.dispose();
    return {
      error,
      visible,
      wings,
      offset,
      removed: parent.children.length === 0,
    };
  });
  expect(result.error).toBeLessThan(0.00001);
  expect(result.offset).toBeGreaterThan(0.8);
  expect(result.visible && result.wings && result.removed).toBe(true);
});
