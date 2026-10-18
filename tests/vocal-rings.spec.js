import { test, expect } from "@playwright/test";

test("24 floating bubbles require real volume entry and respect silence", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createVocalBubbles } =
      await import("/src/sonoizo/createVocalBubbles.js");
    let calls = 0;
    const scores = [];
    const rings = createVocalBubbles({
      onScore: (count, total) => scores.push([count, total]),
      fragments: Array.from({ length: 24 }, (_, i) => ({
        id: `firefly-${i + 1}`,
      })),
      collide: async () => {
        calls++;
        return true;
      },
    });
    const first = rings.group.children[0],
      normal = new THREE.Vector3(0, 0, 1).applyQuaternion(first.quaternion);
    const pose = {
      position: first.position.clone().addScaledVector(normal, 4),
    };
    rings.update(0.016, pose);
    pose.position.copy(first.position).addScaledVector(normal, -4);
    rings.update(0.016, pose);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const count = rings.collisionCount;
    pose.position.copy(first.position).addScaledVector(normal, 4);
    rings.update(0.016, pose);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const actualCalls = calls;
    for (let i = 0; i < 60; i++) rings.update(1 / 60, pose);
    const disappeared = !rings.group.children.includes(first);
    const remaining = rings.remaining;
    rings.dispose();
    return {
      count,
      actualCalls,
      total: rings.count,
      disappeared,
      remaining,
      scores,
    };
  });
  expect(result).toEqual({
    count: 1,
    actualCalls: 1,
    total: 24,
    disappeared: true,
    remaining: 23,
    scores: [[1, 24]],
  });
});

test("mood sky owns a bounded dome with different pigment palettes", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { echoMoodEngine } = await import("/src/echoMood/echoMoodEngine.js");
    const { universeGenerator } =
      await import("/src/echoMood/universeGenerator.js");
    const { createMoodAtmosphere } =
      await import("/src/echoMood/createMoodAtmosphere.js");
    const a = createMoodAtmosphere(
      universeGenerator(echoMoodEngine(["🌊", "🌙"], 1)),
      true,
    );
    const b = createMoodAtmosphere(
      universeGenerator(echoMoodEngine(["🔥", "☀️"], 1)),
      true,
    );
    const colors = [a, b].map((x) =>
      x.object.children[0].material.uniforms.sky.value.getHex(),
    );
    const children = a.object.children.length;
    a.update(10, { energy: 0.5 });
    a.dispose();
    b.dispose();
    return { colors, children };
  });
  expect(result.colors[0]).not.toBe(result.colors[1]);
  expect(result.children).toBe(2);
});

test("all 24 real MP3 decode and the existing player excludes simultaneous voices", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { FIREFLY_FRAGMENTS } = await import("/src/sonoizo/poems.js");
    const { createTwigBank } = await import("/src/sonoizo/createTwigBank.js");
    const errors = [];
    const bank = createTwigBank({
      ids: [],
      onError: (x) => errors.push(x),
    });
    bank.enableFireflies();
    await bank.loadPoems(FIREFLY_FRAGMENTS);
    await bank.preparePlayback();
    const playedAll = [];
    for (const fragment of FIREFLY_FRAGMENTS) {
      playedAll.push(await bank.collide(fragment.id));
      bank.stopAll();
    }
    const played = await bank.collide(FIREFLY_FRAGMENTS[0].id);
    const blocked = await bank.collide(FIREFLY_FRAGMENTS[1].id);
    const speaking = bank.isSpeaking();
    bank.dispose();
    return { playedAll, played, blocked, speaking, errors };
  });
  expect(result.errors).toEqual([]);
  expect(result.playedAll).toHaveLength(24);
  expect(result.playedAll.every((x) => x === true)).toBe(true);
  expect(result.played).toBe(true);
  expect(result.blocked).toBe(false);
  expect(result.speaking).toBe(true);
});

test("nearest bubble selection excludes consumed bubbles and respects the reading pause", async ({
  page,
}) => {
  await page.goto("/");
  const r = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createVocalBubbles } =
      await import("/src/sonoizo/createVocalBubbles.js");
    const bubbles = createVocalBubbles({
      fragments: [{ id: "one" }, { id: "two" }],
      collide: async () => true,
    });
    const first = bubbles.group.children[0],
      second = bubbles.group.children[1],
      result = new THREE.Vector3();
    const nearest =
      bubbles.getNearest(first.position, result) &&
      result.distanceTo(first.position) < 0.001;
    const pose = {
      position: first.position.clone().add(new THREE.Vector3(0, 0, 4)),
    };
    bubbles.update(0.016, pose);
    pose.position.copy(first.position).add(new THREE.Vector3(0, 0, -4));
    bubbles.update(0.016, pose);
    await new Promise((r) => setTimeout(r, 0));
    const blocked = !bubbles.getNearest(pose.position, result);
    bubbles.update(11, pose, false);
    const selected = bubbles.getNearest(first.position, result),
      other = result.distanceTo(second.position) < 0.001;
    bubbles.dispose();
    return { nearest, blocked, selected, other };
  });
  expect(r).toEqual({
    nearest: true,
    blocked: true,
    selected: true,
    other: true,
  });
});
