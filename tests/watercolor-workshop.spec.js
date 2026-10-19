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

async function beginNetwork(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Composer mon ciel" }).click();
  await expect(
    page.getByRole("group", { name: "Mon disque sensoriel" }),
  ).toBeVisible();
}
async function dropEmoji(page, name, u, v) {
  const palette = page.getByRole("button", {
    name: `Ajouter ${name}`,
    exact: true,
  });
  const r = await page
      .getByRole("group", { name: "Mon disque sensoriel" })
      .boundingBox(),
    p = await palette.boundingBox();
  await page.mouse.move(p.x + p.width / 2, p.y + p.height / 2);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width * u, r.y + r.height * v, { steps: 12 });
  await page.mouse.up();
}
async function dragNode(page, name, u, v) {
  const n = page.getByRole("button", { name: `Déplacer ${name}`, exact: true }),
    b = await n.boundingBox(),
    r = await page
      .getByRole("group", { name: "Mon disque sensoriel" })
      .boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width * u, r.y + r.height * v, { steps: 15 });
  await page.mouse.up();
}

test("sensory palette surrounds the disc, supports drag/drop and collision linking and unlinking", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await beginNetwork(page);
  const disc = page.getByRole("group", { name: "Mon disque sensoriel" }),
    r = await disc.boundingBox();
  const palette = page
    .getByRole("group", { name: "Palette sensorielle" })
    .getByRole("button");
  await expect(palette).toHaveCount(12);
  const boxes = await palette.evaluateAll((nodes) =>
    nodes.map((n) => {
      const b = n.getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    }),
  );
  expect(
    boxes.every(
      (p) =>
        Math.hypot(p.x - r.x - r.width / 2, p.y - r.y - r.height / 2) >
        r.width / 2,
    ),
  ).toBe(true);
  await dropEmoji(page, "Ondes", 0.27, 0.5);
  await dropEmoji(page, "Chaleur", 0.72, 0.5);
  await expect(disc.locator(".sensory-node")).toHaveCount(2);
  await dragNode(page, "Chaleur", 0.35, 0.5);
  await expect(disc.locator("line")).toHaveCount(1);
  await dragNode(page, "Chaleur", 0.72, 0.5);
  await expect(disc.locator("line")).toHaveCount(1);
  await dragNode(page, "Chaleur", 0.35, 0.5);
  await expect(disc.locator("line")).toHaveCount(0);
  await page.getByRole("slider", { name: "Taille de l’émoji" }).fill("72");
  await page.getByRole("slider", { name: "Opacité de l’émoji" }).fill("0.4");
  await expect(
    page.getByRole("button", { name: "Déplacer Chaleur" }),
  ).toHaveCSS("opacity", "0.4");
  await expect(
    page.getByRole("button", { name: "Déplacer Chaleur" }),
  ).toHaveCSS("width", "72px");
  await page.getByRole("button", { name: "Supprimer l’émoji" }).click();
  await expect(disc.locator(".sensory-node")).toHaveCount(1);
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(disc.locator(".sensory-node")).toHaveCount(2);
});

test("custom instruction and the linked composition survive an animated autonomous 360 visit", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requests = [],
    errors = [];
  page.on("request", (r) => {
    if (/\.mp3(?:\?|$)/.test(r.url())) requests.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /WebGL|shader|THREE/.test(m.text()))
      errors.push(m.text());
  });
  await page.goto("/");
  await page.getByText("Personnaliser la consigne", { exact: true }).click();
  await page
    .getByRole("textbox", { name: "Consigne du thérapeute" })
    .fill("les sensations de cette promenade.");
  await page.getByRole("button", { name: "Composer mon ciel" }).click();
  await expect(page.locator(".sensory-instruction summary")).toContainText(
    "les sensations de cette promenade.",
  );
  await dropEmoji(page, "Ondes", 0.3, 0.5);
  await dropEmoji(page, "Légèreté", 0.7, 0.5);
  await dragNode(page, "Légèreté", 0.38, 0.5);
  await dragNode(page, "Légèreté", 0.68, 0.5);
  expect(requests).toEqual([]);
  const before = await page.locator(".sensory-node").evaluateAll((nodes) =>
    nodes.map((n) => ({
      id: n.dataset.nodeId,
      style: n.getAttribute("style"),
    })),
  );
  await page.getByRole("button", { name: "Révéler mon paysage" }).click();
  const world = page.locator("#stage canvas");
  await expect(world).toBeVisible();
  await expect
    .poll(
      async () =>
        JSON.parse((await world.getAttribute("data-sensory-network")) || "{}")
          .links,
    )
    .toBe(1);
  const stats = JSON.parse(await world.getAttribute("data-sensory-network"));
  expect(stats.nodes).toBe(2);
  expect(stats.particles).toBeGreaterThan(40);
  const time = await world.getAttribute("data-material-time");
  await expect
    .poll(() => world.getAttribute("data-material-time"))
    .not.toBe(time);
  await page.getByRole("button", { name: "Voyager", exact: true }).click();
  const pos = await world.getAttribute("data-camera-position");
  await expect
    .poll(() => world.getAttribute("data-camera-position"))
    .not.toBe(pos);
  await page.getByRole("button", { name: "Suspendre le voyage" }).click();
  await page.getByRole("button", { name: "Revenir à la composition" }).click();
  await expect(
    page.getByRole("group", { name: "Mon disque sensoriel" }),
  ).toBeVisible();
  expect(
    await page.locator(".sensory-node").evaluateAll((nodes) =>
      nodes.map((n) => ({
        id: n.dataset.nodeId,
        style: n.getAttribute("style"),
      })),
    ),
  ).toEqual(before);
  await expect(page.locator(".sensory-disc-links line")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("graph contacts are one toggle per drag and preserve disc bounds and valid edges", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const {
      emptySensoryGraph,
      addSensoryNode,
      moveSensoryNode,
      removeSensoryNode,
    } = await import("/src/chill/sensoryGraph.js");
    let g = emptySensoryGraph();
    g = addSensoryNode(g, {
      id: "a",
      emojiId: "water",
      u: 0.3,
      v: 0.5,
      size: 0.2,
      opacity: 0.8,
    });
    g = addSensoryNode(g, {
      id: "b",
      emojiId: "warm",
      u: 0.7,
      v: 0.5,
      size: 0.2,
      opacity: 0.5,
    });
    const contacts = new Set();
    g = moveSensoryNode(g, "b", { u: 0.4, v: 0.5 }, contacts);
    const linked = g.links.length;
    for (let i = 0; i < 20; i++)
      g = moveSensoryNode(g, "b", { u: 0.4 + i * 0.0001, v: 0.5 }, contacts);
    const jitter = g.links.length;
    g = moveSensoryNode(g, "b", { u: 0.8, v: 0.5 }, new Set());
    g = moveSensoryNode(g, "b", { u: 0.4, v: 0.5 }, new Set());
    const unlinked = g.links.length;
    g = moveSensoryNode(g, "b", { u: 8, v: 8 });
    const n = g.nodes.find((n) => n.id === "b");
    g = removeSensoryNode(g, "a");
    return {
      linked,
      jitter,
      unlinked,
      radius: Math.hypot(n.u - 0.5, n.v - 0.5),
      dangling: g.links.some((l) => l.a === "a" || l.b === "a"),
    };
  });
  expect(result.linked).toBe(1);
  expect(result.jitter).toBe(1);
  expect(result.unlinked).toBe(0);
  expect(result.radius).toBeLessThanOrEqual(0.40001);
  expect(result.dangling).toBe(false);
});

test("3D node and connection flows react locally to audio and dispose their resources", async ({
  page,
}) => {
  await page.goto("/");
  const r = await page.evaluate(async () => {
    const { createSensoryNetwork } =
      await import("/src/chill/createSensoryNetwork.js");
    const n = createSensoryNetwork();
    n.setDocument({
      nodes: [
        { id: "a", emojiId: "water", u: 0.4, v: 0.5, size: 0.2, opacity: 0.5 },
        { id: "b", emojiId: "warm", u: 0.6, v: 0.5, size: 0.2, opacity: 0.8 },
      ],
      links: [{ a: "a", b: "b" }],
    });
    const points = n.group.children.find((m) => m.isPoints),
      line = n.group.children.find((m) => m.isLineSegments),
      before = Array.from(points.geometry.attributes.position.array),
      colors = Array.from(line.geometry.attributes.color.array);
    for (let i = 0; i < 60; i++)
      n.update(
        0,
        { bands: [0.9, 0.1, 0.7, 0.2, 0.1, 0.3], energy: 0.8 },
        1 / 60,
      );
    const changed = before.some(
        (x, i) =>
          Math.abs(x - points.geometry.attributes.position.array[i]) > 0.001,
      ),
      flow = colors.some(
        (x, i) => Math.abs(x - line.geometry.attributes.color.array[i]) > 0.001,
      );
    let disposed = 0;
    n.group.traverse((o) => {
      if (o.material) o.material.addEventListener("dispose", () => disposed++);
    });
    const stats = n.stats;
    n.dispose();
    return {
      changed,
      flow,
      disposed,
      stats,
      remaining: n.group.children.length,
    };
  });
  expect(r.changed).toBe(true);
  expect(r.flow).toBe(true);
  expect(r.stats.nodes).toBe(2);
  expect(r.stats.links).toBe(1);
  expect(r.disposed).toBeGreaterThanOrEqual(7);
  expect(r.remaining).toBe(0);
});

test.describe("mobile touch composition", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  test("a native touch drag drops an emoji from the outer palette", async ({
    page,
    context,
  }) => {
    await beginNetwork(page);
    const palette = await page
        .getByRole("button", { name: "Ajouter Bulles", exact: true })
        .boundingBox(),
      disc = await page
        .getByRole("group", { name: "Mon disque sensoriel" })
        .boundingBox();
    const client = await context.newCDPSession(page),
      start = {
        x: palette.x + palette.width / 2,
        y: palette.y + palette.height / 2,
      },
      end = { x: disc.x + disc.width * 0.5, y: disc.y + disc.height * 0.45 };
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [start],
    });
    for (let i = 1; i <= 12; i++)
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: start.x + ((end.x - start.x) * i) / 12,
            y: start.y + ((end.y - start.y) * i) / 12,
          },
        ],
      });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(
      page.getByRole("button", { name: "Déplacer Bulles", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Révéler mon paysage" }),
    ).toBeEnabled();
  });
});
