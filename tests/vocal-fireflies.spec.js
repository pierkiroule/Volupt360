import { test, expect } from "@playwright/test";

test("24 independent voice files and brush pads that do not trigger vocals", async ({
  page,
}) => {
  await page.goto("/");
  const canvas = page.locator("#stage canvas");
  await expect(canvas).toHaveAttribute("data-vocal-fireflies", "24");
  await page
    .getByRole("button", { name: "Sculpter avec Voiles", exact: true })
    .click();
  await expect
    .poll(() => canvas.getAttribute("data-painted-samples"))
    .not.toBe("0");
  const result = await page.evaluate(async () => {
    const { FIREFLY_FRAGMENTS } = await import("/src/sonoizo/poems.js");
    const { createTwigBank } = await import("/src/sonoizo/createTwigBank.js");
    const bank = createTwigBank({ ids: ["voiles"] });
    bank.enableFireflies();
    await bank.loadPoems(FIREFLY_FRAGMENTS);
    await bank.trigger("voiles");
    const padSpeaking = bank.isSpeaking();
    const first = await bank.collide("firefly-24");
    const second = await bank.collide("firefly-1");
    const speaking = bank.getSnapshot().activeVocalId;
    const fragments = bank.getFragments().length;
    bank.dispose();
    return { padSpeaking, first, second, speaking, fragments };
  });
  expect(result).toEqual({
    padSpeaking: false,
    first: true,
    second: false,
    speaking: "firefly-24",
    fragments: 24,
  });
});

test("contact deflects a firefly and actual vocal emission produces a circular wave", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createVocalFireflies } =
      await import("/src/sonoizo/createVocalFireflies.js");
    const calls = [];
    const field = createVocalFireflies({
      fragments: [{ id: "a" }],
      collide: (id) => {
        calls.push(id);
        return Promise.resolve(true);
      },
    });
    const camera = new THREE.PerspectiveCamera();
    const pose = {
      position: field.group.children[0].position.clone(),
      direction: new THREE.Vector3(1, 0, 0),
    };
    field.update(0, pose, camera);
    await Promise.resolve();
    const origin = field.group.children[0].position.clone();
    field.update(0.1, pose, camera);
    const result = {
      calls,
      count: field.collisionCount,
      wave: field.group.children[1].material.opacity,
      displacement: origin.distanceTo(field.group.children[0].position),
    };
    field.dispose();
    return result;
  });
  expect(result.calls).toEqual(["a"]);
  expect(result.count).toBe(1);
  expect(result.wave).toBeGreaterThan(0);
  expect(result.displacement).toBeGreaterThan(0.2);
});

test("free flight naturally meets the orbital field with bounded scene objects", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createVocalFireflies } =
      await import("/src/sonoizo/createVocalFireflies.js");
    const { createSonoizoDance } = await import("/src/sonoizo/SonoizoDance.js");
    const { FIREFLY_FRAGMENTS } = await import("/src/sonoizo/poems.js");
    const field = createVocalFireflies({
      fragments: FIREFLY_FRAGMENTS,
      collide: () => Promise.resolve(true),
    });
    const dance = createSonoizoDance(),
      camera = new THREE.PerspectiveCamera();
    for (let i = 0; i < 60 * 180; i++) {
      field.update(1 / 60, dance.update(1 / 60, []), camera);
      if (i % 60 === 0) await Promise.resolve();
    }
    const result = {
      collisions: field.collisionCount,
      objects: field.group.children.length,
    };
    field.dispose();
    return result;
  });
  expect(result.collisions).toBeGreaterThan(0);
  expect(result.objects).toBe(48);
});
