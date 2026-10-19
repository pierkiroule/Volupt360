import { test, expect } from "@playwright/test";

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

test("manual steering holds a stable heading despite camera feedback; release restores the orbit", async ({
  page,
}) => {
  await page.goto("/");
  const r = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { createPointFlight } =
      await import("/src/engine/createPointFlight.js");
    function run(x, y, fps) {
      const f = createPointFlight();
      f.setSculptureAssist(true);
      f.setOrbitTarget(new THREE.Vector3(), 16);
      f.beginPilot();
      const frame = {
        right: new THREE.Vector3(-1, 0, 0),
        up: new THREE.Vector3(0, 1, 0),
      };
      let p, stable;
      for (let i = 0; i < fps * 12; i++) {
        if (p)
          frame.right
            .crossVectors(p.direction, new THREE.Vector3(0, 1, 0))
            .normalize();
        f.setPilot(x, y, frame);
        p = f.update(1 / fps, {});
        if (i === fps * 6) stable = p.direction.clone();
      }
      const heading = p.direction.clone(),
        alignment = stable.dot(p.direction);
      f.releasePilot();
      let maxStep = 0;
      for (let i = 0; i < fps * 360; i++) {
        const before = p.position.clone();
        p = f.update(1 / fps, {});
        maxStep = Math.max(maxStep, before.distanceTo(p.position));
      }
      return {
        heading: heading.toArray(),
        alignment,
        radius: p.position.length(),
        maxStep,
        autonomous: p.autonomous,
      };
    }
    return {
      right: run(0.65, 0, 60),
      left: run(-0.65, 0, 60),
      up: run(0, 0.65, 60),
      neutral: run(0, 0, 60),
      slow: run(0.65, 0, 30),
    };
  });
  expect(r.right.heading[0]).toBeLessThan(-0.3);
  expect(r.left.heading[0]).toBeGreaterThan(0.3);
  expect(r.up.heading[1]).toBeGreaterThan(0.25);
  expect(Math.abs(r.neutral.heading[0])).toBeLessThan(0.001);
  for (const p of Object.values(r)) {
    expect(p.alignment).toBeGreaterThan(0.9999);
    expect(p.radius).toBeLessThan(26);
    expect(p.maxStep).toBeLessThan(0.09);
    expect(p.autonomous).toBe(true);
  }
  expect(Math.abs(r.right.heading[0] - r.slow.heading[0])).toBeLessThan(0.001);
});

test("twelve brush families have distinct engines, colors and responsive pigment or particle materials", async ({
  page,
}) => {
  await page.goto("/");
  const r = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { WORKSHOP_BRUSHES } = await import("/src/chill/workshopBrushes.js");
    const { createBrushStroke } = await import("/src/engine/brushes.js");
    return WORKSHOP_BRUSHES.map((profile) => {
      const stroke = createBrushStroke(profile.baseId, {
        seed: profile.seed,
        color: new THREE.Color(profile.color),
        dynamics: profile,
      });
      for (let i = 0; i < 12; i++)
        stroke.append({
          position: new THREE.Vector3(i * 0.1, 0, 0),
          direction: new THREE.Vector3(1, 0, 0),
          side: new THREE.Vector3(0, 1, 0),
          up: new THREE.Vector3(0, 0, 1),
          time: i * 0.1,
          energy: 0.5,
          low: 0.4,
          motion: 0.2,
          accent: 0.3,
          wake: true,
          depositionTime: i * 0.1,
        });
      const materials = [];
      stroke.group.traverse((mesh) => {
        if (mesh.isMesh) materials.push(mesh.material);
      });
      const result = {
        id: profile.id,
        color: profile.color,
        engine: profile.baseId,
        count: materials.length,
        material:
          materials[0]?.uniforms.uMaterialMode?.value ??
          materials[0]?.uniforms.uPaintDots?.value,
        gain: profile.responseGain,
      };
      stroke.group.traverse((mesh) => {
        mesh.geometry?.dispose();
        mesh.material?.dispose();
      });
      return result;
    });
  });
  expect(r).toHaveLength(12);
  expect(new Set(r.map((p) => p.engine)).size).toBe(12);
  expect(new Set(r.map((p) => p.color)).size).toBe(12);
  for (const brush of r) {
    expect(brush.count).toBeGreaterThan(0);
    expect(brush.gain).toBeGreaterThan(2);
    expect(brush.material).toBeGreaterThan(0);
  }
});

test("gold particles archive into a shared frozen batch and release their resources", async ({
  page,
}) => {
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error" && /WebGL|shader|THREE/.test(m.text()))
      errors.push(m.text());
  });
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { WORKSHOP_BRUSHES } = await import("/src/chill/workshopBrushes.js");
    const { createBrushStroke, disposeMark } =
      await import("/src/engine/brushes.js");
    const { createPigmentArchive } =
      await import("/src/chill/createPigmentArchive.js");
    const profile = WORKSHOP_BRUSHES.find((p) => p.id === "lucioles");
    const archive = createPigmentArchive();
    for (let j = 0; j < 3; j++) {
      const stroke = createBrushStroke(profile.baseId, {
        seed: j,
        color: new THREE.Color(profile.color),
        dynamics: profile,
      });
      for (let i = 0; i < 15; i++)
        stroke.append({
          position: new THREE.Vector3(i * 0.1, j, 0),
          side: new THREE.Vector3(1, 0, 0),
          up: new THREE.Vector3(0, 1, 0),
          direction: new THREE.Vector3(0, 0, 1),
          energy: 0.5,
        });
      stroke.update(1, { energy: 0.5, low: 0.2, pulse: 0.3 });
      archive.add({
        stroke,
        object: stroke.group,
        brush: profile.id,
        bounds: new THREE.Box3(new THREE.Vector3(), new THREE.Vector3(3, 3, 3)),
      });
      disposeMark(stroke.group);
    }
    archive.settle();
    const data = archive.group.children[0].geometry.attributes;
    const finite = ["position", "aOffset", "aTint", "aBirth"].every((name) =>
      Array.from(data[name].array).every(Number.isFinite),
    );
    const stats = archive.stats;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#fff");
    scene.add(archive.group);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(100, 100);
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    let disposed = 0;
    archive.group.children[0].geometry.addEventListener(
      "dispose",
      () => disposed++,
    );
    archive.dispose();
    renderer.dispose();
    return { finite, stats, disposed };
  });
  expect(result.finite).toBe(true);
  expect(result.stats.traces).toBe(3);
  expect(result.stats.batches).toBe(1);
  expect(result.disposed).toBe(1);
  expect(errors).toEqual([]);
});

test("detailed watercolor plates keep seeded grain, tide data and seamless continuous coverage", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createPigmentPlate } =
      await import("/src/chill/createPigmentPlate.js");
    const { createWatercolorTexture } =
      await import("/src/engine/createWatercolorTexture.js");
    const read = (seed) =>
      createPigmentPlate("wash", seed, 128, true)
        .getContext("2d")
        .getImageData(0, 0, 128, 128).data;
    const a = read(123),
      b = read(123),
      c = read(124);
    let equal = true,
      changed = 0,
      seam = 0,
      empty = 0;
    const loads = new Set(),
      paper = new Set(),
      tides = new Set();
    for (let i = 0; i < a.length; i++) {
      equal = equal && a[i] === b[i];
      changed += a[i] !== c[i] ? 1 : 0;
    }
    for (let x = 0; x < 128; x++)
      for (let k = 0; k < 4; k++)
        seam = Math.max(
          seam,
          Math.abs(a[x * 4 + k] - a[(127 * 128 + x) * 4 + k]),
        );
    for (let i = 0; i < a.length; i += 4) {
      loads.add(a[i]);
      paper.add(a[i + 1]);
      tides.add(a[i + 2]);
      if (a[i + 3] === 0) empty++;
    }
    const texture = createWatercolorTexture(
      { kind: "dry", detailed: true, continuous: true },
      123,
      128,
    );
    let disposed = false;
    texture.texture.addEventListener("dispose", () => (disposed = true));
    texture.texture.dispose();
    return {
      equal,
      changed,
      seam,
      empty,
      loads: loads.size,
      paper: paper.size,
      tides: tides.size,
      detailed: texture.detailed,
      colorSpace: texture.texture.colorSpace,
      disposed,
    };
  });
  expect(result.equal).toBe(true);
  expect(result.changed).toBeGreaterThan(10000);
  expect(result.seam).toBe(0);
  expect(result.empty).toBeGreaterThan(100);
  expect(result.loads).toBeGreaterThan(100);
  expect(result.paper).toBeGreaterThan(100);
  expect(result.tides).toBeGreaterThan(100);
  expect(result.detailed && result.disposed).toBe(true);
  expect(result.colorSpace).toBe("");
});

test("panorama journey latches its heading and decelerates without stopping drawing or audio", async ({
  page,
}) => {
  await page.goto("/");
  const r = await page.evaluate(async () => {
    const T = await import("/node_modules/.vite/deps/three.js");
    const { createPanoramaJourney } =
      await import("/src/engine/createPanoramaJourney.js");
    const j = createPanoramaJourney(),
      look = new T.Vector3(1, 0, 0);
    j.travel(look);
    look.set(0, 1, 0);
    for (let i = 0; i < 180; i++) j.update(1 / 60);
    const moved = j.position.clone(),
      heading = j.direction.toArray();
    j.stop();
    for (let i = 0; i < 120; i++) j.update(1 / 60);
    const stopped = j.position.clone();
    for (let i = 0; i < 60; i++) j.update(1 / 60);
    return {
      heading,
      distance: moved.distanceTo(new T.Vector3(0, 0, 20)),
      tail: stopped.distanceTo(j.position),
      slowing: stopped.distanceTo(moved),
      moving: j.moving,
    };
  });
  expect(r.heading).toEqual([1, 0, 0]);
  expect(r.distance).toBeGreaterThan(2);
  expect(r.slowing).toBeLessThan(0.3);
  expect(r.tail).toBeLessThan(0.001);
  expect(r.moving).toBe(false);
});

test("paper-to-world projection wraps the same composition deterministically with depth by layer", async ({
  page,
}) => {
  await page.goto("/");
  const r = await page.evaluate(async () => {
    const { paintingToWorld } = await import("/src/chill/paintingToWorld.js");
    const front = paintingToWorld({ u: 0.5, v: 0.5 }, 0, 3, 0.04),
      back = paintingToWorld({ u: 0, v: 0.5 }, 0, 3, 0.04),
      seam = paintingToWorld({ u: 1, v: 0.5 }, 0, 3, 0.04),
      layer = paintingToWorld({ u: 0.5, v: 0.5 }, 2, 3, 0.04);
    return {
      front: front.toArray(),
      back: back.toArray(),
      seam: seam.distanceTo(back),
      separation: front.distanceTo(layer),
      repeat: front.equals(paintingToWorld({ u: 0.5, v: 0.5 }, 0, 3, 0.04)),
    };
  });
  expect(r.front[2]).toBeLessThan(20);
  expect(r.back[2]).toBeGreaterThan(20);
  expect(r.seam).toBeLessThan(0.000001);
  expect(r.separation).toBeCloseTo(3);
  expect(r.repeat).toBe(true);
});

test("archived pigments keep a local audio envelope in the audiovisual world", async ({
  page,
}) => {
  await page.goto("/");
  const r = await page.evaluate(async () => {
    const T = await import("/node_modules/.vite/deps/three.js");
    const { createBrushStroke } = await import("/src/engine/brushes.js");
    const { createPigmentArchive } =
      await import("/src/chill/createPigmentArchive.js");
    const stroke = createBrushStroke("voiles", {
      seed: 5,
      color: new T.Color("#eb315c"),
      dynamics: { materialMode: 3, planarWash: true, opacity: 0.9, width: 0.8 },
    });
    for (let i = 0; i < 4; i++)
      stroke.append({
        position: new T.Vector3(i, 0, 0),
        direction: new T.Vector3(1, 0, 0),
        side: new T.Vector3(0, 1, 0),
        up: new T.Vector3(0, 0, 1),
        time: i,
        energy: 0.4,
        low: 0.2,
      });
    const archive = createPigmentArchive();
    archive.add({
      stroke,
      object: stroke.group,
      brush: "voiles",
      bounds: new T.Box3(),
    });
    const u = archive.group.children[0].material.uniforms;
    const silent = u.uAudioEnergy.value;
    archive.animate({ energy: 0.7, low: 0.5, pulse: 0.3 }, 0.1, 4);
    const result = {
      silent,
      energy: u.uAudioEnergy.value,
      low: u.uAudioLow.value,
      time: u.uTime.value,
    };
    archive.dispose();
    stroke.group.traverse((m) => {
      m.geometry?.dispose();
      m.material?.dispose();
    });
    return result;
  });
  expect(r.silent).toBe(0);
  expect(r.energy).toBeGreaterThan(0.8);
  expect(r.low).toBeGreaterThan(0.8);
  expect(r.time).toBeGreaterThan(0);
});

test("sensory signatures have distinct smooth spectral responses and preserve legacy defaults", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { SENSORY_QUALITIES } =
      await import("/src/chill/sensoryQualities.js");
    const { createMaterialResponse } =
      await import("/src/engine/createMaterialResponse.js");
    const signatures = Object.values(SENSORY_QUALITIES).map((s) => {
      const run = createMaterialResponse("voiles", 1, s);
      const audio = {
        bands: [0.8, 0.6, 0.4, 0.3, 0.2, 0.1],
        energy: 0.4,
        pulse: 0.5,
      };
      const first = { ...run(audio, 1 / 60) };
      for (let i = 0; i < 90; i++) run(audio, 1 / 60);
      const sustained = { ...run(audio, 1 / 60) };
      for (let i = 0; i < 600; i++) run({ energy: 0 }, 1 / 60);
      return { first, sustained, silent: { ...run({ energy: 0 }, 1 / 60) } };
    });
    const old = createMaterialResponse("voiles", 7);
    const fallback = createMaterialResponse("voiles", 7, null);
    const audio = { energy: 0.3, low: 0.2, high: 0.1, pulse: 0.2 };
    return {
      signatures,
      legacy:
        JSON.stringify(old(audio, 0.016)) ===
        JSON.stringify(fallback(audio, 0.016)),
    };
  });
  expect(result.legacy).toBe(true);
  expect(
    new Set(result.signatures.map((s) => s.sustained.energy.toFixed(4))).size,
  ).toBeGreaterThan(5);
  for (const s of result.signatures) {
    expect(s.first.energy).toBeGreaterThan(0);
    expect(s.first.energy).toBeLessThan(s.sustained.energy);
    expect(s.silent.energy).toBeLessThan(0.001);
    for (const v of Object.values(s.sustained)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  }
});

test("guided FPV stays near the sculpture under sustained outward steering and pauses smoothly", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const T = await import("/node_modules/.vite/deps/three.js");
    const { createPanoramaJourney } =
      await import("/src/engine/createPanoramaJourney.js");
    const j = createPanoramaJourney(),
      center = new T.Vector3(0, 0, 12),
      outward = new T.Vector3();
    j.setSculpture(center, 8);
    j.travel(new T.Vector3(0, 0, 1));
    let minDistance = Infinity,
      crossings = 0,
      previousX = j.position.x,
      maxSettledDistance = 0,
      maxDistance = 0,
      maxStep = 0,
      returnSeen = false;
    for (let i = 0; i < 60 * 600; i++) {
      outward.subVectors(j.position, center).normalize();
      j.steer(outward, 1 / 60);
      const before = j.position.clone();
      j.update(1 / 60);
      maxStep = Math.max(maxStep, j.position.distanceTo(before));
      maxDistance = Math.max(maxDistance, j.position.distanceTo(center));
      if (i > 60 * 30) {
        minDistance = Math.min(minDistance, j.position.distanceTo(center));
        maxSettledDistance = Math.max(
          maxSettledDistance,
          j.position.distanceTo(center),
        );
        if (previousX * j.position.x < 0) crossings++;
      }
      previousX = j.position.x;
      returnSeen ||= j.returnWeight > 0.5;
    }
    j.stop();
    for (let i = 0; i < 180; i++) j.update(1 / 60);
    const stopped = j.position.clone();
    for (let i = 0; i < 60; i++) j.update(1 / 60);
    return {
      minDistance,
      crossings,
      maxSettledDistance,
      maxDistance,
      maxStep,
      returnSeen,
      tail: j.position.distanceTo(stopped),
      keptGuidance: (j.reset(true), j.guided),
    };
  });
  expect(result.keptGuidance).toBe(true);
  expect(result.returnSeen).toBe(true);
  expect(result.maxDistance).toBeLessThan(8.1);
  expect(result.maxSettledDistance).toBeLessThan(6);
  expect(result.minDistance).toBeLessThan(2);
  expect(result.crossings).toBeGreaterThan(10);
  expect(result.maxStep).toBeLessThan(0.025);
  expect(result.tail).toBeLessThan(0.001);
});

test("sky brush follows a moving aim with continuous finite-speed flight", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const T = await import("/node_modules/.vite/deps/three.js");
    const { createSkyNozzle } = await import("/src/chill/createSkyNozzle.js");
    const flight = createSkyNozzle(),
      target = new T.Vector3(20, 0, 0);
    flight.reset(new T.Vector3());
    let maxStep = 0;
    const first = flight.update(target, 1 / 30).x;
    for (let i = 0; i < 300; i++) {
      const before = flight.position.clone();
      flight.update(target, 1 / 30);
      maxStep = Math.max(maxStep, before.distanceTo(flight.position));
    }
    const settled = flight.position.distanceTo(target);
    target.set(-20, 12, -6);
    const before = flight.position.clone();
    flight.update(target, 0.3);
    return {
      first,
      maxStep,
      settled,
      jump: before.distanceTo(flight.position),
    };
  });
  expect(result.first).toBeGreaterThan(0);
  expect(result.first).toBeLessThan(0.1);
  expect(result.maxStep).toBeLessThanOrEqual(0.201);
  expect(result.settled).toBeLessThan(0.01);
  expect(result.jump).toBeLessThanOrEqual(0.201);
});

async function drawDisc(page, emotion = "Joie") {
  await page.getByRole("button", { name: emotion, exact: true }).click();
  const paper = page.locator(".painting-paper");
  await expect(paper).toBeVisible();
  const r = await paper.boundingBox();
  await page.mouse.move(r.x + r.width * 0.25, r.y + r.height * 0.45);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width * 0.7, r.y + r.height * 0.55, {
    steps: 22,
  });
  await page.mouse.up();
}

test("a silent static disc offers exactly twelve fixed pictorial brushes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const audioRequests = [];
  page.on("request", (r) => {
    if (/\.mp3(?:\?|$)/.test(r.url())) audioRequests.push(r.url());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Dessiner mon ciel" }).click();
  const palette = page.getByRole("group", { name: "Choisir une brosse" });
  await expect(palette.getByRole("button")).toHaveCount(12);
  await expect(page.locator("input")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Révéler mon ciel" }),
  ).toBeDisabled();
  const paper = page.locator(".painting-paper");
  await expect(paper).toBeVisible();
  const r = await paper.boundingBox();
  expect(Math.abs(r.width - r.height)).toBeLessThan(1);
  await page.mouse.click(r.x + 2, r.y + 2);
  await expect(paper).toHaveAttribute("data-stroke-count", "0");
  await drawDisc(page);
  await expect(paper).toHaveAttribute("data-stroke-count", "1");
  const source = await paper.evaluate((c) => c.toDataURL());
  await page.waitForTimeout(180);
  expect(await paper.evaluate((c) => c.toDataURL())).toBe(source);
  const corner = await paper.evaluate((c) =>
    Array.from(c.getContext("2d").getImageData(0, 0, 1, 1).data),
  );
  expect(corner[3]).toBe(0);
  expect(audioRequests).toEqual([]);
  await expect(
    page.getByRole("button", { name: /Stickers|Peindre en 3D|haïku/i }),
  ).toHaveCount(0);
});

test("validation reveals an animated read-only world, music and an autonomous voyage", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.__ambiences = [];
    const NativeAudio = window.Audio;
    window.Audio = function (...args) {
      const element = new NativeAudio(...args);
      window.__ambiences.push(element);
      return element;
    };
    window.Audio.prototype = NativeAudio.prototype;
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /WebGL|shader|THREE/.test(m.text()))
      errors.push(m.text());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Dessiner mon ciel" }).click();
  await drawDisc(page);
  await drawDisc(page, "Tristesse");
  const paper = page.locator(".painting-paper"),
    world = page.locator("#stage canvas:not(.painting-paper)");
  const source = await paper.evaluate((c) => c.toDataURL());
  await page.getByRole("button", { name: "Révéler mon ciel" }).click();
  await expect(paper).toBeHidden();
  await expect(world).toHaveAttribute("data-world-drawing", "false");
  await expect(world).toHaveAttribute("data-journey-guided", "true");
  await expect(
    page.getByRole("group", { name: "Choisir une brosse" }),
  ).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__ambiences.some(
          (a) => !a.paused && /gravity\.mp3/i.test(a.src),
        ),
      ),
    )
    .toBe(true);
  const time = await world.getAttribute("data-material-time");
  await expect
    .poll(() => world.getAttribute("data-material-time"))
    .not.toBe(time);
  const samples = await world.getAttribute("data-painted-samples");
  await page.mouse.move(100, 200);
  await page.mouse.down();
  await page.mouse.move(260, 350, { steps: 15 });
  await page.mouse.up();
  await expect(world).toHaveAttribute("data-painted-samples", samples);
  await page.getByRole("button", { name: "Voyager", exact: true }).click();
  await expect(world).toHaveAttribute("data-journey-moving", "true");
  const position = await world.getAttribute("data-camera-position");
  await expect
    .poll(() => world.getAttribute("data-camera-position"))
    .not.toBe(position);
  await page.getByRole("button", { name: "Suspendre le voyage" }).click();
  await expect(world).toHaveAttribute("data-journey-moving", "false");
  await page.getByRole("button", { name: "Revenir au dessin" }).click();
  await expect(paper).toBeVisible();
  expect(await paper.evaluate((c) => c.toDataURL())).toBe(source);
  expect(
    await page.evaluate(() => window.__ambiences.every((a) => a.paused)),
  ).toBe(true);
  await page.getByRole("button", { name: "Annuler le dernier trait" }).click();
  await expect(paper).toHaveAttribute("data-stroke-count", "1");
  expect(errors).toEqual([]);
});

test("gyro permission refusal retains complete tactile contemplation without changing the route", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.DeviceOrientationEvent = class extends Event {
      static requestPermission() {
        return Promise.resolve("denied");
      }
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Dessiner mon ciel" }).click();
  await drawDisc(page);
  await page.getByRole("button", { name: "Révéler mon ciel" }).click();
  const world = page.locator("#stage canvas:not(.painting-paper)");
  await expect(world).toHaveAttribute("data-gyroscope-status", "denied");
  const before = await world.getAttribute("data-camera-orientation");
  await page.mouse.move(100, 200);
  await page.mouse.down();
  await page.mouse.move(260, 300, { steps: 15 });
  await page.mouse.up();
  await expect
    .poll(() => world.getAttribute("data-camera-orientation"))
    .not.toBe(before);
  await expect(world).toHaveAttribute("data-journey-moving", "false");
});

test("all twelve disc materials leave distinct marks with preset colors and clean undo", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Dessiner mon ciel" }).click();
  const names = await page
    .getByRole("group", { name: "Choisir une brosse" })
    .getByRole("button")
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("aria-label")));
  const signatures = [];
  for (const name of names) {
    await drawDisc(page, name);
    signatures.push(
      await page.locator(".painting-paper").evaluate((c) => c.toDataURL()),
    );
    await page
      .getByRole("button", { name: "Annuler le dernier trait" })
      .click();
  }
  expect(new Set(signatures).size).toBe(12);
  await expect(page.locator(".painting-paper")).toHaveAttribute(
    "data-stroke-count",
    "0",
  );
});

test("gyro turns the look while the autonomous visit remains independent of steering", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.DeviceOrientationEvent = class extends Event {
      static requestPermission() {
        return Promise.resolve("granted");
      }
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Dessiner mon ciel" }).click();
  await drawDisc(page);
  await page.getByRole("button", { name: "Révéler mon ciel" }).click();
  const world = page.locator("#stage canvas:not(.painting-paper)");
  const sensor = (alpha) =>
    page.evaluate((alpha) => {
      const e = new Event("deviceorientation");
      Object.assign(e, { alpha, beta: 80, gamma: 0 });
      window.dispatchEvent(e);
    }, alpha);
  await expect(world).toBeVisible();
  await expect(world).toHaveAttribute("data-camera-mode", "panorama");
  await sensor(0);
  await expect(world).toHaveAttribute("data-gyroscope-status", "active");
  const orientation = await world.getAttribute("data-camera-orientation"),
    position = await world.getAttribute("data-camera-position");
  await sensor(65);
  await expect
    .poll(() => world.getAttribute("data-camera-orientation"))
    .not.toBe(orientation);
  await expect(world).toHaveAttribute("data-camera-position", position);
  await page.getByRole("button", { name: "Voyager", exact: true }).click();
  await expect(world).toHaveAttribute("data-journey-guided", "true");
  await expect
    .poll(() => world.getAttribute("data-camera-position"))
    .not.toBe(position);
  const movingLook = await world.getAttribute("data-camera-orientation");
  await sensor(120);
  await expect
    .poll(() => world.getAttribute("data-camera-orientation"))
    .not.toBe(movingLook);
});
