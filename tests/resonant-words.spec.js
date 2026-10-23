import { test, expect } from "@playwright/test";

test("a centered word approaches, returns when looking away, and never moves the camera", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/three/build/three.module.js");
    const { ResonantWords } = await import("/src/simple/ResonantWords.ts");
    const words = new ResonantWords();
    words.setPalette(["warm", "water"]);
    const camera = new THREE.PerspectiveCamera(68, 0.5, 0.1, 80);
    camera.position.set(0, 18, 2);
    camera.lookAt(0, 18, -10);
    const original = camera.position.toArray().join(","),
      heading = camera.quaternion.toArray().join(",");
    const center = () => {
      const p = words.mesh.geometry.attributes.position;
      return new THREE.Vector3(
        (p.getX(0) + p.getX(3)) / 2,
        (p.getY(0) + p.getY(3)) / 2,
        (p.getZ(0) + p.getZ(3)) / 2,
      );
    };
    words.update(0, 0, camera, true, true);
    const staticVisible = words.mesh.visible && words.mesh.material.opacity > 0;
    words.update(0, 0, camera, false, true);
    const before = center().distanceTo(camera.position);
    for (let i = 0; i < 200; i++)
      words.update(i * 0.016, 0.016, camera, false, true);
    const focused = words.inspect(),
      near = center().distanceTo(camera.position),
      stationary =
        original === camera.position.toArray().join(",") &&
        heading === camera.quaternion.toArray().join(",");
    const frozen = Array.from(words.mesh.geometry.attributes.position.array);
    words.update(199 * 0.016, 0.2, camera, true, true);
    const paused = frozen.every(
      (v, i) => v === words.mesh.geometry.attributes.position.array[i],
    );
    camera.lookAt(10, 18, 2);
    for (let i = 0; i < 200; i++)
      words.update(3.2 + i * 0.016, 0.016, camera, false, true);
    const after = center().distanceTo(camera.position),
      unfocused = words.inspect().focused;
    const labels = words.inspect().words;
    words.update(7, 0.016, camera, false, false);
    const hidden = !words.mesh.visible;
    words.dispose();
    return {
      before,
      near,
      after,
      focused,
      stationary,
      paused,
      unfocused,
      labels,
      hidden,
      staticVisible,
    };
  });
  expect(result.focused.focused).toBe("éclat");
  expect(result.focused.approach).toBeGreaterThan(0.9);
  expect(result.near).toBeLessThan(result.before * 0.4);
  expect(result.near).toBeGreaterThanOrEqual(2.79);
  expect(result.after).toBeGreaterThan(result.near * 2);
  expect(result.unfocused).toBeNull();
  expect(result.staticVisible).toBe(true);
  expect(result.stationary).toBe(true);
  expect(result.paused).toBe(true);
  expect(result.hidden).toBe(true);
  expect(result.labels).toContain("reflet");
  expect(result.labels).toHaveLength(6);
});

test("words appear in immersion and disappear on return to the palette", async ({
  page,
}) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await page.getByRole("button", { name: "Entrer dans mon ciel" }).click();
  await expect(canvas).toHaveAttribute("data-ready", "inside");
  await expect(canvas).toHaveAttribute("data-calls", "10");
  await expect.poll(() => canvas.getAttribute("data-word")).not.toBe("");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-word-approach")))
    .toBeGreaterThan(0.8);
  await page.screenshot({ path: "test-results/resonant-word.png" });
  await page.getByRole("button", { name: "Revenir à la palette" }).click();
  await expect(canvas).toHaveAttribute("data-calls", "9");
});
