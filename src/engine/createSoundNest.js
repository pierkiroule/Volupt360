import { ENABLE_TRACE_MEMORY, TRACE_DEBUG } from "../sonoizo/traceConfig.js";
import { createTraceMemory } from "../sonoizo/TraceMemory.js";
import { createTraceEncounter } from "../sonoizo/TraceEncounter.js";
import { createTraceDebug } from "../sonoizo/createTraceDebug.js";
import { createVocalConstellation } from "../sonoizo/createVocalConstellation.js";
import * as THREE from "three";
import { createVideodio } from "../video/createVideodio.js";
import { createSonoizoDance } from "../sonoizo/SonoizoDance.js";
import { createBrushBridge } from "../sonoizo/BrushBridge.js";
import { createOizo } from "../sonoizo/createOizo.js";
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
    windEnabled: false,
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
  let cameraMode = "drone";
  let photo = false,
    videodio = null;
  let padSource = null,
    oizo = null,
    padInitialized = false;
  let vocalFireflies = null;
  const traceMemory = createTraceMemory();
  const traceEncounter = createTraceEncounter(traceMemory);
  const traceDebug =
    ENABLE_TRACE_MEMORY && TRACE_DEBUG ? createTraceDebug(traceMemory) : null;
  if (traceDebug) landscape.add(traceDebug.group);
  let traceTime = 0;
  const dance = createSonoizoDance();
  const oizoScreen = new THREE.Vector3();
  const padStates = new Map();
  const bridge = createBrushBridge({ paint: feedPad, finish: finishPad });
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
    traceMemory.remove(mark.traceId);
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
      traceId: `trace-${serial}`,
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
      if (ENABLE_TRACE_MEMORY)
        traceMemory.record(
          activeStroke.traceId,
          id,
          lastSample.position,
          traceTime,
        );
      activeStroke.bounds.expandByPoint(lastSample.position);
    }
    while (marks.length > 80) {
      const index = marks.findIndex((mark) => !isActive(mark));
      if (index < 0) break;
      destroyStroke(marks.splice(index, 1)[0]);
    }
    renderer.domElement.dataset.markCount = String(marks.length);
  }
  function addSample(pose, fromPad = false) {
    const region = compositionAt(pose.position);
    if (region.density < 0.24 && !fromPad) {
      closeStroke();
      lastSample = null;
      return;
    }
    pose = {
      ...pose,
      density: fromPad ? Math.max(0.25, region.density) : region.density,
    };
    paintedSamples++;
    if (!activeStroke || activeStroke.stroke.full) beginStroke(brush, pose);
    activeStroke.stroke.append(pose);
    if (ENABLE_TRACE_MEMORY)
      traceMemory.record(
        activeStroke.traceId,
        activeStroke.brush,
        pose.position,
        traceTime,
      );
    activeStroke.bounds.expandByPoint(pose.position);
    if (activeStroke.stroke.padding) {
      activeStroke.bounds.expandByPoint(
        pose.position.clone().addScalar(activeStroke.stroke.padding),
      );
      activeStroke.bounds.expandByPoint(
        pose.position.clone().addScalar(-activeStroke.stroke.padding),
      );
    }
    lastSample = snapshot(pose);
    boundsDirty = true;
  }
  function isActive(mark) {
    return (
      mark === activeStroke ||
      [...padStates.values()].some((state) => state.mark === mark)
    );
  }
  function feedPad(id, pose) {
    if (!BRUSHES.some((item) => item.id === id)) return;
    const previous = { mark: activeStroke, last: lastSample, brush };
    const state = padStates.get(id);
    activeStroke = state?.mark || null;
    lastSample = state?.last || null;
    brush = id;
    addSample(pose, true);
    padStates.set(id, { mark: activeStroke, last: lastSample });
    activeStroke = previous.mark;
    lastSample = previous.last;
    brush = previous.brush;
  }
  function finishPad(id) {
    padStates.get(id)?.mark?.stroke.finish();
    padStates.delete(id);
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
    cancelSteering();
    bridge.close();
    padStates.clear();
    dance.reset();
    closeStroke();
    marks.forEach(destroyStroke);
    marks.length = 0;
    traceMemory.clear();
    traceEncounter.reset();
    traceTime = 0;
    traceDebug?.update(2, null);
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
  for (let i = 0; !ENABLE_TRACE_MEMORY && i < BRUSHES.length * 70; i++) {
    const pose = flight.update(0.12, {
      energy: 0.45,
      low: 0.25,
      high: 0.25 + Math.sin(i * 0.07) * 0.15,
      flux: 0.05,
      freq: 1100 + Math.sin(i * 0.11) * 700,
    });
    if (i % 70 === 0) {
      brush = BRUSHES[Math.floor(i / 70)].id;
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

  let nozzlePaint = null;
  function beginNozzlePaint() {
    if (
      !steeringGesture ||
      steeringGesture.started ||
      photo ||
      cameraMode !== "drone"
    )
      return;
    bridge.close();
    nozzlePaint = { id: brush, samples: 0 };
    renderer.domElement.dataset.nozzlePaint = "true";
    renderer.domElement.dataset.nozzleBrush = brush;
  }
  let steeringGesture = null,
    steeringMoves = 0;
  function onSteeringDown(event) {
    if (
      !padSource ||
      !navigation.windEnabled ||
      photo ||
      cameraMode !== "drone" ||
      event.button > 0 ||
      !event.isPrimary
    )
      return;
    void padSource.preparePlayback();
    steeringGesture = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      started: false,
      timer: setTimeout(beginNozzlePaint, 450),
    };
    renderer.domElement.setPointerCapture(event.pointerId);
  }
  function onSteeringMove(event) {
    if (
      !steeringGesture ||
      event.pointerId !== steeringGesture.id ||
      photo ||
      cameraMode !== "drone"
    )
      return;
    const rect = renderer.domElement.getBoundingClientRect();
    const scale = Math.max(1, Math.min(rect.width, rect.height));
    if (
      !steeringGesture.started &&
      Math.hypot(
        event.clientX - steeringGesture.x,
        event.clientY - steeringGesture.y,
      ) < 4
    )
      return;
    clearTimeout(steeringGesture.timer);
    steeringGesture.started = true;
    const dx = (event.clientX - steeringGesture.x) / scale;
    const dy = (steeringGesture.y - event.clientY) / scale;
    steeringGesture.x = event.clientX;
    steeringGesture.y = event.clientY;
    if (dx || dy) {
      const inverse = landscape
        .getWorldQuaternion(new THREE.Quaternion())
        .invert();
      const right = new THREE.Vector3(1, 0, 0)
        .applyQuaternion(camera.quaternion)
        .applyQuaternion(inverse);
      const up = new THREE.Vector3(0, 1, 0)
        .applyQuaternion(camera.quaternion)
        .applyQuaternion(inverse);
      dance.steer(dx, dy, { right, up });
      steeringMoves++;
      renderer.domElement.dataset.steeringMoves = String(steeringMoves);
      renderer.domElement.dataset.steeringInput = `${dx.toFixed(4)},${dy.toFixed(4)}`;
    }
  }
  function onSteeringEnd(event) {
    if (event.pointerId !== steeringGesture?.id) return;
    clearTimeout(steeringGesture.timer);
    if (nozzlePaint) {
      finishPad(nozzlePaint.id);
      nozzlePaint = null;
      renderer.domElement.dataset.nozzlePaint = "false";
    }
    steeringGesture = null;
    if (renderer.domElement.hasPointerCapture(event.pointerId))
      renderer.domElement.releasePointerCapture(event.pointerId);
  }
  function cancelSteering() {
    if (steeringGesture) onSteeringEnd({ pointerId: steeringGesture.id });
  }
  window.addEventListener("blur", cancelSteering);
  const steeringListeners = [
    ["pointerdown", onSteeringDown],
    ["pointermove", onSteeringMove],
    ["pointerup", onSteeringEnd],
    ["pointercancel", onSteeringEnd],
    ["lostpointercapture", onSteeringEnd],
    ["contextmenu", (event) => event.preventDefault()],
  ];
  for (const [name, handler] of steeringListeners)
    renderer.domElement.addEventListener(name, handler);
  function frame(now) {
    if (disposed) return;
    frameId = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;
    const playback = player?.getState();
    const f = player?.getFeatures();
    const voices = photo ? [] : padSource?.getVoices() || [];
    if (!photo) {
      traceTime += dt;
      const painting = Boolean(playback?.playing && f?.rms > 0.006);
      navigation.active = padSource ? true : painting;
      tip.visible = !padSource && painting;
      if (padSource ? voices.length > 0 || nozzlePaint : playback?.playing)
        elapsed += dt;
      if (padSource) {
        const visual = padSource.getVisualFeatures?.() || {};
        const pose = dance.update(dt, voices, visual);
        renderer.domElement.dataset.musicEnergy = (visual.energy || 0).toFixed(
          3,
        );
        navigation.position.copy(pose.position);
        navigation.direction.copy(pose.direction);
        navigation.velocity.copy(pose.velocity);
        navigation.energy = pose.energy;
        navigation.motion = pose.motion;
        navigation.phrase = pose.phrase;
        navigation.progress = pose.progress;
        sampleClock += dt;
        const tick = sampleClock >= 0.12;
        if (nozzlePaint) {
          if (tick || nozzlePaint.samples < 2) {
            const features = {
              ...pose.acoustic,
              rms: 0.08,
              energy: 0.4,
              ...padSource.getVisualFeatures(),
            };
            feedPad(nozzlePaint.id, {
              ...pose,
              ...features,
              acoustic: features,
            });
            nozzlePaint.samples++;
          }
        } else bridge.update(pose, voices, tick);
        if (tick) sampleClock %= 0.12;
        oizo.update(pose);
        const hit = ENABLE_TRACE_MEMORY
          ? traceEncounter.update(pose.position, traceTime)
          : null;
        traceDebug?.update(dt, hit);
        const fragments =
          !ENABLE_TRACE_MEMORY && !vocalFireflies
            ? padSource.getFragments?.() || []
            : null;
        if (!vocalFireflies && fragments?.length) {
          vocalFireflies = createVocalConstellation({
            fragments,
            collide: (id) => padSource.collide(id),
            getFeatures: () => padSource.getVisualFeatures(),
          });
          landscape.add(vocalFireflies.group);
        }
        if (vocalFireflies) {
          vocalFireflies.group.visible = true;
          vocalFireflies.update(dt, pose, camera);
          renderer.domElement.dataset.vocalFireflies = String(
            vocalFireflies.count,
          );
          renderer.domElement.dataset.vocalCollisions = String(
            vocalFireflies.collisionCount,
          );
        }
        if (!marks.length) {
          navigation.bounds.center.copy(pose.position);
          navigation.bounds.radius = 8;
        } else {
          navigation.bounds.radius = Math.max(
            navigation.bounds.radius,
            pose.position.distanceTo(navigation.bounds.center) + 3,
          );
        }
      } else if (painting) {
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
      if (padSource ? voices.length > 0 || nozzlePaint : playback?.playing) {
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
          if (fade < 0.012 && !isActive(item)) {
            destroyStroke(item);
            marks.splice(i, 1);
            boundsDirty = true;
          }
        }
        renderer.domElement.dataset.markCount = String(marks.length);
      }
      const visual = padSource?.getVisualFeatures?.() || f || {};
      for (const mark of marks) {
        mark.stroke.update?.(dt, visual);
        mark.object.traverse((object) => {
          const uniforms = object.material?.uniforms;
          if (uniforms?.uPigment)
            uniforms.uPigment.value =
              1.05 + (visual.energy || 0) * 0.7 + (visual.pulse || 0) * 0.3;
          if (uniforms?.uAudioEnergy)
            uniforms.uAudioEnergy.value = visual.energy || 0;
          if (uniforms?.uAudioLow) uniforms.uAudioLow.value = visual.low || 0;
        });
      }
      if (boundsDirty) updateBounds();
    }
    renderer.domElement.dataset.sculpturePaused = String(photo);
    rig.update(dt);
    camera.updateMatrixWorld();
    try {
      effects.render(scene, camera);
      if (!photo && cameraMode === "drone")
        videodio?.frame(renderer.domElement, now);
    } catch (error) {
      onError?.(error.message);
    }
    if (now - lastReport > 80) {
      renderer.domElement.dataset.traceMemory = String(ENABLE_TRACE_MEMORY);
      renderer.domElement.dataset.traceDebug = String(Boolean(traceDebug));
      renderer.domElement.dataset.tracePoints = String(
        traceMemory.stats.points,
      );
      renderer.domElement.dataset.traceSegments = String(
        traceMemory.stats.segments,
      );
      renderer.domElement.dataset.traceEncounters = String(
        traceEncounter.stats.count,
      );
      renderer.domElement.dataset.traceCandidates = String(
        traceEncounter.stats.candidates,
      );
      renderer.domElement.dataset.vocalFireflies = ENABLE_TRACE_MEMORY
        ? "0"
        : renderer.domElement.dataset.vocalFireflies || "0";
      renderer.domElement.dataset.videoFrames = String(
        videodio?.getHistory().frames || 0,
      );
      renderer.domElement.dataset.oizo = String(Boolean(padSource));
      if (padSource) {
        oizo.group.getWorldPosition(oizoScreen);
        oizoScreen.project(camera);
        renderer.domElement.dataset.oizoScreen = oizoScreen
          .toArray()
          .map((value) => value.toFixed(4))
          .join(",");
      }
      renderer.domElement.dataset.activePads = voices
        .map((voice) => voice.id)
        .join(",");
      renderer.domElement.dataset.paintedBrushes = [
        ...new Set(marks.map((mark) => mark.brush)),
      ].join(",");
      renderer.domElement.dataset.painterEnergy = navigation.energy.toFixed(3);
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
    setPadSource(source) {
      padSource?.setCaptureTap(null);
      bridge.close();
      if (source && !videodio) videodio = createVideodio();
      source?.setCaptureTap((data, sampleRate, startTime) => {
        if (!photo && cameraMode === "drone")
          videodio?.audio(data, sampleRate, startTime);
      });
      if (steeringGesture) onSteeringEnd({ pointerId: steeringGesture.id });
      vocalFireflies?.dispose();
      vocalFireflies = null;
      padSource = source;
      navigation.windEnabled = Boolean(source?.getFragments?.().length);
      if (source) {
        if (!padInitialized) {
          reset();
          padInitialized = true;
        }
        if (!oizo) {
          oizo = createOizo();
          landscape.add(oizo.group);
        }
        oizo.group.visible = true;
      } else if (oizo) oizo.group.visible = false;
    },
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
    setCameraMode(next) {
      if (steeringGesture) onSteeringEnd({ pointerId: steeringGesture.id });
      const wasPhoto = photo;
      const previousMode = cameraMode;
      cameraMode = next;
      photo = next === "photo";
      if (photo && !wasPhoto) {
        padSource?.stopAll();
        padSource?.pauseAmbience();
        player?.pause();
        bridge.close();
        closeStroke();
      }
      // Keep the most recent FPV take while framing or contemplating.
      if (next !== "drone") videodio?.freeze(true);
      else if (previousMode !== "drone") videodio?.freeze(false);
      return rig.setMode(next);
    },
    async exportPhoto() {
      if (!photo) throw new Error("Cadrez votre photo dans la vue Photo.");
      rig.update(0);
      const size = renderer.getSize(new THREE.Vector2()),
        ratio = renderer.getPixelRatio();
      const aspect = camera.aspect;
      const longSide = Math.min(2560, renderer.capabilities.maxTextureSize);
      const scale = longSide / Math.max(size.x, size.y);
      const width = Math.round(size.x * scale),
        height = Math.round(size.y * scale);
      const output = document.createElement("canvas");
      output.width = width;
      output.height = height;
      try {
        renderer.setPixelRatio(1);
        renderer.setSize(width, height, false);
        effects.resize();
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        effects.render(scene, camera);
        output.getContext("2d").drawImage(renderer.domElement, 0, 0);
      } finally {
        renderer.setPixelRatio(ratio);
        renderer.setSize(size.x, size.y, false);
        effects.resize();
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
      }
      return new Promise((resolve, reject) =>
        output.toBlob(
          (blob) =>
            blob
              ? resolve(blob)
              : reject(new Error("La photo n’a pas pu être encodée.")),
          "image/png",
        ),
      );
    },
    setPhotoZoom: rig.setPhotoZoom,
    exportVideodio(onProgress) {
      if (!photo || !videodio)
        throw new Error("Passez en vue photo pour cadrer votre vidéodio.");
      effects.render(scene, camera);
      return videodio.export(renderer.domElement, onProgress);
    },
    setDroneDistance: rig.setDistance,
    setPlayer(next, callback) {
      player = next;
      reportState = callback;
    },
    reset,
    dispose() {
      cancelSteering();
      disposed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener("blur", cancelSteering);
      for (const [name, handler] of steeringListeners)
        renderer.domElement.removeEventListener(name, handler);
      rig.dispose();
      padSource?.setCaptureTap(null);
      videodio?.dispose();
      bridge.close();
      padStates.clear();
      vocalFireflies?.dispose();
      traceDebug?.dispose();
      traceMemory.clear();
      traceEncounter.reset();
      oizo?.dispose();
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
