import * as THREE from "three";
import { createViewEffects, DEFAULT_VIEW } from "./createViewEffects.js";
import { graphicSurprise } from "./graphicSurprises.js";
import { ENABLE_GENERATIVE_TEXTURES } from "./generativeConfig.js";
import { createGenerativeMaterials } from "./createGenerativeMaterials.js";
import { BRUSHES, createBrushStroke, disposeMark } from "./brushes.js";
import { createCameraRig } from "./createCameraRig.js";
import { compositionAt, createTrackPalette } from "./artDirection.js";
import { dissolvePigment } from "./dissolvePigment.js";
import { createPainterFlight } from "./createPainterFlight.js";

/** A living XYZ trail: the painter moves, the watercolor grows behind it,
 * and the drone films that movement instead of circling a fixed installation.
 */
export function createSoundNest(container, { onHint, onError } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor("#f4f0e8");
  renderer.domElement.setAttribute(
    "aria-label",
    "Paysage aquarelle : glisser pour tourner à 360 degrés",
  );
  container.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#f4f0e8");
  const effects = createViewEffects(renderer);
  renderer.domElement.dataset.viewEffects = JSON.stringify(DEFAULT_VIEW);
  const camera = new THREE.PerspectiveCamera(
    80,
    innerWidth / innerHeight,
    0.08,
    1000,
  );
  camera.position.set(-9, 6, 12);
  const landscape = new THREE.Group();
  scene.add(landscape);
  const tip = new THREE.Mesh(
    new THREE.SphereGeometry(0.065, 10, 8),
    new THREE.MeshBasicMaterial({
      color: "#c99571",
      transparent: true,
      opacity: 0.8,
    }),
  );
  tip.visible = false;
  landscape.add(tip);
  const flight = createPainterFlight();
  const navigation = {
    position: new THREE.Vector3(),
    direction: new THREE.Vector3(0.8, 0.18, -1).normalize(),
    velocity: new THREE.Vector3(),
    active: false,
    energy: 0,
    motion: 0,
    phrase: 0,
    progress: 0,
    bounds: { center: new THREE.Vector3(), radius: 10 },
  };
  const rig = createCameraRig(
    camera,
    renderer.domElement,
    landscape,
    () => navigation,
    onHint || (() => {}),
  );
  let brush = "voiles",
    player = null,
    disposed = false,
    frameId;
  let elapsed = 0,
    sampleClock = 0,
    paintedSamples = 0,
    quiet = 0,
    serial = 0,
    activeStroke = null,
    lastSample = null;
  let lastTime = performance.now(),
    lastReport = 0,
    reportState = null,
    boundsDirty = false;
  let palette = createTrackPalette();
  const generative = ENABLE_GENERATIVE_TEXTURES
    ? createGenerativeMaterials()
    : null;
  const textures = new Map();
  const marks = [],
    totalBounds = new THREE.Box3(),
    extent = new THREE.Vector3();
  const snapshot = (sample) => ({
    ...sample,
    position: sample.position.clone(),
    direction: sample.direction.clone(),
    side: sample.side.clone(),
    up: sample.up.clone(),
    velocity: sample.velocity.clone(),
  });

  function destroyStroke(mark) {
    disposeMark(mark.object);
    mark.textureLease?.release();
  }
  function closeStroke() {
    activeStroke?.stroke.finish();
    activeStroke = null;
  }
  function beginStroke(id, pose) {
    closeStroke();
    const color = palette.colorFor(id, serial);
    const region = compositionAt(pose.position);
    const textureLease = textures.has(id)
      ? null
      : generative?.acquire(id, pose.acoustic || pose);
    const stroke = createBrushStroke(id, {
      seed: serial++ * 1.37,
      color,
      texture: textures.get(id) || textureLease?.binding,
      surprise: graphicSurprise(serial - 1, pose.acoustic || pose),
    });
    landscape.add(stroke.group);
    activeStroke = {
      stroke,
      textureLease,
      object: stroke.group,
      brush: id,
      born: elapsed,
      fade: 1,
      significance:
        (id === "falaises" || id === "corolles") && serial % 5 === 0
          ? 0.85
          : 0.15,
      opening: region.opening,
      bounds: new THREE.Box3(),
    };
    marks.push(activeStroke);
    // Reuse the previous endpoint to join successive strokes without a jump.
    if (lastSample) {
      stroke.append(lastSample);
      activeStroke.bounds.expandByPoint(lastSample.position);
    }
    while (marks.length > 80) destroyStroke(marks.shift());
    renderer.domElement.dataset.markCount = String(marks.length);
  }
  function addSample(pose) {
    const region = compositionAt(pose.position);
    if (region.density < 0.24) {
      closeStroke();
      lastSample = null;
      return;
    }
    pose = { ...pose, density: region.density };
    paintedSamples++;
    if (!activeStroke || activeStroke.stroke.full) beginStroke(brush, pose);
    activeStroke.stroke.append(pose);
    activeStroke.bounds.expandByPoint(pose.position);
    lastSample = snapshot(pose);
    boundsDirty = true;
  }
  function updateBounds() {
    totalBounds.makeEmpty();
    for (const mark of marks) totalBounds.union(mark.bounds);
    if (totalBounds.isEmpty())
      totalBounds.set(
        new THREE.Vector3(-4, -4, -4),
        new THREE.Vector3(4, 4, 4),
      );
    totalBounds.getCenter(navigation.bounds.center);
    totalBounds.getSize(extent);
    navigation.bounds.radius = Math.max(6, extent.length() * 0.5 + 5);
    renderer.domElement.dataset.sculptureExtent = extent
      .toArray()
      .map((value) => value.toFixed(2))
      .join(",");
    boundsDirty = false;
  }
  function reset() {
    closeStroke();
    marks.forEach(destroyStroke);
    marks.length = 0;
    flight.reset();
    serial = 0;
    paintedSamples = 0;
    elapsed = 0;
    sampleClock = 0;
    quiet = 0;
    lastSample = null;
    navigation.position.set(0, 0, 0);
    navigation.direction.set(0.8, 0.18, -1).normalize();
    navigation.velocity.set(0, 0, 0);
    navigation.active = false;
    navigation.energy = navigation.motion = 0;
    landscape.position.set(0, 0, 0);
    tip.visible = false;
    renderer.domElement.dataset.markCount = "0";
    renderer.domElement.dataset.painterPosition = "0,0,0";
    renderer.domElement.dataset.paintedSamples = "0";
    updateBounds();
    rig.reanchor(true);
  }
  // A finite opening study surrounds the sanctuary with an irregular envelope.
  for (let i = 0; i < 630; i++) {
    const pose = flight.update(0.12, {
      energy: 0.45,
      low: 0.25,
      high: 0.25 + Math.sin(i * 0.07) * 0.15,
      flux: 0.05,
      freq: 1100 + Math.sin(i * 0.11) * 700,
    });
    if (i % 70 === 0) {
      brush = [
        "voiles",
        "corolles",
        "falaises",
        "filaments",
        "brumes",
        "lagons",
        "bulles",
        "aurore",
        "calligraphie",
      ][Math.floor(i / 70)];
      closeStroke();
    }
    addSample(pose);
    navigation.position.copy(pose.position);
    navigation.direction.copy(pose.direction);
  }
  closeStroke();
  brush = "voiles";
  updateBounds();
  flight.reset();
  lastSample = null;

  function frame(now) {
    if (disposed) return;
    frameId = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;
    const playback = player?.getState();
    const f = player?.getFeatures();
    const painting = Boolean(playback?.playing && f?.rms > 0.006);
    navigation.active = painting;
    tip.visible = painting;
    if (playback?.playing) elapsed += dt;
    if (painting) {
      quiet = 0;
      sampleClock += dt;
      const pose = flight.update(dt, f);
      navigation.position.copy(pose.position);
      navigation.direction.copy(pose.direction);
      navigation.velocity.copy(pose.velocity);
      navigation.energy = pose.energy;
      navigation.motion = pose.motion;
      navigation.phrase = pose.phrase;
      navigation.progress = pose.progress;
      tip.position.copy(pose.position);
      if (sampleClock >= 0.12) {
        addSample(generative ? { ...pose, acoustic: f } : pose);
        sampleClock %= 0.12;
      }
    } else {
      quiet += dt;
      navigation.velocity.multiplyScalar(Math.exp(-dt * 3));
      if (quiet > 0.35) closeStroke();
    }
    if (playback?.playing) {
      for (let i = marks.length - 1; i >= 0; i--) {
        const item = marks[i],
          age = elapsed - item.born;
        // Dense nearby pigment accelerates dissolution of older marks smoothly.
        let neighbors = 0;
        const midpoint = item.bounds.getCenter(new THREE.Vector3());
        for (const other of marks) {
          if (other !== item && other.bounds.distanceToPoint(midpoint) < 9)
            neighbors++;
        }
        item.fade = dissolvePigment({
          age,
          count: marks.length,
          neighbors,
          fade: item.fade,
          dt,
          significance: item.significance,
          opening: item.opening,
        });
        const fade = item.fade;
        item.object.traverse((object) => {
          if (object.material?.uniforms) {
            object.material.uniforms.uTime.value = elapsed;
            object.material.uniforms.uAge.value = age;
            object.material.uniforms.uFade.value = fade;
          }
        });
        if (fade < 0.012 && item !== activeStroke) {
          destroyStroke(item);
          marks.splice(i, 1);
          boundsDirty = true;
        }
      }
      renderer.domElement.dataset.markCount = String(marks.length);
    }
    if (boundsDirty) updateBounds();
    rig.update(dt);
    try {
      effects.render(scene, camera);
    } catch (error) {
      onError?.(error.message);
    }
    if (now - lastReport > 80) {
      if (generative) {
        renderer.domElement.dataset.generativeTextures = JSON.stringify(
          generative.stats,
        );
        renderer.domElement.dataset.generativeStrokes = String(
          marks.filter((mark) => mark.textureLease).length,
        );
      }
      renderer.domElement.dataset.importedBrushes = [
        ...new Set(
          marks
            .filter(
              (mark) =>
                textures.has(mark.brush) &&
                mark.object.children.some(
                  (child) =>
                    child.material?.uniforms?.uBrushMask?.value ===
                    textures.get(mark.brush).texture,
                ),
            )
            .map((mark) => mark.brush),
        ),
      ].join(",");
      renderer.domElement.dataset.paintedSamples = String(paintedSamples);
      renderer.domElement.dataset.texturedStrokes = String(
        marks.filter((mark) =>
          mark.object.children.some(
            (child) => child.material?.uniforms?.uHasMask?.value === 1,
          ),
        ).length,
      );
      renderer.domElement.dataset.painterPosition = navigation.position
        .toArray()
        .map((value) => value.toFixed(3))
        .join(",");
      renderer.domElement.dataset.dronePosition = camera.position
        .toArray()
        .map((value) => value.toFixed(3))
        .join(",");
      reportState?.(playback);
      lastReport = now;
    }
  }
  const resize = () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    effects.resize();
  };
  const contextLost = (event) => {
    event.preventDefault();
    onError?.(
      "Le contexte 3D a été interrompu. Rechargez la page pour reprendre.",
    );
  };
  window.addEventListener("resize", resize);
  renderer.domElement.addEventListener("webglcontextlost", contextLost);
  frameId = requestAnimationFrame(frame);
  return {
    setTrackComposition(analysis) {
      palette = createTrackPalette(analysis);
      renderer.domElement.dataset.trackPalette = palette.colors.join(",");
    },
    setBrush(id) {
      if (BRUSHES.some((item) => item.id === id) && id !== brush) {
        brush = id;
        closeStroke();
      }
    },
    setBrushTexture(id, binding) {
      const previous = textures.get(id);
      textures.set(id, binding);
      marks
        .filter((mark) => mark.brush === id)
        .forEach((mark) => {
          mark.stroke.setTexture(binding);
          mark.textureLease?.release();
          mark.textureLease = null;
        });
      previous?.texture.dispose();
    },
    setCameraMode: rig.setMode,
    setDroneDistance: rig.setDistance,
    setPlayer(next, callback) {
      player = next;
      reportState = callback;
    },
    reset,
    dispose() {
      disposed = true;
      cancelAnimationFrame(frameId);
      rig.dispose();
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      marks.forEach(destroyStroke);
      generative?.dispose();
      textures.forEach((binding) => binding.texture.dispose());
      tip.geometry.dispose();
      tip.material.dispose();
      effects.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
