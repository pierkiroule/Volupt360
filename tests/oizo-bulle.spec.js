import { test, expect } from "@playwright/test";

async function quickEmergence(page) {
  await page.route("**/src/chill/createBubbleEmergence.js", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text())
        .replace("firstDelay: 12", "firstDelay: .5")
        .replace("interval: 10", "interval: .5")
        .replace("firstSamples: 12", "firstSamples: 1")
        .replace("newSamples: 6", "newSamples: 1")
        .replace("fadeSeconds: 4", "fadeSeconds: .1"),
    });
  });
}
async function paint(page) {
  await page.mouse.move(170, 330);
  await page.mouse.down();
  await page.waitForTimeout(350);
  await page.mouse.up();
}

test("emergence is paint-dependent, sequential and capped at 24 without a forced encounter", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createBubbleEmergence } =
      await import("/src/chill/createBubbleEmergence.js");
    const { CONTEMPLATIVE_PHRASES } =
      await import("/src/chill/contemplativePhrases.js");
    const schedule = createBubbleEmergence(24);
    const initial = schedule.propose(0, 0);
    const noPaint = schedule.propose(100, 0);
    const first = schedule.propose(100, 20);
    const waiting = schedule.propose(200, 200);
    schedule.release(200, 200);
    const tooSoon = schedule.propose(201, 300);
    const second = schedule.propose(211, 300);
    schedule.release(211, 300);
    const rest = [];
    for (let i = 0; i < 24; i++) {
      const time = 240 + i * 40;
      rest.push(schedule.propose(time, 400 + i * 20));
      schedule.release(time, 400 + i * 20);
    }
    return {
      initial,
      noPaint,
      first,
      waiting,
      tooSoon,
      second,
      rest,
      phrases: CONTEMPLATIVE_PHRASES,
    };
  });
  expect(result.initial).toBe(-1);
  expect(result.noPaint).toBe(-1);
  expect(result.first).toBe(0);
  expect(result.waiting).toBe(-1);
  expect(result.tooSoon).toBe(-1);
  expect(result.second).toBe(1);
  expect(result.rest.slice(-2)).toEqual([-1, -1]);
  expect(result.phrases).toHaveLength(24);
  expect(new Set(result.phrases.map((x) => x.text)).size).toBe(24);
});

test("a real swept 3D crossing enters once, holds until resume, then dissolves", async ({
  page,
}) => {
  await page.goto("/");
  const r = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createVocalBubbles } =
      await import("/src/sonoizo/createVocalBubbles.js");
    let hits = 0;
    const bubbles = createVocalBubbles({
      fragments: [{ id: "one" }, { id: "two" }],
      emergence: {
        firstDelay: 1,
        firstSamples: 1,
        fadeSeconds: 0.1,
        interval: 2,
        newSamples: 1,
      },
      collide: () => {
        hits++;
        return true;
      },
    });
    const pose = {
      position: new THREE.Vector3(),
      direction: new THREE.Vector3(0, 0, 1),
    };
    bubbles.notifyPaint(pose.position, 20);
    bubbles.setElapsed(0);
    bubbles.update(0.01, pose);
    const initial = bubbles.group.children.filter((x) => x.visible).length;
    bubbles.setElapsed(2);
    bubbles.update(0.01, pose);
    const visible = bubbles.group.children.filter((x) => x.visible).length;
    const center = bubbles.group.children
      .find((x) => x.visible)
      .position.clone();
    pose.position.copy(center).add(new THREE.Vector3(-5, 0, 0));
    bubbles.update(0.01, pose, false);
    bubbles.setElapsed(3);
    // Apparent screen crossing with 8 units of true depth must miss.
    pose.position.copy(center).add(new THREE.Vector3(5, 0, 8));
    bubbles.update(0.01, pose, true);
    await new Promise((r) => setTimeout(r, 0));
    const miss = hits;
    pose.position.copy(center).add(new THREE.Vector3(-5, 0, 0));
    bubbles.update(0.01, pose, false);
    pose.position.copy(center).add(new THREE.Vector3(5, 0, 0));
    bubbles.update(0.01, pose, true);
    await new Promise((r) => setTimeout(r, 0));
    for (let i = 0; i < 50; i++) bubbles.update(0.1, pose, true);
    const held = bubbles.activeCount;
    bubbles.resume();
    for (let i = 0; i < 10; i++) bubbles.update(0.1, pose, false);
    const remainingMeshes = bubbles.group.children.length;
    bubbles.dispose();
    return { initial, visible, miss, hits, held, remainingMeshes };
  });
  expect(r).toEqual({
    initial: 0,
    visible: 1,
    miss: 0,
    hits: 1,
    held: 1,
    remainingMeshes: 1,
  });
});

test("mobile contemplation freezes bird and active timeline, rotates only the view, and restores immediate painting twice", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  await quickEmergence(page);
  await page.addInitScript(() => {
    window.DeviceOrientationEvent = class extends Event {
      static requestPermission() {
        window.__gyroRequested = true;
        return Promise.resolve("denied");
      }
    };
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      window.__music = this;
      return play.apply(this, args);
    };
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  await expect(
    page.getByRole("checkbox", { name: /Utiliser le gyroscope/ }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Prendre son envol" }).click();
  expect(await page.evaluate(() => window.__gyroRequested)).toBe(true);
  const canvas = page.locator("#stage canvas");
  await expect(canvas).toHaveAttribute("data-active-resonance-bubbles", "0");
  await page
    .getByRole("button", { name: "Grain minéral", exact: true })
    .click();
  for (let i = 0; i < 2; i++) {
    await paint(page);
    const resume = page.getByRole("button", {
      name: "Reprendre le vol",
      exact: true,
    });
    await expect(resume).toBeVisible({ timeout: 30000 });
    await expect(canvas).toHaveAttribute(
      "data-experience-state",
      "CONTEMPLATION",
    );
    await page.waitForTimeout(1400);
    const before = await canvas.evaluate((e) => ({ ...e.dataset }));
    const audioTime = await page.evaluate(() => window.__music.currentTime);
    await expect(page.getByRole("button")).toHaveCount(2);
    await page.mouse.move(80, 300);
    await page.mouse.down();
    await page.mouse.move(290, 430, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    const after = await canvas.evaluate((e) => ({ ...e.dataset }));
    expect(after.painterPosition).toBe(before.painterPosition);
    expect(after.experienceTime).toBe(before.experienceTime);
    expect(after.paintedSamples).toBe(before.paintedSamples);
    expect(after.cameraPosition).toBe(before.cameraPosition);
    expect(after.cameraOrientation).not.toBe(before.cameraOrientation);
    expect(after.vocalCollisions).toBe(String(i + 1));
    expect(
      await page.evaluate(() => window.__music.currentTime),
    ).toBeGreaterThan(audioTime);
    expect(await page.evaluate(() => window.__music.paused)).toBe(false);
    if (i === 0) {
      await page.screenshot({ path: "/tmp/oizo-bulle-contemplation.png" });
      await expect(page.locator(".resonance-phrase")).toHaveCount(0, {
        timeout: 6000,
      });
    }
    await resume.click();
    await expect(canvas).toHaveAttribute("data-experience-state", "FLIGHT");
    await expect(canvas).toHaveAttribute("data-active-brush", "falaises");
    await page.mouse.move(160, 330);
    await page.mouse.down();
    await expect(canvas).toHaveAttribute("data-nozzle-paint", "true");
    await page.waitForTimeout(100);
    await page.mouse.up();
    await expect
      .poll(async () =>
        Number(await canvas.getAttribute("data-experience-time")),
      )
      .toBeGreaterThan(Number(before.experienceTime) + 0.1);
  }
  await page.screenshot({ path: "/tmp/oizo-bulle-flight.png" });
  expect(errors).toEqual([]);
});

for (const sensorType of ["deviceorientation", "deviceorientationabsolute"]) {
  test(`granted ${sensorType} changes only orientation at a fixed POV and cleans up`, async ({
    page,
  }) => {
    await page.goto("/");
    const result = await page.evaluate(async (sensorType) => {
      const THREE = await import("/node_modules/.vite/deps/three.js");
      const { createCameraRig } =
        await import("/src/engine/createCameraRig.js");
      window.DeviceOrientationEvent = class extends Event {
        static requestPermission() {
          return Promise.resolve("granted");
        }
      };
      const camera = new THREE.PerspectiveCamera(80, 1, 0.08, 1000);
      camera.position.set(2, 3, -3);
      camera.lookAt(2, 3, 4);
      const canvas = document.createElement("canvas"),
        landscape = new THREE.Group();
      const state = {
        position: new THREE.Vector3(2, 3, 4),
        direction: new THREE.Vector3(0, 0, 1),
        bounds: { center: new THREE.Vector3(), radius: 10 },
        chill: true,
        windEnabled: true,
      };
      const rig = createCameraRig(
        camera,
        canvas,
        landscape,
        () => state,
        () => {},
      );
      const permission = await rig.requestGyroscope();
      await rig.enterContemplation(state.position);
      const advance = () => {
        for (let i = 0; i < 240; i++) rig.update(1 / 60);
      };
      advance();
      const at = camera.position.toArray();
      const sensor = (alpha) => {
        const event = new Event(sensorType);
        Object.assign(event, { alpha, beta: 60, gamma: 0 });
        window.dispatchEvent(event);
      };
      sensor(0);
      advance();
      const before = camera.quaternion.clone();
      sensor(70);
      advance();
      const after = camera.quaternion.clone();
      const moved = camera.position.distanceTo(state.position);
      rig.dispose();
      sensor(170);
      advance();
      return {
        permission,
        at,
        moved,
        angle: before.angleTo(after),
        afterDispose: after.angleTo(camera.quaternion),
        status: canvas.dataset.gyroscopeStatus,
      };
    }, sensorType);
    expect(result.status).toBe("active");
    expect(result.permission).toBe(true);
    expect(result.at).toEqual([2, 3, 4]);
    expect(result.moved).toBeLessThan(1e-8);
    expect(result.angle).toBeGreaterThan(0.1);
    expect(result.afterDispose).toBeLessThan(0.0001);
  });
}

test("all eight symbolic brush signatures deposit different original watercolor geometries", async ({
  page,
}) => {
  await page.goto("/");
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const data = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { MOOD_BRUSHES } = await import("/src/chill/moodBrushes.js");
    const { createBrushStroke, disposeMark } =
      await import("/src/engine/brushes.js");
    const scene = new THREE.Scene(),
      renderer = new THREE.WebGLRenderer();
    renderer.setSize(64, 64);
    const camera = new THREE.PerspectiveCamera(70, 1, 0.08, 100);
    camera.position.set(0, 3, 9);
    camera.lookAt(0, 0, 0);
    const signatures = [];
    for (const profile of MOOD_BRUSHES) {
      const stroke = createBrushStroke(profile.baseId, {
        seed: 12,
        color: new THREE.Color(profile.color),
        dynamics: profile,
      });
      for (let i = 0; i < 16; i++)
        stroke.append({
          position: new THREE.Vector3(
            i * 0.2 - 1.5,
            Math.sin(i * 0.2) * 0.2,
            0,
          ),
          direction: new THREE.Vector3(1, 0, 0),
          side: new THREE.Vector3(0, 0, 1),
          up: new THREE.Vector3(0, 1, 0),
          time: i * 0.1,
          energy: 0.4,
          low: 0.3,
          motion: 0.5,
          density: 0.8,
        });
      stroke.finish();
      scene.add(stroke.group);
      renderer.render(scene, camera);
      let vertices = 0,
        checksum = 0;
      stroke.group.traverse((o) => {
        if (o.isMesh) {
          const p = o.geometry.attributes.position;
          vertices += p.count;
          for (let i = 0; i < p.count; i++)
            checksum += Math.abs(p.getY(i)) * (1 + (i % 11));
        }
      });
      signatures.push(`${vertices}:${checksum.toFixed(3)}`);
      stroke.group.removeFromParent();
      disposeMark(stroke.group);
    }
    renderer.dispose();
    return signatures;
  });
  expect(new Set(data).size).toBe(8);
  expect(errors).toEqual([]);
});

test("disabling gyro explicitly preserves tactile mode without requesting sensor permission", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.DeviceOrientationEvent = class extends Event {
      static requestPermission() {
        window.__gyroRequested = true;
        return Promise.resolve("granted");
      }
    };
  });
  await page.goto("/");
  const option = page.getByRole("checkbox", { name: /Utiliser le gyroscope/ });
  await expect(option).toBeChecked();
  await option.uncheck();
  await page.getByRole("button", { name: "Prendre son envol" }).click();
  await expect(page.locator("#stage canvas")).toHaveAttribute(
    "data-gyroscope-status",
    "disabled",
  );
  expect(await page.evaluate(() => Boolean(window.__gyroRequested))).toBe(
    false,
  );
});
