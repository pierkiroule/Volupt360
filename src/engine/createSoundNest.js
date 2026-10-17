import { createMoodAtmosphere } from "../echoMood/createMoodAtmosphere.js";
import { createRenderBudget } from "./createRenderBudget.js";
import { loadAlphaTexture } from "./loadAlphaTexture.js";
import { createMaterialResponse } from "./createMaterialResponse.js";
import { createPictorialFlow } from "./createPictorialFlow.js";
import { createWatercolorTexture } from "./createWatercolorTexture.js";
import { ENABLE_POETIC_VOICES } from "../sonoizo/instrumentConfig.js";
import { ENABLE_TRACE_MEMORY, TRACE_DEBUG } from "../sonoizo/traceConfig.js";
import { createTraceMemory } from "../sonoizo/TraceMemory.js";
import { createTraceEncounter } from "../sonoizo/TraceEncounter.js";
import { createTraceDebug } from "../sonoizo/createTraceDebug.js";
import { createVocalBubbles } from "../sonoizo/createVocalBubbles.js";
import * as THREE from "three";
import { createVideodio } from "../video/createVideodio.js";
import { createSonoizoDance } from "../sonoizo/SonoizoDance.js";
import { createBrushBridge } from "../sonoizo/BrushBridge.js";
import { createOizo } from "../sonoizo/createOizo.js";
import { createViewEffects, DEFAULT_VIEW } from "./createViewEffects.js";
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
export function createSoundNest(
  container,
  { onHint, onError, onBubbleScore, onPoeticFragment } = {},
) {
  const mobile =
    matchMedia("(pointer: coarse)").matches ||
    Math.min(innerWidth, innerHeight) < 600;
  const renderer = new THREE.WebGLRenderer({
    antialias: !mobile,
    alpha: false,
  });
  const budget = createRenderBudget({
    mobile,
    dpr: devicePixelRatio || 1,
    width: innerWidth,
    height: innerHeight,
  });
  renderer.setPixelRatio(budget.ratio);
  renderer.domElement.dataset.renderScale = budget.ratio.toFixed(3);
  renderer.domElement.dataset.mobileQuality = String(mobile);
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
  renderer.domElement.dataset.skydome = "off-white-paper";
  const pictorialFlow = createPictorialFlow();
  const effects = createViewEffects(renderer, { antialias: !mobile });
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
  let lifeTime = 0;
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
  let densityClock = 0;
  const densityMidpoint = new THREE.Vector3();
  let palette = createTrackPalette();
  let generative = null;
  const textures = new Map();
  const retiredTextures = new Set();
  const imageBrushes = new Map();
  const generatedBrushes = new Map();
  renderer.domElement.dataset.celestialBrushes = "0";
  renderer.domElement.dataset.activeBrush = brush;
  let cameraMode = "drone",
    directSculpture = false,
    moodAtmosphere = null;
  let photo = false,
    videodio = null;
  let padSource = null,
    oizo = null,
    padInitialized = false;
  let vocalFireflies = null;
  let poeticFragments = [];
  const traceMemory = createTraceMemory();
  const traceEncounter = createTraceEncounter(traceMemory);
  const traceDebug =
    ENABLE_TRACE_MEMORY && TRACE_DEBUG ? createTraceDebug(traceMemory) : null;
  if (traceDebug) landscape.add(traceDebug.group);
  let traceTime = 0,
    visitClock = 0,
    visitMark = null;
  const visitPoint = new THREE.Vector3();
  const dance = createSonoizoDance();
  const oizoScreen = new THREE.Vector3();
  const padStates = new Map();
  const tailPosition = new THREE.Vector3();
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
    padSource?.forgetSound?.(mark.traceId);
    disposeMark(mark.object);
    mark.textureLease?.release();
    const binding = mark.binding;
    if (
      retiredTextures.has(binding) &&
      !marks.some((other) => other !== mark && other.binding === binding)
    ) {
      binding.texture.dispose();
      retiredTextures.delete(binding);
    }
  }
  function closeStroke() {
    activeStroke?.stroke.finish();
    activeStroke = null;
  }
  function uniformsFor(mark) {
    const stamp = mark.stroke.count ?? mark.object.children.length;
    if (mark.uniformStamp !== stamp) {
      mark.uniforms.length = 0;
      mark.object.traverse((object) => {
        if (object.material?.uniforms)
          mark.uniforms.push(object.material.uniforms);
      });
      mark.uniformStamp = stamp;
    }
    return mark.uniforms;
  }
  function beginStroke(id, pose) {
    closeStroke();
    const color =
      imageBrushes.get(id)?.sample(pose.position).color.clone() ||
      (generatedBrushes.has(id)
        ? new THREE.Color(generatedBrushes.get(id).color)
        : palette.colorFor(id, serial));
    const region = compositionAt(pose.position);
    const textureLease = textures.has(id)
      ? null
      : ENABLE_GENERATIVE_TEXTURES
        ? (generative ??= createGenerativeMaterials()).acquire(
            id,
            pose.acoustic || pose,
          )
        : null;
    const generated = generatedBrushes.get(id);
    const stroke = createBrushStroke(generated?.baseId || id, {
      dynamics: generated,
      seed: serial++ * 1.37 + ((generated?.seed || 0) % 10000),
      color,
      texture: textures.get(id) || textureLease?.binding,
      surprise: 0,
    });
    landscape.add(stroke.group);
    activeStroke = {
      stroke,
      textureLease,
      binding: textures.get(id) || textureLease?.binding,
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
      respond: createMaterialResponse(id, serial),
      uniforms: [],
      uniformStamp: -1,
      life: generated?.life || "Fluide",
      motionScale: generated?.speed || 1,
      responseGain: generated?.responseGain || 1,
      bounds: new THREE.Box3(),
    };
    marks.push(activeStroke);
    // Reuse the previous endpoint to join successive strokes without a jump.
    if (lastSample) {
      stroke.append(lastSample);
      if (ENABLE_TRACE_MEMORY && (ENABLE_POETIC_VOICES || TRACE_DEBUG))
        traceMemory.record(
          activeStroke.traceId,
          id,
          lastSample.position,
          traceTime,
        );
      activeStroke.bounds.expandByPoint(lastSample.position);
    }
    while (marks.length > budget.maxMarks) {
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
    padSource?.depositSound?.(
      activeStroke.brush,
      pose.position,
      pose.energy || 0.3,
      activeStroke.traceId,
    );
    if (ENABLE_TRACE_MEMORY && (ENABLE_POETIC_VOICES || TRACE_DEBUG))
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
    if (mark === activeStroke) return true;
    for (const state of padStates.values())
      if (state.mark === mark) return true;
    return false;
  }
  function feedPad(id, pose) {
    if (oizo && !pose.direct)
      pose = {
        ...pose,
        position: oizo.getTailPosition(tailPosition),
        wake: true,
        depositionTime: lifeTime,
      };
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
    visitMark = null;
    visitClock = 0;
    closeStroke();
    marks.forEach(destroyStroke);
    marks.length = 0;
    retiredTextures.forEach((binding) => binding.texture.dispose());
    retiredTextures.clear();
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
    void padSource?.beginSculpture?.(brush);
    renderer.domElement.dataset.nozzlePaint = "true";
    renderer.domElement.dataset.nozzleBrush = brush;
  }
  let steeringGesture = null,
    steeringMoves = 0;
  let directGesture = null;
  const directTarget = new THREE.Vector3(),
    directPoint = new THREE.Vector3(),
    directLast = new THREE.Vector3(),
    directDirection = new THREE.Vector3(1, 0, 0),
    directSide = new THREE.Vector3(0, 1, 0),
    directUp = new THREE.Vector3(0, 0, -1),
    directRay = new THREE.Vector3(),
    viewNormal = new THREE.Vector3(),
    directVelocity = new THREE.Vector3();
  function updateDirect(dt, features) {
    if (!directGesture || photo || cameraMode !== "sculpt") return;
    const g = directGesture;
    g.clock = (g.clock || 0) + dt;
    if (g.samples > 1 && g.clock < 1 / 30) return;
    const rect = renderer.domElement.getBoundingClientRect();
    directRay
      .set(
        ((g.x - rect.left) / rect.width) * 2 - 1,
        1 - ((g.y - rect.top) / rect.height) * 2,
        0.5,
      )
      .unproject(camera)
      .sub(camera.position)
      .normalize();
    camera.getWorldDirection(viewNormal);
    const depth = 29 + (g.pressure - 0.5) * 6 + Math.sin(g.travel * 0.12) * 2;
    directTarget
      .copy(camera.position)
      .addScaledVector(
        directRay,
        depth / Math.max(0.2, directRay.dot(viewNormal)),
      );
    landscape.worldToLocal(directTarget);
    if (!g.samples) {
      directPoint.copy(directTarget);
      directLast.copy(directPoint);
    } else directPoint.lerp(directTarget, 1 - Math.exp(-dt * 24));
    const distance = directPoint.distanceTo(directLast);
    if (g.samples > 1 && distance < 0.045) return;
    directVelocity
      .copy(directPoint)
      .sub(directLast)
      .divideScalar(Math.max(0.001, g.clock));
    if (distance > 0.001) directDirection.copy(directVelocity).normalize();
    const inverse = landscape.quaternion.clone().invert();
    viewNormal.applyQuaternion(inverse);
    directSide.crossVectors(directDirection, viewNormal).normalize();
    if (directSide.lengthSq() < 0.1) directSide.set(0, 1, 0);
    directUp.crossVectors(directSide, directDirection).normalize();
    feedPad(brush, {
      ...features,
      position: directPoint,
      direction: directDirection,
      side: directSide,
      up: directUp,
      velocity: directVelocity,
      time: lifeTime,
      energy: Math.min(
        1,
        (features.energy || 0) * 0.65 + distance * 1.5 + 0.15,
      ),
      low: features.low || 0.1,
      motion: Math.min(1, distance * 2),
      accent: Math.min(1, distance),
      direct: true,
      wake: true,
      depositionTime: lifeTime - 0.7,
    });
    directLast.copy(directPoint);
    g.travel += distance;
    g.samples++;
    g.clock = 0;
    renderer.domElement.dataset.directSamples = String(g.samples);
  }
  function endDirect() {
    if (!directGesture) return;
    finishPad(brush);
    const id = directGesture.id;
    directGesture = null;
    if (renderer.domElement.hasPointerCapture(id))
      renderer.domElement.releasePointerCapture(id);
    renderer.domElement.dataset.directDrawing = "false";
  }
  function onSteeringDown(event) {
    if (
      cameraMode === "sculpt" &&
      padSource &&
      event.isPrimary &&
      event.button <= 0
    ) {
      void padSource.preparePlayback();
      directGesture = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        pressure: event.pressure || 0.5,
        samples: 0,
        travel: 0,
      };
      renderer.domElement.setPointerCapture(event.pointerId);
      renderer.domElement.dataset.directDrawing = "true";
      return;
    }
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
    dance.beginPilot();
    steeringGesture = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      anchorX: event.clientX,
      anchorY: event.clientY,
      started: false,
      timer: setTimeout(beginNozzlePaint, 450),
    };
    renderer.domElement.setPointerCapture(event.pointerId);
  }
  const pilotInverse = new THREE.Quaternion(),
    pilotRight = new THREE.Vector3(),
    pilotUp = new THREE.Vector3();
  const pilotFrame = { right: pilotRight, up: pilotUp };
  function refreshPilot() {
    if (!steeringGesture?.started) return;
    landscape.getWorldQuaternion(pilotInverse).invert();
    pilotRight
      .set(1, 0, 0)
      .applyQuaternion(camera.quaternion)
      .applyQuaternion(pilotInverse);
    pilotUp
      .set(0, 1, 0)
      .applyQuaternion(camera.quaternion)
      .applyQuaternion(pilotInverse);
    dance.setPilot(
      steeringGesture.controlX || 0,
      steeringGesture.controlY || 0,
      pilotFrame,
    );
  }
  function onSteeringMove(event) {
    if (directGesture?.id === event.pointerId) {
      directGesture.x = event.clientX;
      directGesture.y = event.clientY;
      directGesture.pressure = event.pressure || 0.5;
      return;
    }
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
    const reach = Math.max(60, Math.min(120, scale * 0.24));
    const axis = (value) => {
      const n = Math.min(1, Math.abs(value) / reach);
      return Math.sign(value) * Math.max(0, (n - 0.035) / 0.965);
    };
    const dx = axis(event.clientX - steeringGesture.anchorX);
    const dy = axis(steeringGesture.anchorY - event.clientY);
    steeringGesture.x = event.clientX;
    steeringGesture.y = event.clientY;
    {
      steeringGesture.controlX = dx;
      steeringGesture.controlY = dy;
      refreshPilot();
      steeringMoves++;
      renderer.domElement.dataset.steeringMoves = String(steeringMoves);
      renderer.domElement.dataset.steeringInput = `${dx.toFixed(4)},${dy.toFixed(4)}`;
    }
  }
  function onSteeringEnd(event) {
    if (directGesture?.id === event.pointerId) {
      endDirect();
      return;
    }
    if (event.pointerId !== steeringGesture?.id) return;
    clearTimeout(steeringGesture.timer);
    if (nozzlePaint) {
      padSource?.endSculpture?.();
      finishPad(nozzlePaint.id);
      nozzlePaint = null;
      renderer.domElement.dataset.nozzlePaint = "false";
    }
    dance.releasePilot();
    steeringGesture = null;
    if (renderer.domElement.hasPointerCapture(event.pointerId))
      renderer.domElement.releasePointerCapture(event.pointerId);
  }
  function cancelSteering() {
    endDirect();
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
    const milliseconds = now - lastTime;
    const dt = Math.max(0, Math.min(0.1, milliseconds / 1000));
    lastTime = now;
    if (document.hidden) return;
    if (!photo && budget.update(milliseconds, dt)) {
      renderer.setPixelRatio(budget.ratio);
      renderer.setSize(innerWidth, innerHeight);
      effects.resize();
      renderer.domElement.dataset.renderScale = budget.ratio.toFixed(3);
    }
    const playback = player?.getState();
    const f = player?.getFeatures();
    const voices = photo ? [] : padSource?.getVoices() || [];
    if (!photo) {
      lifeTime += dt;
      traceTime += dt;
      const painting = Boolean(playback?.playing && f?.rms > 0.006);
      navigation.active = padSource ? true : painting;
      tip.visible = !padSource && painting;
      elapsed += dt;
      if (padSource) {
        const visual = padSource.getVisualFeatures?.() || {};
        visitClock -= dt;
        if (visitClock <= 0) {
          visitClock = 0.5;
          if (
            !visitMark ||
            !marks.includes(visitMark) ||
            (lifeTime - (visitMark.visitStarted || 0) > 12 &&
              navigation.position.distanceTo(visitPoint) < 5) ||
            lifeTime - (visitMark.visitStarted || 0) > 40
          ) {
            const candidates = marks.filter(
              (mark) => elapsed - mark.born > 2 && mark !== visitMark,
            );
            visitMark = candidates.length
              ? candidates[Math.floor(lifeTime / 10) % candidates.length]
              : marks.includes(visitMark)
                ? visitMark
                : null;
            if (visitMark) visitMark.visitStarted = lifeTime;
          }
          dance.setVisitTarget(
            visitMark ? visitMark.bounds.getCenter(visitPoint) : null,
          );
        }
        refreshPilot();
        const pose = dance.update(dt, voices, visual);
        renderer.domElement.dataset.flightVisiting = (
          pose.visiting || 0
        ).toFixed(3);
        oizo.update(pose);
        oizo.group.visible = !directSculpture;
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
        const hit =
          ENABLE_TRACE_MEMORY && (ENABLE_POETIC_VOICES || TRACE_DEBUG)
            ? traceEncounter.update(pose.position, traceTime)
            : null;
        traceDebug?.update(dt, hit);
        if (hit) {
          padSource.recallSound?.(hit.brushId, hit.position, hit.traceId);
          if (ENABLE_POETIC_VOICES && traceEncounter.stats.count % 5 === 0) {
            const index =
              Math.max(
                0,
                BRUSHES.findIndex((item) => item.id === hit.brushId),
              ) % 12;
            void padSource.collide(
              `firefly-${index * 2 + 1 + (Math.floor(traceEncounter.stats.count / 5) % 2)}`,
            );
          }
        }
        const fragments = !vocalFireflies ? poeticFragments : null;
        if (!vocalFireflies && fragments?.length) {
          vocalFireflies = createVocalBubbles({
            fragments,
            collide: (id) =>
              onPoeticFragment?.(
                poeticFragments.find((fragment) => fragment.id === id),
              ) || false,
            onScore: onBubbleScore,
          });
          landscape.add(vocalFireflies.group);
        }
        if (vocalFireflies) {
          vocalFireflies.group.visible = true;
          vocalFireflies.update(
            dt,
            pose,
            !directSculpture && cameraMode === "drone",
          );
          renderer.domElement.dataset.vocalFireflies = String(
            vocalFireflies.count,
          );
          renderer.domElement.dataset.vocalCollisions = String(
            vocalFireflies.collisionCount,
          );
        }
        if (!marks.length) {
          if (directSculpture) navigation.bounds.center.set(0, 0, 0);
          else navigation.bounds.center.copy(pose.position);
          navigation.bounds.radius = 8;
        } else if (!directSculpture) {
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
          addSample(
            ENABLE_GENERATIVE_TEXTURES ? { ...pose, acoustic: f } : pose,
          );
          sampleClock %= 0.12;
        }
      } else {
        quiet += dt;
        navigation.velocity.multiplyScalar(Math.exp(-dt * 3));
        if (quiet > 0.35) closeStroke();
      }
      if (marks.length) {
        densityClock -= dt;
        if (densityClock <= 0) {
          densityClock = 0.6;
          for (const mark of marks) {
            mark.bounds.getCenter(densityMidpoint);
            mark.neighbors = 0;
            for (const other of marks)
              if (
                other !== mark &&
                other.bounds.distanceToPoint(densityMidpoint) < 9
              )
                mark.neighbors++;
          }
        }
        for (let i = marks.length - 1; i >= 0; i--) {
          const item = marks[i],
            age = elapsed - item.born;
          // Dense nearby pigment accelerates dissolution of older marks smoothly.
          item.fade = dissolvePigment({
            age,
            count: marks.length,
            neighbors: item.neighbors || 0,
            fade: item.fade,
            dt,
            significance: item.significance,
            opening: item.opening,
          });
          const fade = item.fade;
          for (const uniforms of uniformsFor(item)) {
            if (uniforms.uAge) uniforms.uAge.value = age;
            if (uniforms.uFade) uniforms.uFade.value = fade;
          }
          if (fade < 0.012 && !isActive(item)) {
            destroyStroke(item);
            marks.splice(i, 1);
            boundsDirty = true;
          }
        }
        renderer.domElement.dataset.markCount = String(marks.length);
      }
      const visual = padSource?.getVisualFeatures?.() || f || {};
      moodAtmosphere?.update(lifeTime, visual);
      updateDirect(dt, visual);
      let drift = 0;
      for (const mark of marks) {
        const local = mark.respond(visual, dt);
        drift = Math.max(
          drift,
          pictorialFlow.update(
            mark,
            dt * mark.motionScale,
            local,
            lifeTime * mark.motionScale,
            isActive(mark),
          ),
        );
        const resonance = padSource?.getTraceResonance?.(mark.traceId) || 0;
        const response =
          resonance > 0
            ? {
                ...local,
                energy: Math.min(1, local.energy + resonance * 0.35),
                pulse: Math.min(1, local.pulse + resonance * 0.55),
              }
            : local;
        const suspended = mark.life === "Suspendue",
          vibrant = mark.life === "Vibrante";
        const speed =
          (suspended ? 0.55 : vibrant ? 1.3 : 0.85) * mark.motionScale;
        const sensitivity =
          (suspended ? 0.72 : vibrant ? 1.15 : 1) * mark.responseGain;
        mark.stroke.update?.(dt * speed, response);
        for (const uniforms of uniformsFor(mark)) {
          if (uniforms.uTime) uniforms.uTime.value = lifeTime * speed;
          if (uniforms.uWakeClock) uniforms.uWakeClock.value = lifeTime;
          if (uniforms.uPigment)
            uniforms.uPigment.value =
              1.12 +
              (response.energy || 0) * 0.65 +
              (response.pulse || 0) * 0.25;
          if (uniforms.uAudioEnergy)
            uniforms.uAudioEnergy.value = Math.min(
              1,
              (response.energy || 0) * sensitivity,
            );
          if (uniforms.uAudioLow)
            uniforms.uAudioLow.value = Math.min(
              1,
              (response.low || 0) * sensitivity,
            );
          if (uniforms.uAudioPulse)
            uniforms.uAudioPulse.value = Math.min(
              1,
              (response.pulse || 0) * sensitivity,
            );
        }
      }
      renderer.domElement.dataset.matterDrift = drift.toFixed(4);
      if (densityClock <= dt) boundsDirty = true;
      if (boundsDirty) updateBounds();
    }
    renderer.domElement.dataset.sculpturePaused = String(photo);
    renderer.domElement.dataset.lifeTime = lifeTime.toFixed(3);
    renderer.domElement.dataset.materialTime = (
      marks[0]?.uniforms[0]?.uTime?.value ?? 0
    ).toFixed(3);
    rig.update(dt);
    camera.updateMatrixWorld();
    if (!photo && padSource?.updateListener) {
      const inverse = landscape
        .getWorldQuaternion(new THREE.Quaternion())
        .invert();
      padSource.updateListener(
        landscape.worldToLocal(camera.position.clone()),
        camera.getWorldDirection(new THREE.Vector3()).applyQuaternion(inverse),
        new THREE.Vector3(0, 1, 0)
          .applyQuaternion(camera.quaternion)
          .applyQuaternion(inverse),
      );
      const sound = padSource.getInstrumentStats?.();
      renderer.domElement.dataset.instrumentNotes = String(sound?.total || 0);
      renderer.domElement.dataset.instrumentVoices = String(sound?.voices || 0);
    }
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
      renderer.domElement.dataset.vocalFireflies = String(
        vocalFireflies?.count || 0,
      );
      renderer.domElement.dataset.videoFrames = String(
        videodio?.getHistory().frames || 0,
      );
      renderer.domElement.dataset.oizo = String(Boolean(padSource));
      renderer.domElement.dataset.oizoVisible = String(
        Boolean(oizo?.group.visible),
      );
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
      onBubbleScore?.(0, 24);
      padSource = source;
      navigation.windEnabled = Boolean(source);
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
    setGeneratedBrush(id, profile) {
      if (!BRUSHES.some((item) => item.id === id) || generatedBrushes.has(id))
        return null;
      const binding = createWatercolorTexture(
        { color: profile.color, kind: profile.textureKind },
        profile.seed,
        mobile ? 128 : 256,
        profile.acoustic,
        profile.visual,
      );
      generatedBrushes.set(id, profile);
      this.setBrushTexture(id, binding);
      renderer.domElement.dataset.generatedBrushCount = String(
        generatedBrushes.size,
      );
      return binding.texture.image.toDataURL("image/png");
    },
    async updateBrush(profile, { file = null, resetAlpha = false } = {}) {
      if (!generatedBrushes.has(profile.id))
        throw new Error("Brosse inconnue.");
      const previous = textures.get(profile.id);
      let binding;
      if (file) binding = await loadAlphaTexture(file, mobile ? 256 : 512);
      else if (
        previous &&
        !resetAlpha &&
        (previous.importedAlpha ||
          generatedBrushes.get(profile.id).color === profile.color)
      )
        binding = previous;
      else
        binding = createWatercolorTexture(
          { color: profile.color, kind: profile.textureKind },
          profile.seed,
          mobile ? 128 : 256,
        );
      if (disposed) {
        if (binding !== previous) binding.texture.dispose();
        return;
      }
      cancelSteering();
      bridge.close();
      closeStroke();
      const next = {
        ...profile,
        alphaName: file ? file.name : resetAlpha ? "" : profile.alphaName,
      };
      generatedBrushes.set(profile.id, next);
      if (binding !== previous)
        this.setBrushTexture(profile.id, binding, { preserveExisting: true });
      return next;
    },
    setBrush(id) {
      if (BRUSHES.some((item) => item.id === id) && id !== brush) {
        if (nozzlePaint) {
          finishPad(nozzlePaint.id);
          nozzlePaint = { id, samples: 0 };
          void padSource?.beginSculpture?.(id);
        }
        brush = id;
        closeStroke();
        renderer.domElement.dataset.activeBrush = id;
        void padSource?.preloadBirdSong?.(id);
      }
    },
    setImageBrush(id, profile) {
      imageBrushes.set(id, profile);
      this.setBrushTexture(id, profile.binding);
    },
    setBrushTexture(id, binding, { preserveExisting = false } = {}) {
      const previous = textures.get(id);
      textures.set(id, binding);
      if (!preserveExisting)
        marks
          .filter((mark) => mark.brush === id)
          .forEach((mark) => {
            mark.stroke.setTexture(binding);
            mark.binding = binding;
            mark.textureLease?.release();
            mark.textureLease = null;
          });
      if (previous && previous !== binding) {
        if (marks.some((mark) => mark.binding === previous))
          retiredTextures.add(previous);
        else previous.texture.dispose();
      }
    },
    setPoeticFragments(fragments) {
      poeticFragments = fragments;
    },
    setMood(universe, profiles) {
      reset();
      moodAtmosphere?.dispose();
      textures.forEach((binding) => binding.texture.dispose());
      textures.clear();
      generatedBrushes.clear();
      scene.background.set(universe.background);
      effects.setPaper(universe.background);
      renderer.setClearColor(universe.background);
      for (const profile of profiles)
        this.setGeneratedBrush(profile.id, profile);
      moodAtmosphere = createMoodAtmosphere(universe, mobile);
      landscape.add(moodAtmosphere.object);
      renderer.domElement.dataset.echoMood = String(universe.seed);
      renderer.domElement.dataset.moodBackground = universe.background;
    },
    setCameraMode(next) {
      endDirect();
      if (next === "sculpt") directSculpture = true;
      else if (next === "drone") directSculpture = false;
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
      moodAtmosphere?.dispose();
      generatedBrushes.clear();
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      marks.forEach(destroyStroke);
      generative?.dispose();
      textures.forEach((binding) => binding.texture.dispose());
      retiredTextures.forEach((binding) => binding.texture.dispose());
      retiredTextures.clear();
      imageBrushes.clear();
      tip.geometry.dispose();
      tip.material.dispose();
      effects.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
