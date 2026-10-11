import {
  createAudioGraph,
  readAudioFeatures,
  reverseAudioBuffer,
} from "../audio/audioGraph.js";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import vertexShader from "./shaders/vertexShader.glsl?raw";
import fragmentShader from "./shaders/fragmentShader.glsl?raw";
import bubbleVertex from "./shaders/bubbleVertex.glsl?raw";
import bubbleFragment from "./shaders/bubbleFragment.glsl?raw";
import pigmentVertex from "./shaders/pigmentVertex.glsl?raw";
import pigmentFragment from "./shaders/pigmentFragment.glsl?raw";

/** Imperative Three.js/Web Audio engine; React owns the surrounding interface.
 * All DOM queries are scoped to the mounted app. Returns its teardown function.
 */
export function createSoundNest(root) {
  let disposed = false;
  let animationId;
  const listeners = [];
  function listen(target, event, handler, options) {
    target.addEventListener(event, handler, options);
    listeners.push(() => target.removeEventListener(event, handler, options));
  }
  const $ = (s) => root.querySelector(s),
    status = $("#status"),
    hint = $("#gyroHint");
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 0.95));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0xf4f0e8);
  $("#stage").append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#f4f0e8");
  scene.fog = new THREE.FogExp2("#f4f0e8", 0.009);
  const camera = new THREE.PerspectiveCamera(
    88,
    innerWidth / innerHeight,
    0.035,
    250,
  );
  camera.position.set(6, 5, 13);
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.minDistance = 2;
  orbit.maxDistance = 100;
  orbit.target.set(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb6b4a7, 2.4));
  const sun = new THREE.DirectionalLight(0xfff8e7, 2.1);
  sun.position.set(6, 12, 9);
  scene.add(sun);
  // Aquarelle multicouche : diffusion, capillarité, granulation, bords pigmentés et réserves.
  const paintUniforms = { uTime: { value: 0 }, uPigment: { value: 0.65 } };

  function pigmentMaterial(opacity, layer, style = 0) {
    return new THREE.ShaderMaterial({
      uniforms: {
        ...paintUniforms,
        uOpacity: { value: opacity },
        uLayer: { value: layer },
        uSeed: { value: (layer ? 5.7 : 1.3) + style * 3.71 },
        uStyle: { value: style },
        uFade: { value: 1 },
      },
      vertexShader,
      fragmentShader,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      extensions: { derivatives: true },
    });
  }
  const mat = pigmentMaterial(1.0, 0),
    washMat = pigmentMaterial(0.3, 1);
  paintUniforms.uPigment.value = 0.3 + Number(6) * 0.065;
  const paintGroup = new THREE.Group();
  scene.add(paintGroup);
  let audioEnergy = 0,
    audioMotion = 0,
    cameraFocus = new THREE.Vector3(),
    cameraVelocity = new THREE.Vector3(),
    cameraOrbitPhase = 0,
    cameraDistance = 13,
    cameraMode = "attente",
    cameraFov = 88,
    lastGesturePoint = new THREE.Vector3(),
    gestureVelocity = new THREE.Vector3(),
    calmDuration = 0;
  // Le toucher est une seconde force, non une source de peinture autonome.
  const touch = {
    down: false,
    id: null,
    force: 0,
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    world: new THREE.Vector3(),
    target: new THREE.Vector3(),
    last: new THREE.Vector2(),
    hold: 0,
  };
  const touchPlane = new THREE.Plane(),
    touchRay = new THREE.Raycaster(),
    touchNdc = new THREE.Vector2();
  const touchHalo = new THREE.Mesh(
    new THREE.RingGeometry(0.26, 0.34, 64),
    new THREE.MeshBasicMaterial({
      color: 0xc48671,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  scene.add(touchHalo);
  touchHalo.visible = false;
  function touchAt(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    touchNdc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    touchRay.setFromCamera(touchNdc, camera);
    const center = tip.visible ? tip.position : cameraAim;
    const normal = new THREE.Vector3(0, 0, -1).applyQuaternion(
      camera.quaternion,
    );
    touchPlane.setFromNormalAndCoplanarPoint(normal, center);
    if (touchRay.ray.intersectPlane(touchPlane, touch.target)) {
      const dist = touch.target.distanceTo(center);
      if (dist > 9)
        touch.target
          .sub(center)
          .multiplyScalar(9 / dist)
          .add(center);
    }
  }
  let colorDrips = [],
    monotoneAge = 0,
    nextDripAt = 2.4,
    lastDripAnchor = null;
  let inkMarks = [],
    fading = [],
    smoothedWidth = 0.22,
    smoothedFold = 0.1,
    smoothedTwist = 0,
    lastSampleAt = 0,
    dancePhase = 0;
  let brushStyle = "danse",
    brushVariation = 0;
  let livePigments = null,
    pigmentFades = [];
  let liveBubbles = null,
    bubbleFades = [];
  let blackSplatches = [];
  let dance = null,
    previousEndpoint = new THREE.Vector3(),
    previousDirection = new THREE.Vector3(1, 0, 0);
  const danceTypes = [
    "voile",
    "spirale",
    "elan",
    "calligraphie",
    "petale",
    "cascade",
  ];
  function makeDance(f) {
    const index = strokeCount;
    const families =
      brushStyle === "vegetal"
        ? ["spirale", "cascade", "elan", "petale", "cascade"]
        : brushStyle === "calligraphie"
          ? ["calligraphie", "elan", "spirale", "calligraphie", "cascade"]
          : danceTypes;
    const kind =
      families[
        (index * 5 +
          Math.floor(f.freq / 610) +
          Math.floor(f.flux * 11) +
          brushVariation) %
          families.length
      ];
    const golden = index * 2.39996323,
      layer = (index % 7) - 3;
    const origin =
      index === 0 ? new THREE.Vector3(0, 0, 0) : previousEndpoint.clone();
    const dir = new THREE.Vector3(
      Math.cos(golden),
      0.25 * Math.sin(golden * 1.7) + 0.14 * layer,
      Math.sin(golden),
    ).normalize();
    const span =
      (5.5 + f.energy * 6 + 3 * Math.abs(Math.sin(index * 1.73))) *
      (brushStyle === "vegetal"
        ? 0.72
        : brushStyle === "calligraphie"
          ? 1.35
          : 1);
    const p1 = origin
      .clone()
      .addScaledVector(previousDirection, span * 0.27)
      .addScaledVector(new THREE.Vector3(0, 1, 0), 2 * Math.sin(golden));
    const p2 = origin
      .clone()
      .addScaledVector(dir, span * 0.68)
      .add(
        new THREE.Vector3(
          1.8 * Math.sin(golden * 2),
          3.8 * Math.cos(golden * 0.7),
          1.7 * Math.cos(golden * 2),
        ),
      );
    const end = origin
      .clone()
      .addScaledVector(dir, span)
      .add(new THREE.Vector3(0, 2.8 * Math.sin(golden * 0.9), 0));
    previousDirection.copy(dir);
    return {
      kind,
      origin,
      p1,
      p2,
      end,
      span,
      phase: golden,
      twist: golden * 0.4,
      seed: index * 7.13,
      texture:
        brushStyle === "vegetal"
          ? 2 + ((index + Math.floor(f.high * 9)) % 3)
          : brushStyle === "calligraphie"
            ? 1 + ((index + brushVariation) % 2) * 4
            : (index * 7 + Math.floor(f.high * 13)) % 6,
      flute: 2 + ((index * 3) % 9),
      curl: 0.4 + 0.6 * Math.abs(Math.sin(index * 1.97)),
      edge: 0.1 + 0.65 * Math.abs(Math.sin(index * 2.73)),
    };
  }
  let stream = null,
    listening = false,
    audioMode = "",
    fileNode = null,
    fileURL = "",
    audio = new Audio(),
    paths = [],
    flightCurve = null,
    flightIndex = 0,
    flightProgress = 0,
    droneTime = 0,
    droneTarget = new THREE.Vector3(),
    droneLook = new THREE.Vector3();
  let eventAge = 0,
    holdOff = 0,
    gestureKind = "weave",
    gestureAge = 0,
    gestureStart = 0,
    lastPitch = 0,
    pitchVelocity = 0,
    branchCooldown = 0,
    baseline = 0.012,
    prevCentroid = 0,
    activity = 0,
    gateOpen = false,
    strokeCount = 0,
    seedAngle = 0,
    ctx,
    analyser,
    source,
    bins,
    wave,
    prev,
    objectURL,
    activeStroke = [],
    mesh = null,
    washed = null,
    objects = [],
    t = 0,
    phrase = 0,
    quiet = 0,
    lastBuild = 0,
    lastBranch = 0,
    tipPosition = new THREE.Vector3(),
    smoothFreq = 0,
    inside = false,
    gyroActive = false,
    gyroAngles = null,
    manualYaw = 0,
    manualPitch = 0,
    drag = null;
  const tip = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0x536e65 }),
  );
  scene.add(tip);
  tip.visible = false;
  async function initAudio() {
    if (disposed) return;
    if (scratchActive) finishScratch(false);

    if (!ctx) {
      ({ ctx, analyser, bins, wave, prev } = createAudioGraph());
    }
    if (!navigator.mediaDevices?.getUserMedia)
      throw Error("Micro inaccessible : utiliser HTTPS ou localhost");
    audio.pause();
    if (fileNode) fileNode.disconnect(analyser);
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    if (disposed) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    await ctx.resume();
    if (disposed) return;
    listening = true;
    audioMode = "mic";
    $("#mic").textContent = "■ Couper le micro";
    status.textContent =
      "Écoute active · les sons faibles ou stables ne peignent pas";
  }
  $("#mic").onclick = async () => {
    if (listening) {
      stream?.getTracks().forEach((t) => t.stop());
      source?.disconnect();
      listening = false;
      audioMode = "";
      $("#mic").textContent = "◉ Activer le micro";
      status.textContent = "Micro coupé";
      endStroke();
      tip.visible = false;
      return;
    }
    try {
      await initAudio();
    } catch (e) {
      status.textContent = e.message;
    }
  };
  $("#file").onchange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      if (!ctx) {
        ({ ctx, analyser, bins, wave, prev } = createAudioGraph());
      }
      if (listening) {
        stream?.getTracks().forEach((t) => t.stop());
        source?.disconnect();
        listening = false;
        $("#mic").textContent = "◉ Activer le micro";
      }
      finishScratch(false);
      scratchBuffer = null;
      scratchReverse = null;
      audio.pause();
      if (fileURL) URL.revokeObjectURL(fileURL);
      fileURL = URL.createObjectURL(f);
      audio.src = fileURL;
      try {
        const ab = await f.arrayBuffer();
        scratchBuffer = await ctx.decodeAudioData(ab);
        if (disposed) return;
        scratchReverse = reverseAudioBuffer(ctx, scratchBuffer);
      } catch (err) {
        scratchBuffer = null;
        scratchReverse = null;
        $("#scratchHint").textContent = "↔ Déplacement";
      }
      if (disposed) return;
      if (!fileNode) {
        fileNode = ctx.createMediaElementSource(audio);
        fileNode.connect(analyser);
        fileNode.connect(ctx.destination);
      } else {
        try {
          fileNode.connect(analyser);
        } catch (e) {}
      }
      audioMode = "file";
      await ctx.resume();
      await audio.play();
      $("#fileRow").style.display = "flex";
      $("#play").style.display = "inline-block";
      $("#play").textContent = "❚❚";
      status.textContent = f.name;
    } catch (err) {
      status.textContent = "MP3 : " + err.message;
    }
    e.target.value = "";
  };
  $("#play").onclick = async () => {
    if (scratchActive) finishScratch(false);
    if (audio.paused) {
      await ctx?.resume();
      try {
        await audio.play();
      } catch (e) {
        status.textContent = e.message;
      }
    } else audio.pause();
    $("#play").textContent = audio.paused ? "▶" : "❚❚";
  };
  audio.onpause = audio.onplay = () => {
    $("#play").textContent = audio.paused ? "▶" : "❚❚";
  };
  audio.ontimeupdate = () => {
    if (scratchActive) return;
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      $("#seek").value = (1000 * audio.currentTime) / audio.duration;
      const x = Math.floor(audio.currentTime);
      $("#time").textContent =
        Math.floor(x / 60) + ":" + String(x % 60).padStart(2, "0");
    }
  };
  // La barre de lecture est aussi une platine tactile. Les grains sont produits
  // dans WebAudio (avant/arriere), sans modifier les cinq moteurs de peinture.
  let scratchBuffer = null,
    scratchReverse = null,
    scratchActive = false,
    scratchPointer = null,
    scratchPos = 0,
    scratchLastX = 0,
    scratchLastAt = 0,
    scratchLastGrain = 0,
    scratchSources = [],
    scratchWasPlaying = false;
  function scratchClock() {
    return performance.now() * 0.001;
  }
  function stopScratchGrains() {
    for (const item of scratchSources) {
      try {
        item.src.stop();
      } catch (e) {}
      try {
        item.src.disconnect();
      } catch (e) {}
      try {
        item.gain.disconnect();
      } catch (e) {}
    }
    scratchSources = [];
  }
  function scratchGrain(speed) {
    if (!scratchBuffer || !ctx || Math.abs(speed) < 0.04) return;
    const forward = speed >= 0,
      buf = forward ? scratchBuffer : scratchReverse;
    const rate = Math.min(3.2, Math.max(0.28, Math.abs(speed)));
    const length = 0.085;
    const playTime = Math.min(length, 0.18 / rate);
    const offset = forward
      ? scratchPos
      : Math.max(0, scratchBuffer.duration - scratchPos);
    const safe = Math.max(0, Math.min(buf.duration - 0.01, offset));
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const gain = ctx.createGain(),
      start = ctx.currentTime;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.8, start + 0.012);
    gain.gain.setValueAtTime(0.8, start + Math.max(0.014, playTime - 0.02));
    gain.gain.linearRampToValueAtTime(0, start + playTime);
    src.connect(gain);
    gain.connect(analyser);
    gain.connect(ctx.destination);
    src.start(start, safe, Math.min(playTime * rate, buf.duration - safe));
    src.stop(start + playTime + 0.005);
    scratchSources.push({ src, gain });
    src.onended = () => {
      try {
        src.disconnect();
        gain.disconnect();
      } catch (e) {}
      scratchSources = scratchSources.filter((g) => g.src !== src);
    };
  }
  function updateScratchUI() {
    if (!Number.isFinite(audio.duration) || !audio.duration) return;
    $("#seek").value = (1000 * scratchPos) / audio.duration;
    const x = Math.floor(scratchPos);
    $("#time").textContent =
      Math.floor(x / 60) + ":" + String(x % 60).padStart(2, "0");
  }
  function finishScratch(resume = true) {
    if (!scratchActive) return;
    scratchActive = false;
    scratchPointer = null;
    $("#fileRow").classList.remove("scratching");
    $("#scratchHint").textContent = "↔ Scratch";
    stopScratchGrains();
    if (Number.isFinite(audio.duration))
      audio.currentTime = Math.max(
        0,
        Math.min(audio.duration - 0.02, scratchPos),
      );
    if (resume && scratchWasPlaying) {
      ctx?.resume();
      audio.play().catch(() => {});
    }
    scratchWasPlaying = false;
  }
  const seek = $("#seek");
  listen(seek, "pointerdown", (e) => {
    if (
      audioMode !== "file" ||
      !Number.isFinite(audio.duration) ||
      !audio.duration
    )
      return;
    e.preventDefault();
    scratchActive = true;
    scratchPointer = e.pointerId;
    scratchWasPlaying = !audio.paused;
    scratchPos = (audio.duration * +seek.value) / 1000;
    scratchLastX = e.clientX;
    scratchLastAt = scratchClock();
    scratchLastGrain = 0;
    audio.pause();
    ctx?.resume();
    seek.setPointerCapture(e.pointerId);
    $("#fileRow").classList.add("scratching");
    $("#scratchHint").textContent = "◀ ▶ SCRATCH";
  });
  listen(seek, "pointermove", (e) => {
    if (!scratchActive || e.pointerId !== scratchPointer) return;
    e.preventDefault();
    const now = scratchClock(),
      rect = seek.getBoundingClientRect();
    const dt = Math.max(0.008, now - scratchLastAt);
    const dx = e.clientX - scratchLastX;
    const seconds = (dx / Math.max(1, rect.width)) * audio.duration;
    scratchPos = Math.max(
      0,
      Math.min(audio.duration - 0.02, scratchPos + seconds),
    );
    const speed = seconds / dt;
    if (now - scratchLastGrain > 0.048 && Math.abs(dx) > 0.3) {
      scratchGrain(speed);
      scratchLastGrain = now;
    }
    scratchLastX = e.clientX;
    scratchLastAt = now;
    updateScratchUI();
  });
  listen(seek, "pointerup", (e) => {
    if (scratchActive && e.pointerId === scratchPointer) finishScratch(true);
  });
  listen(seek, "pointercancel", () => finishScratch(true));
  listen(seek, "lostpointercapture", () => finishScratch(true));
  listen(seek, "keydown", (e) => {
    if (!Number.isFinite(audio.duration)) return;
    const x = +seek.value;
    audio.currentTime = (audio.duration * x) / 1000;
  });
  listen(seek, "input", () => {
    if (!scratchActive && Number.isFinite(audio.duration))
      audio.currentTime = (audio.duration * +seek.value) / 1000;
  });
  function discard(o) {
    if (!o) return;
    o.parent?.remove(o);
    if (
      o.geometry &&
      o.geometry !== bubbleGeo &&
      !o.geometry.userData._disposed
    ) {
      o.geometry.dispose();
      o.geometry.userData._disposed = true;
    }
    if (o.material && o.material !== mat && o.material !== washMat)
      o.material.dispose();
  }
  function clear() {
    for (const s of blackSplatches) {
      s.sprite.parent?.remove(s.sprite);
      s.sprite.material.map?.dispose();
      s.sprite.material.dispose();
    }
    blackSplatches = [];
    dance = null;
    previousEndpoint.set(0, 0, 0);
    previousDirection.set(1, 0, 0);
    objects.forEach(discard);
    objects = [];
    livePigments = null;
    pigmentFades = [];
    if (liveBubbles) discard(liveBubbles.mesh);
    for (const b of bubbleFades) discard(b.item.mesh);
    liveBubbles = null;
    bubbleFades = [];
    inkMarks = [];
    fading = [];
    paths = [];
    colorDrips = [];
    monotoneAge = 0;
    nextDripAt = 2.4;
    lastDripAnchor = null;
    flightCurve = null;
    flightIndex = 0;
    flightProgress = 0;
    discard(mesh);
    discard(washed);
    mesh = washed = null;
    liveRows = 0;
    livePositions = liveColors = liveUvs = liveNormals = null;
    activeStroke = [];
    t = 0;
    phrase = 0;
    quiet = 0;
    smoothFreq = 0;
    tipPosition.set(0, 0, 0);
    tip.visible = false;
    audioEnergy = audioMotion = 0;
    cameraDistance = 13;
    calmDuration = 0;
    trackingBlend = 0;
    hadTip = false;
    cameraAim.set(0, 0, 0);
    cameraPivot.set(0, 0, 0);
    overviewCenter.set(0, 0, 0);
    eventAge = 0;
    baseline = 0.012;
    holdOff = 0;
    prevCentroid = 0;
    activity = 0;
    gateOpen = false;
    strokeCount = 0;
    seedAngle = 0;
    gestureKind = "weave";
    gestureAge = 0;
    gestureStart = 0;
    lastPitch = 0;
    pitchVelocity = 0;
    prev?.fill(0);
  }
  function endStroke() {
    // Encre noire : très rare, jamais un contour systématique des rubans.
    if (
      brushStyle !== "vegetal" &&
      brushStyle !== "bulles" &&
      activeStroke.length > 14 &&
      Math.random() < 0.105
    ) {
      const now = performance.now() / 1000,
        life = Number($("#life").value);
      const stride = Math.max(1, Math.floor(activeStroke.length / 34));
      const sampled = activeStroke
        .filter((_, i) => i % stride === 0)
        .map((s) => s.p.clone());
      if (sampled.length > 3) {
        const curve = new THREE.CatmullRomCurve3(sampled, false, "centripetal");
        const ink = new THREE.Mesh(
          new THREE.TubeGeometry(
            curve,
            Math.min(100, sampled.length * 3),
            0.009 + Math.random() * 0.018,
            5,
            false,
          ),
          new THREE.MeshBasicMaterial({
            color: 0x171d1c,
            transparent: true,
            opacity: 0.64,
            depthWrite: false,
          }),
        );
        paintGroup.add(ink);
        objects.push(ink);
        inkMarks.push({ object: ink, born: now, life, opacity: 0.64 });
        // Quelques éclaboussures ponctuelles à proximité du geste, jamais un nuage.
        if (Math.random() < 0.52) {
          const count = 3 + Math.floor(Math.random() * 6),
            pts = [];
          const center =
            sampled[Math.floor(sampled.length * (0.3 + Math.random() * 0.5))];
          for (let i = 0; i < count; i++)
            pts.push(
              center.x + (Math.random() - 0.5) * 0.7,
              center.y + (Math.random() - 0.5) * 0.7,
              center.z + (Math.random() - 0.5) * 0.7,
            );
          const geo = new THREE.BufferGeometry();
          geo.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(pts, 3),
          );
          const dots = new THREE.Points(
            geo,
            new THREE.PointsMaterial({
              color: 0x151a19,
              size: 0.035 + Math.random() * 0.045,
              transparent: true,
              opacity: 0.66,
              depthWrite: false,
              sizeAttenuation: true,
            }),
          );
          paintGroup.add(dots);
          objects.push(dots);
          inkMarks.push({ object: dots, born: now, life, opacity: 0.66 });
        }
      }
    }
    if (activeStroke.length > 4) {
      const points = activeStroke.map((s) => s.p.clone());
      paths.push({ points, born: performance.now() / 1000 });
      if (paths.length > 60) paths.shift();
    }
    if (livePigments) {
      pigmentFades.push({
        item: livePigments,
        born: performance.now() / 1000,
        life: Number($("#life").value),
      });
      objects.push(livePigments.points);
      livePigments = null;
      while (pigmentFades.length > 8) {
        const old = pigmentFades.shift();
        discard(old.item.points);
        objects = objects.filter((o) => o !== old.item.points);
      }
    }
    if (liveBubbles) {
      const b = liveBubbles;
      liveBubbles = null;
      bubbleFades.push({
        item: b,
        born: performance.now() / 1000,
        life: Number($("#life").value),
      });
      objects.push(b.mesh);
      while (bubbleFades.length > 7) {
        const old = bubbleFades.shift();
        discard(old.item.mesh);
        objects = objects.filter((o) => o !== old.item.mesh);
      }
    }
    if (mesh && washed) {
      const now = performance.now() / 1000;
      fading.push({
        main: mesh,
        wash: washed,
        born: now,
        life: Number($("#life").value),
      });
      while (fading.length > 9) {
        const old = fading.shift();
        discard(old.main);
        discard(old.wash);
        objects = objects.filter((o) => o !== old.main && o !== old.wash);
      }
      objects.push(mesh, washed);
    } else {
      discard(mesh);
      discard(washed);
    }
    mesh = washed = null;
    liveRows = 0;
    livePositions = liveColors = liveUvs = liveNormals = null;
    activeStroke = [];
    gestureAge = 0;
    phrase++;
    strokeCount++;
    seedAngle += 2.399963229728653;
    if (dance) {
      previousEndpoint.copy(tipPosition);
      dance = null;
    }
  }
  // Des coulures colorées rares, uniquement lorsqu'une note audible devient stable.
  // Chaque goutte est ancrée à un ruban récent et partage sa durée de vie.
  function addColorDrip() {
    const parent = fading.length ? fading[fading.length - 1] : null;
    const samples = activeStroke.length > 5 ? activeStroke : null;
    let origin, hue;
    if (samples) {
      const s =
        samples[Math.floor(samples.length * (0.45 + Math.random() * 0.4))];
      origin = s.p.clone();
      hue = s.color.clone();
    } else if (paths.length) {
      const path = paths[paths.length - 1];
      if (!path.points.length) return;
      origin =
        path.points[
          Math.floor(path.points.length * (0.45 + Math.random() * 0.4))
        ].clone();
      hue = new THREE.Color().setHSL(
        (smoothFreq * 0.52 + phrase * 0.073 + 0.07) % 1,
        0.65,
        0.4,
      );
    } else return;
    const life = Math.max(
      3,
      Number($("#life").value) * (0.45 + Math.random() * 0.35),
    );
    const length = 0.3 + Math.random() * 1.25,
      sway = (Math.random() - 0.5) * 0.45;
    const nodes = [
      origin.clone(),
      origin.clone().add(new THREE.Vector3(sway * 0.3, -length * 0.42, 0.08)),
      origin.clone().add(new THREE.Vector3(sway, -length, 0.14)),
    ];
    const curve = new THREE.CatmullRomCurve3(nodes, false, "centripetal");
    const radius = 0.012 + Math.random() * 0.035;
    const geo = new THREE.TubeGeometry(curve, 16, radius, 5, false);
    const material = new THREE.MeshBasicMaterial({
      color: hue,
      transparent: true,
      opacity: 0.66,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const drip = new THREE.Mesh(geo, material);
    paintGroup.add(drip);
    objects.push(drip);
    const marks = [drip];
    if (Math.random() < 0.72) {
      const dots = 3 + Math.floor(Math.random() * 6),
        pts = [];
      const bottom = nodes[2];
      for (let i = 0; i < dots; i++)
        pts.push(
          bottom.x + (Math.random() - 0.5) * 0.8,
          bottom.y + (Math.random() - 0.5) * 0.65,
          bottom.z + (Math.random() - 0.5) * 0.55,
        );
      const dg = new THREE.BufferGeometry();
      dg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      const dm = new THREE.PointsMaterial({
        color: hue,
        size: 0.035 + Math.random() * 0.055,
        transparent: true,
        opacity: 0.46,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const splashes = new THREE.Points(dg, dm);
      paintGroup.add(splashes);
      objects.push(splashes);
      marks.push(splashes);
    }
    colorDrips.push({
      marks,
      born: performance.now() / 1000,
      life,
      opacities: marks.map((m) => m.material.opacity),
    });
  }
  // Bulles : véritables sphères 3D instanciées, avec dégradé aquarellé translucide.
  // Un seul appel de dessin par geste, même lorsque plusieurs bulles apparaissent.
  const BUBBLE_CAP = 120;
  const bubbleGeo = new THREE.SphereGeometry(1, 10, 8);

  const bubbleDummy = new THREE.Object3D();
  function createBubbles() {
    const material = new THREE.ShaderMaterial({
      uniforms: { uFade: { value: 1 } },
      vertexShader: bubbleVertex,
      fragmentShader: bubbleFragment,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.InstancedMesh(bubbleGeo, material, BUBBLE_CAP);
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    paintGroup.add(mesh);
    return {
      mesh,
      n: 0,
      centers: [],
      sizes: [],
      phases: [],
      ages: [],
      drifts: [],
      born: performance.now() / 1000,
      lastDrop: 0,
    };
  }
  function depositBubbles(s, f, novelty) {
    if (!liveBubbles) liveBubbles = createBubbles();
    const b = liveBubbles;
    const now = performance.now() / 1000;
    // Petites bulles clairsemées : une apparition espacée, jamais un chapelet compact.
    const interval =
      0.16 + 0.19 * (1 - Math.min(1, f.energy)) + Math.random() * 0.1;
    if (now - b.lastDrop < interval) return;
    b.lastDrop = now;
    const count = novelty > 0.79 && Math.random() < 0.22 ? 2 : 1;
    for (let j = 0; j < count && b.n < BUBBLE_CAP; j++) {
      const i = b.n++;
      const radius =
        (0.035 + Math.pow(Math.random(), 2.2) * 0.21) * (1 + f.energy * 0.22);
      const center = s.p
        .clone()
        .add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 2.9,
            (Math.random() - 0.5) * 2.3,
            (Math.random() - 0.5) * 2.9,
          ),
        );
      const phase = Math.random() * Math.PI * 2;
      const drift = new THREE.Vector3(
        (Math.random() - 0.5) * 0.23,
        0.025 + Math.random() * 0.1,
        (Math.random() - 0.5) * 0.23,
      );
      const color = new THREE.Color().setHSL(
        (0.012 + Math.random() * 0.105) % 1,
        0.68 + Math.random() * 0.22,
        0.52 + Math.random() * 0.2,
      );
      b.centers.push(center);
      b.sizes.push(radius);
      b.phases.push(phase);
      b.ages.push(now - b.born);
      b.drifts.push(drift);
      bubbleDummy.position.copy(center);
      bubbleDummy.scale.setScalar(radius);
      bubbleDummy.updateMatrix();
      b.mesh.setMatrixAt(i, bubbleDummy.matrix);
      b.mesh.setColorAt(i, color);
    }
    b.mesh.count = b.n;
    b.mesh.instanceMatrix.needsUpdate = true;
    if (b.mesh.instanceColor) b.mesh.instanceColor.needsUpdate = true;
  }
  function floatBubbles(b, now) {
    const elapsed = now - b.born;
    for (let i = 0; i < b.n; i++) {
      const c = b.centers[i],
        phase = b.phases[i],
        age = Math.max(0, elapsed - b.ages[i]),
        d = b.drifts[i];
      // Virevoltes indépendantes, ascendantes, avec dérive latérale et micro-orbites.
      const swirl = 0.11 + 0.07 * Math.sin(phase * 2.1);
      bubbleDummy.position.set(
        c.x +
          d.x * age +
          Math.sin(age * (0.75 + 0.3 * Math.sin(phase)) + phase) * swirl,
        c.y + d.y * age + Math.sin(age * 1.05 + phase) * 0.07,
        c.z +
          d.z * age +
          Math.cos(age * (0.68 + 0.25 * Math.cos(phase)) + phase) * swirl,
      );
      const breath = 1 + 0.045 * Math.sin(age * 2.0 + phase);
      bubbleDummy.scale.setScalar(b.sizes[i] * breath);
      bubbleDummy.updateMatrix();
      b.mesh.setMatrixAt(i, bubbleDummy.matrix);
    }
    b.mesh.instanceMatrix.needsUpdate = true;
  }
  // Tampon noir : une empreinte à chaque tap, jamais de tracé continu.
  // La silhouette est dessinée une fois sur canvas, puis affichée comme sprite 3D.
  function stampBlackSplatch(position) {
    const size = 256,
      canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const g = canvas.getContext("2d"),
      cx = 128,
      cy = 128;
    const rand = (a, b) => a + Math.random() * (b - a);
    g.translate(cx, cy);
    g.rotate(rand(-Math.PI, Math.PI));
    // Masse centrale irrégulière et ramifications souples, non étoile géométrique.
    g.fillStyle = "rgba(12,14,15,.92)";
    g.beginPath();
    const lobes = 23,
      pts = [];
    for (let i = 0; i < lobes; i++) {
      const a = (i / lobes) * Math.PI * 2,
        r = rand(27, 48) * (i % 5 === 0 ? 1.16 : 1);
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    g.moveTo(
      (pts[0][0] + pts[lobes - 1][0]) / 2,
      (pts[0][1] + pts[lobes - 1][1]) / 2,
    );
    for (let i = 0; i < lobes; i++) {
      const a = pts[i],
        b = pts[(i + 1) % lobes];
      g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    }
    g.closePath();
    g.fill();
    const arms = 5 + Math.floor(rand(0, 5));
    for (let i = 0; i < arms; i++) {
      const a = rand(0, Math.PI * 2),
        r = rand(34, 49),
        len = rand(18, 54),
        w = rand(2.2, 8.5);
      g.beginPath();
      g.moveTo(Math.cos(a - 0.1) * r, Math.sin(a - 0.1) * r);
      g.quadraticCurveTo(
        Math.cos(a + 0.1) * (r + len * 0.62),
        Math.sin(a + 0.1) * (r + len * 0.62),
        Math.cos(a) * (r + len),
        Math.sin(a) * (r + len),
      );
      g.quadraticCurveTo(
        Math.cos(a - 0.06) * (r + len * 0.65),
        Math.sin(a - 0.06) * (r + len * 0.65),
        Math.cos(a + 0.11) * (r - w),
        Math.sin(a + 0.11) * (r - w),
      );
      g.fill();
    }
    for (let i = 0; i < 11; i++) {
      const a = rand(0, Math.PI * 2),
        r = rand(52, 108),
        rr = rand(1.1, 5.1);
      g.beginPath();
      g.arc(Math.cos(a) * r, Math.sin(a) * r, rr, 0, Math.PI * 2);
      g.fill();
    }
    // Granulation très fine et zones délavées à l'intérieur de l'encre.
    g.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 75; i++) {
      const x = rand(-45, 45),
        y = rand(-45, 45);
      if (x * x + y * y > 2200) continue;
      g.fillStyle = "rgba(0,0,0," + rand(0.06, 0.29) + ")";
      g.beginPath();
      g.arc(x, y, rand(0.35, 1.5), 0, Math.PI * 2);
      g.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      rotation: rand(-0.4, 0.4),
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    const scale = rand(0.8, 1.35);
    sprite.scale.set(scale, scale, 1);
    paintGroup.add(sprite);
    blackSplatches.push({ sprite, born: performance.now() / 1000 });
  }
  function updateFades(now) {
    for (let i = blackSplatches.length - 1; i >= 0; i--) {
      const b = blackSplatches[i],
        remaining = Math.max(
          0,
          1 - (now - b.born) / Math.max(1, Number($("#life").value)),
        );
      b.sprite.material.opacity = remaining * remaining * (3 - 2 * remaining);
      if (remaining <= 0) {
        b.sprite.parent?.remove(b.sprite);
        b.sprite.material.map?.dispose();
        b.sprite.material.dispose();
        blackSplatches.splice(i, 1);
      }
    }

    if (liveBubbles) floatBubbles(liveBubbles, now);
    for (let i = bubbleFades.length - 1; i >= 0; i--) {
      const b = bubbleFades[i],
        left = Math.max(0, 1 - (now - b.born) / b.life);
      b.item.mesh.material.uniforms.uFade.value = left * left * (3 - 2 * left);
      if (left <= 0) {
        discard(b.item.mesh);
        objects = objects.filter((o) => o !== b.item.mesh);
        bubbleFades.splice(i, 1);
      } else floatBubbles(b.item, now);
    }

    for (let i = pigmentFades.length - 1; i >= 0; i--) {
      const f = pigmentFades[i],
        left = Math.max(0, 1 - (now - f.born) / f.life);
      f.item.material.uniforms.uFade.value = left * left * (3 - 2 * left);
      if (left <= 0) {
        discard(f.item.points);
        objects = objects.filter((o) => o !== f.item.points);
        pigmentFades.splice(i, 1);
      }
    }

    for (let i = colorDrips.length - 1; i >= 0; i--) {
      const d = colorDrips[i],
        fade = Math.max(0, 1 - (now - d.born) / d.life);
      d.marks.forEach(
        (o, j) =>
          (o.material.opacity = d.opacities[j] * fade * fade * (3 - 2 * fade)),
      );
      if (fade <= 0) {
        d.marks.forEach((o) => {
          discard(o);
          objects = objects.filter((x) => x !== o);
        });
        colorDrips.splice(i, 1);
      }
    }

    for (let i = inkMarks.length - 1; i >= 0; i--) {
      const ink = inkMarks[i],
        age = now - ink.born,
        remain = Math.max(0, 1 - age / Math.max(1, Number($("#life").value)));
      ink.object.material.opacity =
        ink.opacity * remain * remain * (3 - 2 * remain);
      if (remain <= 0) {
        discard(ink.object);
        objects = objects.filter((o) => o !== ink.object);
        inkMarks.splice(i, 1);
      }
    }
    for (let i = fading.length - 1; i >= 0; i--) {
      const f = fading[i],
        age = now - f.born,
        life = Number($("#life").value);
      const remaining = Math.max(0, 1 - age / life);
      const opacity = remaining * remaining * (3 - 2 * remaining);
      f.main.material.uniforms.uFade.value = opacity;
      f.wash.material.uniforms.uFade.value = opacity;
      if (age >= life) {
        discard(f.main);
        discard(f.wash);
        objects = objects.filter((o) => o !== f.main && o !== f.wash);
        fading.splice(i, 1);
      }
    }
    paths = paths.filter((p) => now - p.born < Number($("#life").value) + 3);
  }
  // Landscape grammar: each phrase deposits a fold of coloured terrain around a navigable central clearing.
  function positionAt(time, f) {
    if (!dance) dance = makeDance(f);
    const d = dance,
      u = Math.min(1, gestureAge / (d.kind === "cascade" ? 2.8 : 3.2));
    const p = d.origin
      .clone()
      .multiplyScalar((1 - u) ** 3)
      .addScaledVector(d.p1, 3 * (1 - u) * (1 - u) * u)
      .addScaledVector(d.p2, 3 * (1 - u) * u * u)
      .addScaledVector(d.end, u * u * u);
    const amp = (0.3 + f.high * 0.75) * Math.sin(Math.PI * u);
    if (d.kind === "spirale") {
      const a = u * Math.PI * 5 + d.phase;
      p.x += Math.cos(a) * amp * 2.1;
      p.z += Math.sin(a) * amp * 2.1;
      p.y += u * 3;
    } else if (d.kind === "voile") {
      p.y += Math.sin(Math.PI * u) * 4.5;
      p.z += Math.sin(u * Math.PI * 2 + d.phase) * amp;
    } else if (d.kind === "petale") {
      p.x += Math.sin(u * Math.PI) * 3 * Math.cos(d.phase);
      p.y += Math.sin(u * Math.PI * 2) * 2.2;
    } else if (d.kind === "cascade") {
      p.y -= u * u * 5;
      p.x += Math.sin(u * Math.PI * 3) * amp * 1.6;
    } else if (d.kind === "calligraphie") {
      p.y += Math.sin(u * Math.PI * 3 + d.phase) * amp * 2;
      p.z += Math.sin(u * Math.PI * 4) * amp;
    } else {
      p.y += Math.sin(u * Math.PI) * 2.8;
      p.x += Math.sin(u * Math.PI * 1.5) * amp * 1.3;
    }
    return p;
  }
  function buildGeometry(samples, scale = 1) {
    if (samples.length < 3) return null;
    const points = samples.map((s) => s.p);
    const curve = new THREE.CatmullRomCurve3(
      points,
      false,
      "centripetal",
      0.35,
    );
    const segments = Math.min(
      56,
      Math.max(12, Math.floor((samples.length - 1) * 0.75)),
    );
    const positions = [],
      colors = [],
      uv = [],
      indices = [],
      count = 9;
    let lastSide = new THREE.Vector3(1, 0, 0),
      lastTangent = null;
    for (let i = 0; i <= segments; i++) {
      const v = i / segments,
        ix = v * (samples.length - 1),
        k = Math.min(samples.length - 2, Math.floor(ix)),
        mix = ix - k;
      const s = samples[k],
        n = samples[k + 1],
        p = curve.getPoint(v);
      const tan = curve.getTangent(v).normalize();
      // Repère transporté : pas de retournement soudain du ruban dans les virages verticaux.
      let side;
      if (lastTangent) {
        const rotation = new THREE.Quaternion().setFromUnitVectors(
          lastTangent,
          tan,
        );
        side = lastSide.clone().applyQuaternion(rotation);
        side.addScaledVector(tan, -side.dot(tan)).normalize();
      } else {
        side = new THREE.Vector3().crossVectors(
          tan,
          new THREE.Vector3(0, 1, 0),
        );
        if (side.lengthSq() < 0.0001) side.set(1, 0, 0);
        side.normalize();
      }
      lastSide.copy(side);
      lastTangent = tan.clone();
      const normal = new THREE.Vector3().crossVectors(side, tan).normalize();
      const widthBase = THREE.MathUtils.lerp(s.width, n.width, mix) * scale;
      // Une largeur chorégraphique non périodique : des souffles, des voiles et des pointes.
      const shape = THREE.MathUtils.lerp(s.shape ?? 1, n.shape ?? 1, mix);
      const envelope = Math.pow(Math.sin(Math.PI * v), 0.36);
      const style = dance?.texture ?? 0;
      const twist = THREE.MathUtils.lerp(s.twist, n.twist, mix);
      const brushWidth =
        brushStyle === "vegetal"
          ? 0.72 + 0.65 * Math.pow(Math.sin(Math.PI * v), 2)
          : brushStyle === "calligraphie"
            ? 0.42 + 0.33 * Math.sin(v * 11 + twist * 0.18) ** 2
            : 1;
      const width =
        widthBase *
        brushWidth *
        (0.15 + 1.75 * shape) *
        envelope *
        (style === 0
          ? 1
          : style === 1
            ? 0.68
            : style === 2
              ? 1.4
              : style === 3
                ? 0.9
                : style === 4
                  ? 1.18
                  : 0.76);
      const fold = THREE.MathUtils.lerp(s.fold, n.fold, mix);
      const col = s.color.clone().lerp(n.color, mix);
      const cap = 1;
      for (let j = 0; j < count; j++) {
        const u = j / (count - 1),
          w = u * 2 - 1;
        const irregular = THREE.MathUtils.lerp(
          s.irregular ?? 0,
          n.irregular ?? 0,
          mix,
        );
        const fringe =
          1 +
          irregular *
            (0.13 * Math.sin(v * 17 + u * 9) +
              0.07 * Math.sin(v * 57 + u * 31)) +
          0.025 * Math.sin(v * 113 + u * 47);
        const flutes = dance?.flute ?? 6;
        const rib =
          Math.pow(
            Math.max(
              0,
              Math.sin(
                u * Math.PI * flutes + v * (8 + style * 2) + twist * 0.3,
              ),
            ),
            style === 2 ? 3 : 8,
          ) *
          width *
          (style === 2 ? 0.15 : 0.055);
        const ripple =
          Math.sin(
            u * Math.PI * (2 + 3 * shape + style * 0.35) +
              v * (8 + 13 * shape + style * 3) +
              twist * 0.25,
          ) *
          width *
          (0.045 + 0.11 * shape) *
          (style === 3 ? 1.8 : 1);
        const lace =
          Math.sin(v * (13 + style * 3) + u * 23) *
          Math.sin(v * 29 - u * (15 + style)) *
          width *
          (style === 4 ? 0.15 : 0.065);
        const curling =
          Math.pow(Math.abs(w), 2.5) *
          width *
          (dance?.curl ?? 0.5) *
          Math.sin(v * 5 + twist * 0.12) *
          (style === 1 ? 0.65 : 0.22);
        const pos = p
          .clone()
          .addScaledVector(side, w * width * fringe * cap)
          .addScaledVector(
            normal,
            (Math.sin(u * Math.PI * 2 + twist) * width * 0.34 +
              Math.sin(u * Math.PI) * fold +
              rib +
              ripple +
              lace +
              curling) *
              cap,
          );
        positions.push(pos.x, pos.y, pos.z);
        const shade =
          0.76 +
          0.22 * Math.sin(u * Math.PI) +
          0.07 * Math.sin(v * 23 + u * 9) +
          0.04 * Math.sin(v * 61 - u * 17);
        colors.push(
          Math.min(1, col.r * shade),
          Math.min(1, col.g * shade),
          Math.min(1, col.b * shade),
        );
        uv.push(u, v * 6.2);
        if (i && j < count - 1) {
          const q = (i - 1) * count + j,
            r = i * count + j;
          indices.push(q, q + 1, r + 1, q, r + 1, r);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }
  // Pinceau Pigments : une véritable matière pointilliste 3D, sans ruban ni pics.
  // Une seule géométrie dynamique et un seul draw call par geste, pour préserver le mobile.
  const PIGMENT_CAP = 900;

  function createPigments() {
    const g = new THREE.BufferGeometry(),
      pos = new Float32Array(PIGMENT_CAP * 3),
      col = new Float32Array(PIGMENT_CAP * 3),
      size = new Float32Array(PIGMENT_CAP),
      alpha = new Float32Array(PIGMENT_CAP);
    for (const [key, arr, n] of [
      ["position", pos, 3],
      ["color", col, 3],
      ["aSize", size, 1],
      ["aAlpha", alpha, 1],
    ]) {
      const a = new THREE.BufferAttribute(arr, n);
      a.setUsage(THREE.DynamicDrawUsage);
      g.setAttribute(key, a);
    }
    g.setDrawRange(0, 0);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 200);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uFade: { value: 1 },
        uScale: { value: Math.min(devicePixelRatio, 1.5) },
      },
      vertexShader: pigmentVertex,
      fragmentShader: pigmentFragment,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const points = new THREE.Points(g, material);
    points.frustumCulled = false;
    paintGroup.add(points);
    return { points, material, pos, col, size, alpha, n: 0 };
  }
  function depositPigments(s, f, novelty) {
    if (!livePigments) livePigments = createPigments();
    const b = livePigments;
    // Petites gouttelettes à la surface du geste, et de rares projections satellites.
    const count = 4 + Math.floor(Math.min(5, novelty * 5 + f.high * 2));
    const tangent = gestureVelocity.clone().normalize();
    if (tangent.lengthSq() < 0.001) tangent.set(1, 0, 0);
    const side = new THREE.Vector3(-tangent.z, 0.15, tangent.x).normalize();
    const up = new THREE.Vector3().crossVectors(tangent, side).normalize();
    for (let j = 0; j < count && b.n < PIGMENT_CAP; j++) {
      const i = b.n++,
        k = i * 3,
        a = Math.random() * Math.PI * 2;
      const spread =
        (0.18 + f.energy * 0.55) *
        (j === 0 ? 0.12 : Math.pow(Math.random(), 1.6));
      const radial = side
        .clone()
        .multiplyScalar(Math.cos(a) * spread)
        .addScaledVector(up, Math.sin(a) * spread);
      const trail = tangent
        .clone()
        .multiplyScalar((Math.random() - 0.5) * (0.2 + f.energy * 0.5));
      const p = s.p.clone().add(radial).add(trail);
      b.pos[k] = p.x;
      b.pos[k + 1] = p.y;
      b.pos[k + 2] = p.z;
      const hue = s.color
        .clone()
        .offsetHSL(
          (Math.random() - 0.5) * 0.085,
          (Math.random() - 0.5) * 0.12,
          (Math.random() - 0.5) * 0.18,
        );
      b.col[k] = hue.r;
      b.col[k + 1] = hue.g;
      b.col[k + 2] = hue.b;
      b.size[i] =
        (0.23 + Math.random() * 0.55) * (j === 0 ? 1.7 : 1) * (1 + f.low * 0.5);
      b.alpha[i] = 0.27 + Math.random() * 0.48;
    }
    b.points.geometry.setDrawRange(0, b.n);
    for (const key of ["position", "color", "aSize", "aAlpha"])
      b.points.geometry.attributes[key].needsUpdate = true;
  }
  // Maillage persistant : allocation unique par geste, puis mise à jour des seuls nouveaux anneaux.
  // Évite les créations/destructions de Mesh, ShaderMaterial et BufferGeometry à chaque frame.
  const RIBBON_CAP = 144,
    RIBBON_SIDES = 11;
  let liveRows = 0,
    livePositions = null,
    liveColors = null,
    liveUvs = null,
    liveNormals = null;
  const tmpTangent = new THREE.Vector3(),
    tmpSide = new THREE.Vector3(),
    tmpNormal = new THREE.Vector3(),
    tmpPoint = new THREE.Vector3();
  function createLiveRibbon() {
    const vertices = RIBBON_CAP * RIBBON_SIDES;
    const g = new THREE.BufferGeometry();
    livePositions = new Float32Array(vertices * 3);
    liveColors = new Float32Array(vertices * 3);
    liveUvs = new Float32Array(vertices * 2);
    liveNormals = new Float32Array(vertices * 3);
    const idx = [];
    for (let i = 1; i < RIBBON_CAP; i++)
      for (let j = 0; j < RIBBON_SIDES - 1; j++) {
        const q = (i - 1) * RIBBON_SIDES + j,
          r = i * RIBBON_SIDES + j;
        if (brushStyle === "calligraphie" && (j === 3 || j === 6)) continue;
        idx.push(q, q + 1, r + 1, q, r + 1, r);
      }
    const attrs = [
      ["position", livePositions, 3],
      ["color", liveColors, 3],
      ["uv", liveUvs, 2],
      ["normal", liveNormals, 3],
    ];
    for (const [name, array, size] of attrs) {
      const attr = new THREE.BufferAttribute(array, size);
      attr.setUsage(THREE.DynamicDrawUsage);
      g.setAttribute(name, attr);
    }
    g.setIndex(idx);
    g.setDrawRange(0, 0);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 150);
    const style = dance?.texture ?? 0;
    // Chaque pinceau possède sa propre matière, pas seulement une couleur différente.
    const materialStyle =
      brushStyle === "vegetal"
        ? 9 + style
        : brushStyle === "calligraphie"
          ? 12 + style
          : style;
    mesh = new THREE.Mesh(g, pigmentMaterial(1, 0, materialStyle));
    washed = new THREE.Mesh(g, pigmentMaterial(0.28, 1, materialStyle));
    washed.scale.setScalar(1.012);
    washed.renderOrder = 1;
    mesh.renderOrder = 2;
    paintGroup.add(washed, mesh);
    liveRows = 0;
  }
  function rebuild() {
    const n = Math.min(activeStroke.length, RIBBON_CAP);
    if (n < 2) return;
    if (!mesh) createLiveRibbon();
    const start = Math.max(0, liveRows - 1),
      count = RIBBON_SIDES;
    for (let i = start; i < n; i++) {
      const s = activeStroke[i],
        prevS = activeStroke[Math.max(0, i - 1)],
        nextS = activeStroke[Math.min(n - 1, i + 1)];
      tmpTangent.copy(nextS.p).sub(prevS.p);
      if (tmpTangent.lengthSq() < 1e-8) tmpTangent.set(1, 0, 0);
      tmpTangent.normalize();
      tmpSide.set(0, 1, 0).cross(tmpTangent);
      if (tmpSide.lengthSq() < 0.0001) tmpSide.set(1, 0, 0);
      tmpSide.normalize();
      tmpNormal.crossVectors(tmpTangent, tmpSide).normalize();
      const v = i / Math.max(1, n - 1),
        texture = dance?.texture ?? 0;
      const profile =
        brushStyle === "vegetal" ? 1 : brushStyle === "calligraphie" ? 2 : 0;
      const envelope = Math.min(1, (i + 1) / 9);
      // Trois langages de formes réellement distincts :
      // Soie = membrane ondulante ; Botanique = feuilles nervurées ; Gravure = filaments étroits.
      const leafLobe = Math.pow(Math.max(0, Math.sin(Math.PI * v)), 0.65);
      const leafVeins = 1 + 0.18 * Math.sin(i * 0.31 + texture * 1.7);
      const inkPressure =
        0.2 + 0.55 * Math.pow(Math.abs(Math.sin(i * 0.17 + s.twist * 0.07)), 4);
      const width =
        profile === 1
          ? s.width *
            (0.18 + 0.22 * leafLobe) *
            (0.8 + 0.2 * leafVeins) *
            envelope
          : profile === 2
            ? s.width * 0.54 * inkPressure * envelope
            : s.width *
              (0.68 + 0.38 * Math.sin(i * 0.12 + texture)) *
              (0.7 + 0.3 * s.shape) *
              envelope;
      const rot =
        profile === 1
          ? s.twist * 0.28
          : profile === 2
            ? s.twist * 0.045
            : s.twist * 0.14;
      const axisA = tmpSide
        .clone()
        .multiplyScalar(Math.cos(rot))
        .addScaledVector(tmpNormal, Math.sin(rot))
        .normalize();
      const axisB = new THREE.Vector3()
        .crossVectors(tmpTangent, axisA)
        .normalize();
      for (let j = 0; j < count; j++) {
        const u = j / (count - 1),
          w = 2 * u - 1,
          k = (i * count + j) * 3,
          uvk = (i * count + j) * 2;
        const edge =
          1 + (s.irregular ?? 0) * 0.08 * Math.sin(i * 0.49 + j * 1.73);
        let displacement, lateral;
        if (profile === 1) {
          // Ancien profil tubulaire (inactif pour le pinceau Pigments).
          // Des excroissances radiales émergent par intermittence du tronc.
          const angle = u * Math.PI * 2;
          const spinePulse = Math.pow(
            Math.max(0, Math.sin(i * 0.87 + texture * 2.3)),
            16,
          );
          const spike =
            spinePulse *
            (j % 3 === 0 ? 1 : 0) *
            (0.7 + 0.45 * Math.sin(i * 0.39 + j));
          const radius = width * (1 + spike * 2.4);
          lateral = Math.cos(angle) * radius;
          displacement = Math.sin(angle) * radius;
          // Décalage axial des côtes : impression de croissance minérale.
          displacement += width * 0.12 * Math.sin(i * 0.33 + angle * 3);
        } else if (profile === 2) {
          // Trait à la plume : pression et direction variables, tranchant effilé.
          // A calligraphic comb: 3 slender threads with empty channels between them.
          const lane = Math.floor(u * 3.0),
            local = (u * 3.0 - lane) * 2 - 1;
          const gap = 0.2;
          lateral =
            ((lane - 1) * 0.85 + local * 0.2) *
            width *
            (0.7 + 0.3 * Math.abs(Math.sin(i * 0.24)));
          displacement =
            width *
              (0.25 * Math.sin(i * 0.14 + lane * 2.1) +
                0.12 * Math.sin(i * 0.41 + lane * 1.4)) +
            s.fold * 0.08 * (1 - local * local);
        } else {
          // Soie froissée : grands plis hélicoïdaux et fines crêtes.
          lateral = w * width * edge;
          displacement =
            Math.sin(u * Math.PI * 2 + s.twist) * width * 0.34 +
            Math.sin(u * Math.PI) * s.fold +
            Math.sin(u * Math.PI * (4 + texture) + i * 0.14) * width * 0.1 +
            Math.sin(u * 37 + i * 0.19) * width * 0.025;
        }
        tmpPoint
          .copy(s.p)
          .addScaledVector(axisA, lateral)
          .addScaledVector(axisB, displacement);
        livePositions[k] = tmpPoint.x;
        livePositions[k + 1] = tmpPoint.y;
        livePositions[k + 2] = tmpPoint.z;
        const shade =
          profile === 1
            ? 0.57 +
              0.22 * Math.cos(u * Math.PI * 2 + i * 0.08) +
              0.15 * Math.sin(i * 0.47 + j * 1.9)
            : profile === 2
              ? 0.45 + 0.18 * Math.sin(u * Math.PI) + 0.12 * Math.sin(i * 0.16)
              : 0.75 +
                0.2 * Math.sin(u * Math.PI) +
                0.07 * Math.sin(i * 0.24 + j * 0.75);
        liveColors[k] = s.color.r * shade;
        liveColors[k + 1] = s.color.g * shade;
        liveColors[k + 2] = s.color.b * shade;
        liveNormals[k] = axisB.x;
        liveNormals[k + 1] = axisB.y;
        liveNormals[k + 2] = axisB.z;
        liveUvs[uvk] = u;
        liveUvs[uvk + 1] = i * 0.075;
      }
    }
    liveRows = n;
    const g = mesh.geometry;
    g.setDrawRange(
      0,
      (n - 1) * (count - 1 - (brushStyle === "calligraphie" ? 2 : 0)) * 6,
    );
    for (const key of ["position", "color", "uv", "normal"])
      g.attributes[key].needsUpdate = true;
  }
  function fleck(p, color, size) {
    const n = 2 + Math.floor(Math.random() * 3);
    const positions = [],
      colors = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2,
        r = Math.random() * size;
      positions.push(
        p.x + Math.cos(a) * r,
        p.y + (Math.random() - 0.5) * size,
        p.z + Math.sin(a) * r,
      );
      colors.push(color.r, color.g, color.b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const o = new THREE.Points(
      g,
      new THREE.PointsMaterial({
        size: size * 0.25,
        vertexColors: true,
        transparent: true,
        opacity: 0.27,
        depthWrite: false,
      }),
    );
    paintGroup.add(o);
    objects.push(o);
  }
  let gateHold = 0;
  function paint(dt) {
    if (brushStyle === "splatch") {
      tip.visible = false;
      return;
    }
    paintUniforms.uTime.value += dt;
    if (
      !analyser ||
      !(listening || (audioMode === "file" && (!audio.paused || scratchActive)))
    ) {
      gateHold = 0;
      monotoneAge = 0;
      if (activeStroke.length) endStroke();
      tip.visible = false;
      gateOpen = false;
      audioEnergy *= Math.exp(-dt * 2);
      audioMotion *= Math.exp(-dt * 2);
      return;
    }
    const f = readAudioFeatures({ analyser, bins, wave, prev, ctx });
    audioEnergy +=
      (Math.min(1, f.rms * 8) - audioEnergy) * (1 - Math.exp(-dt * 2.1));
    // Seuil absolu + bruit de fond adaptatif + nouveauté spectrale.
    // Une note constante, même forte, ne doit pas continuer à déposer de pigment.
    const change = prevCentroid
      ? Math.min(1, Math.abs(f.freq - prevCentroid) / 950)
      : 0;
    prevCentroid += (f.freq - prevCentroid) * Math.min(1, dt * 4);
    const novelty = Math.min(1, f.flux * 2.5 + change * 0.95);
    audioMotion += (novelty - audioMotion) * (1 - Math.exp(-dt * 2.8));
    const pitchChange = (f.freq - lastPitch) / Math.max(dt, 0.008);
    lastPitch = f.freq;
    pitchVelocity = THREE.MathUtils.lerp(
      pitchVelocity,
      pitchChange,
      Math.min(1, dt * 5),
    );
    // Porte stricte : le chant doit être audible ET réellement modulé.
    // Hystérésis courte, sans prolongation des notes monotones.
    const loud =
      f.rms > (audioMode === "file" ? 0.016 : Math.max(0.042, baseline * 2.9));
    const candidate =
      loud && novelty > 0.23 && (f.flux > 0.03 || change > 0.12);
    activity = THREE.MathUtils.lerp(
      activity,
      candidate ? 1 : 0,
      Math.min(1, dt * (candidate ? 15 : 12)),
    );
    if (candidate) eventAge += dt;
    else eventAge = Math.max(0, eventAge - dt * 3);
    // Maintien bref de la porte : les micro-pauses spectrales ne découpent plus le geste.
    if (candidate && eventAge > 0.035) gateHold = 0.18;
    else gateHold = Math.max(0, gateHold - dt);
    const isActive = loud && gateHold > 0;
    if (!isActive) {
      // Un son soutenu mais peu changeant déclenche, rarement, des gouttes plutôt qu'un ruban.
      const monotone = loud && novelty < 0.18 && f.flux < 0.09;
      monotoneAge = monotone
        ? monotoneAge + dt
        : Math.max(0, monotoneAge - dt * 2);
      if (
        monotoneAge > nextDripAt &&
        (activeStroke.length > 5 || paths.length)
      ) {
        addColorDrip();
        monotoneAge = 0;
        nextDripAt = 2.7 + Math.random() * 4.5;
      }
      quiet += dt;
      tip.visible = false;
      if (quiet > 0.24 && activeStroke.length) endStroke();
      baseline += (f.rms - baseline) * Math.min(1, dt * 0.12);
      gateOpen = false;
      return;
    }
    quiet = 0;
    monotoneAge = 0;
    gateOpen = true;
    if (!activeStroke.length) {
      // Un nouveau motif naît de l'événement acoustique, pas d'un tirage permanent.
      dance = makeDance(f);
      gestureKind =
        f.flux > 0.26 && f.high > 0.14
          ? "trill"
          : Math.abs(pitchVelocity) > 420
            ? "arch"
            : f.low > 0.24
              ? "branch"
              : "weave";
      gestureAge = 0;
      gestureStart = t;
    }
    gestureAge += dt * (0.46 + f.energy * 0.66 + novelty * 0.38);
    t += dt * (0.8 + f.energy * 1.4 + novelty * 0.9);
    if (gestureAge > 3.05 && activeStroke.length) endStroke();

    smoothFreq +=
      (Math.min(1, f.freq / 7500) - smoothFreq) * Math.min(1, dt * 3);
    const target = positionAt(t, f);
    // Attraction douce vers le doigt, amplifiée par la modulation acoustique.
    if (touch.force > 0.005) {
      const influence = touch.force * (0.25 + 0.75 * novelty);
      target.lerp(touch.world, Math.min(0.82, influence * 0.67));
    }

    // Démarrage sans téléportation : le premier point est l'origine du nouveau geste.
    if (activeStroke.length === 0) tipPosition.copy(dance.origin);
    tipPosition.lerp(target, 1 - Math.exp(-dt * 3.8));
    gestureVelocity.lerp(
      target
        .clone()
        .sub(tipPosition)
        .multiplyScalar(1 / Math.max(dt, 0.016)),
      1 - Math.exp(-dt * 2),
    );
    const p = tipPosition.clone();
    p.y += Math.sin(t * 2.4) * f.high * 0.045;
    const h =
      brushStyle === "vegetal"
        ? (0.015 + smoothFreq * 0.13 + ((dance.seed * 0.013) % 0.11)) % 1
        : brushStyle === "calligraphie"
          ? (0.055 + smoothFreq * 0.055 + ((dance.seed * 0.007) % 0.018)) % 1
          : (0.06 +
              smoothFreq * 0.52 +
              ((dance.seed * 0.037) % 0.28) +
              novelty * 0.055) %
            1;
    const c = new THREE.Color().setHSL(
      h,
      brushStyle === "calligraphie"
        ? 0.08 + 0.09 * f.high
        : brushStyle === "vegetal"
          ? 0.48 + 0.2 * f.high
          : 0.55 + 0.23 * f.high,
      brushStyle === "calligraphie"
        ? 0.11 + 0.07 * f.energy
        : brushStyle === "vegetal"
          ? 0.37 + 0.17 * f.energy
          : 0.32 + 0.12 * f.energy,
    );
    const relief = 9 / 7,
      pigment = 6 / 8;
    const width =
      (0.2 + f.low * 0.36 + f.energy * 0.34 + novelty * 0.2) * relief * 2.5;
    const progress = Math.min(1, gestureAge / 3.2);
    const pulse =
      0.45 +
      0.55 *
        Math.pow(
          Math.sin(
            progress * Math.PI * (dance.kind === "spirale" ? 3 : 1.4) +
              dance.phase * 0.3,
          ),
          2,
        );
    const kindWidth =
      {
        voile: 1.7,
        spirale: 0.48,
        elan: 0.8,
        calligraphie: 0.4,
        petale: 1.4,
        cascade: 0.65,
      }[dance.kind] *
      (brushStyle === "vegetal"
        ? 1.1
        : brushStyle === "calligraphie"
          ? 0.65
          : 1);
    const targetWidth =
      width *
      kindWidth *
      (0.42 + novelty * 0.42 + f.energy * 0.22) *
      (1 + touch.force * (0.3 + f.energy * 0.8));
    smoothedWidth += (targetWidth - smoothedWidth) * (1 - Math.exp(-dt * 2.15));
    const targetFold =
      (0.09 +
        novelty * 0.44 +
        touch.force * 0.28 +
        (gestureKind === "arch" ? 0.22 : 0) +
        f.high * 0.13) *
      relief;
    smoothedFold += (targetFold - smoothedFold) * (1 - Math.exp(-dt * 2.0));
    smoothedTwist +=
      dt * (0.65 + f.high * 3.4 + novelty * 1.5 + touch.force * 2.2);
    const s = {
      p,
      width: smoothedWidth,
      fold: smoothedFold,
      twist: smoothedTwist,
      color: c,
      shape: pulse,
      irregular: 0.5 + 0.4 * novelty,
    };
    tip.position.copy(p);
    tip.material.color.copy(c);
    tip.visible = true;
    if (
      !activeStroke.length ||
      p.distanceTo(activeStroke[activeStroke.length - 1].p) > 0.045
    ) {
      activeStroke.push(s);
      if (brushStyle === "vegetal") depositPigments(s, f, novelty);
      if (brushStyle === "bulles") depositBubbles(s, f, novelty);
    }
    if (
      activeStroke.length >= RIBBON_CAP - 1 ||
      (brushStyle === "vegetal" && livePigments?.n >= PIGMENT_CAP - 10) ||
      (brushStyle === "bulles" && liveBubbles?.n >= BUBBLE_CAP - 2)
    )
      endStroke();
    // Actualisation ~30 i/s au lieu de 2–4 i/s : dessin visuellement continu.
    if (
      activeStroke.length > 1 &&
      brushStyle !== "vegetal" &&
      brushStyle !== "bulles"
    ) {
      rebuild();
    }
  }
  root.querySelectorAll(".style-btn").forEach((btn) =>
    listen(btn, "click", () => {
      if (brushStyle === btn.dataset.style) return;
      if (activeStroke.length || liveBubbles || livePigments) endStroke();
      brushStyle = btn.dataset.style;
      brushVariation++;
      dance = null;
      smoothedWidth = 0.22;
      smoothedFold = 0.1;
      root
        .querySelectorAll(".style-btn")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    }),
  );
  $("#reset").onclick = clear;
  for (const id of ["life"])
    $("#" + id).oninput = (e) => {
      $("#" + id + "Value").textContent = e.target.value;
      if (id === "pigment")
        paintUniforms.uPigment.value = 0.3 + Number(e.target.value) * 0.065;
    };
  // Camera chorégraphique : le regard reste attaché au pinceau, jamais à une boucle arbitraire.
  // Le silence invite au recul et révèle l'ensemble des rubans encore visibles.
  // Drone stabilisé : une cible, un pivot de suivi et une distance indépendants.
  // Les transitions de phase ne réinitialisent jamais le repère de la caméra.
  const cameraUp = new THREE.Vector3(0, 1, 0),
    cameraQuat = new THREE.Quaternion(),
    cameraMatrix = new THREE.Matrix4();
  const cameraAim = new THREE.Vector3(0, 0, 0),
    cameraPivot = new THREE.Vector3(0, 0, 0);
  const desiredPos = new THREE.Vector3(),
    overviewCenter = new THREE.Vector3(),
    lastValidTip = new THREE.Vector3();
  const camOffset = new THREE.Vector3(),
    camTemp = new THREE.Vector3();
  let droneEnabled = true,
    dragStart = null,
    cameraYaw = 0,
    cameraPitch = 0,
    trackingBlend = 0,
    hadTip = false;
  let turn360Active = false,
    turn360Progress = 0,
    turn360Start = 0,
    turn360Target = 0,
    turn360Lift = 0;
  let cachedBounds = { center: new THREE.Vector3(), radius: 5 },
    lastBoundsAt = 0;
  function visibleBounds() {
    const now = performance.now();
    if (now - lastBoundsAt < 300) return cachedBounds;
    lastBoundsAt = now;
    const box = new THREE.Box3();
    let found = false;
    for (const item of fading) {
      if (!item.main?.geometry || !item.main.parent) continue;
      item.main.geometry.computeBoundingBox();
      const b = item.main.geometry.boundingBox;
      if (b && !b.isEmpty()) {
        box.union(b);
        found = true;
      }
    }
    if (mesh?.geometry) {
      mesh.geometry.computeBoundingBox();
      box.union(mesh.geometry.boundingBox);
      found = true;
    }
    if (!found) {
      cachedBounds = {
        center: hadTip ? lastValidTip.clone() : new THREE.Vector3(),
        radius: 5,
      };
      return cachedBounds;
    }
    cachedBounds = {
      center: box.getCenter(new THREE.Vector3()),
      radius: Math.min(
        42,
        Math.max(4, box.getSize(new THREE.Vector3()).length() * 0.52),
      ),
    };
    return cachedBounds;
  }
  function fly(dt) {
    // Toujours suivre le traceur quand il est réellement visible ; pas le gateOpen (instable).
    const tracing = tip.visible && activeStroke.length > 1;
    if (tracing) {
      lastValidTip.copy(tip.position);
      hadTip = true;
    }
    const bounds = visibleBounds();
    const k = (rate) => 1 - Math.exp(-rate * dt);
    const targetBlend = tracing ? 1 : 0;
    trackingBlend += (targetBlend - trackingBlend) * k(tracing ? 1.7 : 0.48);
    if (turn360Active) {
      turn360Progress = Math.min(1, turn360Progress + dt / (7.8 - 5 * 0.23));
      const u = turn360Progress;
      const eased = u * u * (3 - 2 * u);
      cameraOrbitPhase = turn360Start + (Math.PI * 2 + 0.48) * eased;
      turn360Lift = Math.sin(Math.PI * u) * 0.24;
      if (u >= 1) {
        turn360Active = false;
        turn360Lift = 0;
        $("#turn360").textContent = "⟳ 360°";
        $("#turn360").disabled = false;
      }
    } else cameraOrbitPhase += dt * (0.065 + 5 * 0.007);
    const motion = THREE.MathUtils.clamp(
      audioMotion * 0.7 + audioEnergy * 0.4,
      0,
      1,
    );
    calmDuration = tracing ? 0 : Math.min(20, calmDuration + dt);
    const calm = THREE.MathUtils.smoothstep(calmDuration, 0.7, 4);
    // Le pivot suit une pointe amortie ; la vue globale est calculée sur les tracés visibles.
    if (!hadTip) lastValidTip.copy(bounds.center);
    cameraPivot.lerp(lastValidTip, k(0.95));
    overviewCenter.lerp(bounds.center, k(0.45));
    camTemp.copy(overviewCenter).lerp(cameraPivot, trackingBlend);
    cameraAim.lerp(camTemp, k(1.15));
    const nearDist = 7.5 + 3.5 * (1 - motion);
    const farDist = Math.max(15, bounds.radius * 2.15) + 3 * calm;
    const wantedDistance =
      THREE.MathUtils.lerp(farDist, nearDist, trackingBlend) +
      (turn360Active
        ? Math.sin(Math.PI * turn360Progress) *
          Math.max(3, bounds.radius * 0.35)
        : 0);
    cameraDistance += (wantedDistance - cameraDistance) * k(0.65);
    // L'orbite est définie autour du point suivi, sans déplacement supplémentaire lié à la vitesse.
    const a = cameraOrbitPhase + cameraYaw;
    const elevation =
      0.24 +
      0.18 * (1 - trackingBlend) +
      0.07 * Math.sin(a * 0.6) +
      cameraPitch +
      turn360Lift;
    camOffset.set(
      Math.cos(a) * Math.cos(elevation),
      Math.sin(elevation),
      Math.sin(a) * Math.cos(elevation),
    );
    desiredPos.copy(cameraAim).addScaledVector(camOffset, cameraDistance);
    camera.position.lerp(desiredPos, k(1.1));
    // Viser exactement le même point que celui qui définit la position : pas de dérive du cadrage.
    cameraMatrix.lookAt(camera.position, cameraAim, cameraUp);
    cameraQuat.setFromRotationMatrix(cameraMatrix);
    camera.quaternion.slerp(cameraQuat, k(2.1));
    const targetFov = THREE.MathUtils.lerp(76, 86, trackingBlend) + motion * 3;
    cameraFov += (targetFov - cameraFov) * k(0.65);
    if (Math.abs(camera.fov - cameraFov) > 0.03) {
      camera.fov = cameraFov;
      camera.updateProjectionMatrix();
    }
    cameraMode =
      trackingBlend > 0.7
        ? "Suivi du pinceau"
        : trackingBlend < 0.25
          ? "Vue d’ensemble"
          : "Transition douce";
    // Pas de mise à jour textuelle à chaque image : interface discrète et stable.
  }
  function enter() {
    inside = true;
    droneEnabled = true;
    orbit.enabled = false;
    $("#inside").textContent = "↗ Vue libre";
  }
  function exit() {
    inside = false;
    droneEnabled = false;
    orbit.enabled = true;
    orbit.target.copy(cameraAim);
    orbit.update();
    $("#inside").textContent = "◉ Drone auto";
    hint.textContent = "Vue libre · glisser pour tourner";
  }
  $("#inside").onclick = () => (inside ? exit() : enter());
  $("#turn360").onclick = () => {
    if (!inside) enter();
    turn360Active = true;
    turn360Progress = 0;
    turn360Start = cameraOrbitPhase;
    $("#turn360").textContent = "◌ Tour…";
    $("#turn360").disabled = true;
  };
  listen(renderer.domElement, "pointerdown", (e) => {
    if (brushStyle === "splatch") {
      touchAt(e);
      stampBlackSplatch(touch.target);
      return;
    }
    touch.down = true;
    touch.id = e.pointerId;
    touch.force = Math.max(touch.force, 0.35);
    touch.hold = 0;
    touch.last.set(e.clientX, e.clientY);
    touchAt(e);
    touch.world.copy(touch.target);
    renderer.domElement.setPointerCapture(e.pointerId);
  });
  listen(renderer.domElement, "pointermove", (e) => {
    if (!touch.down || e.pointerId !== touch.id) return;
    const dx = e.clientX - touch.last.x,
      dy = e.clientY - touch.last.y;
    touch.dx = THREE.MathUtils.lerp(touch.dx, dx, 0.3);
    touch.dy = THREE.MathUtils.lerp(touch.dy, dy, 0.3);
    touch.force = Math.min(1.35, touch.force + Math.hypot(dx, dy) * 0.009);
    touch.last.set(e.clientX, e.clientY);
    touchAt(e);
  });
  function releaseTouch(e) {
    if (e.pointerId !== touch.id) return;
    touch.down = false;
    touch.id = null;
  }
  listen(renderer.domElement, "pointerup", releaseTouch);
  listen(renderer.domElement, "pointercancel", releaseTouch);
  // Export HD : même caméra, même scène, sans interface ni altérer le vol.
  let capturing = false;
  $("#capture").onclick = async () => {
    if (capturing) return;
    capturing = true;
    const button = $("#capture"),
      oldText = button.textContent;
    button.disabled = true;
    button.textContent = "◌ Capture…";
    const oldSize = new THREE.Vector2();
    renderer.getSize(oldSize);
    const oldRatio = renderer.getPixelRatio();
    const oldAspect = camera.aspect;
    try {
      const w = innerWidth,
        h = innerHeight;
      const factor = Math.min(3, 4096 / Math.max(w, h));
      const width = Math.round(w * Math.max(1, factor)),
        height = Math.round(h * Math.max(1, factor));
      renderer.setPixelRatio(1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      touchHalo.visible = false;
      tip.visible = false;
      renderer.render(scene, camera);
      const blob = await new Promise((resolve) =>
        renderer.domElement.toBlob(resolve, "image/png"),
      );
      if (!blob) throw Error("Capture indisponible");
      const name =
        "NID-SONORE-" + new Date().toISOString().replace(/[:.]/g, "-") + ".png";
      const file = new File([blob], name, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        try {
          await navigator.share({ files: [file], title: "NID SONORE•°" });
        } catch (err) {
          if (err.name !== "AbortError") downloadBlob(blob, name);
        }
      } else downloadBlob(blob, name);
    } catch (e) {
      status.textContent = "Capture PNG : " + e.message;
    } finally {
      renderer.setPixelRatio(oldRatio);
      renderer.setSize(oldSize.x, oldSize.y, false);
      camera.aspect = oldAspect;
      camera.updateProjectionMatrix();
      capturing = false;
      button.disabled = false;
      button.textContent = oldText;
    }
  };
  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  enter();
  let last = performance.now(),
    fpsTime = 0,
    fpsFrames = 0,
    quality = 1;
  function frame(now) {
    if (disposed) return;
    animationId = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (capturing) return;
    fpsTime += dt;
    fpsFrames++;
    if (fpsTime > 3) {
      const fps = fpsFrames / fpsTime;
      fpsFrames = 0;
      fpsTime = 0;
      const target = fps < 26 ? 0.7 : fps < 39 ? 0.82 : fps > 53 ? 1 : quality;
      if (Math.abs(target - quality) > 0.05) {
        quality = target;
        renderer.setPixelRatio(Math.min(devicePixelRatio, 0.95) * quality);
      }
    } // Les traces tactiles s'estompent sans provoquer de saut de géométrie.
    if (touch.down) {
      touch.hold += dt;
      touch.force +=
        (Math.min(1, 0.43 + touch.hold * 0.12) - touch.force) *
        (1 - Math.exp(-dt * 4));
    } else touch.force *= Math.exp(-dt * 2.4);
    touch.world.lerp(touch.target, 1 - Math.exp(-dt * 6));
    touchHalo.visible = touch.force > 0.025;
    if (touchHalo.visible) {
      touchHalo.position.copy(touch.world);
      touchHalo.quaternion.copy(camera.quaternion);
      const r = 0.65 + touch.force * 0.9;
      touchHalo.scale.setScalar(r);
      touchHalo.material.opacity = 0.3 * Math.min(1, touch.force);
    }
    paint(dt);
    updateFades(now / 1000);
    if (inside) fly(dt);
    else orbit.update();
    renderer.render(scene, camera);
  }
  animationId = requestAnimationFrame(frame);
  listen(window, "resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  return () => {
    disposed = true;
    cancelAnimationFrame(animationId);
    listeners.forEach((remove) => remove());
    for (const element of root.querySelectorAll("button, input")) {
      element.onclick = element.oninput = element.onchange = null;
    }
    audio.onpause = audio.onplay = audio.ontimeupdate = null;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    stream?.getTracks().forEach((track) => track.stop());
    stopScratchGrains();
    source?.disconnect();
    fileNode?.disconnect();
    if (fileURL) URL.revokeObjectURL(fileURL);
    if (ctx && ctx.state !== "closed") void ctx.close();
    orbit.dispose();
    const geometries = new Set([bubbleGeo]);
    const materials = new Set([mat, washMat]);
    scene.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) {
        (Array.isArray(object.material)
          ? object.material
          : [object.material]
        ).forEach((material) => materials.add(material));
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => {
      material.map?.dispose();
      material.dispose();
    });
    renderer.dispose();
    renderer.domElement.remove();
  };
}
