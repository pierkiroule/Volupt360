import { createLearningFlight } from "./createLearningFlight.js";
import * as THREE from "three";
import { LEARNING_TOPICS, LEARNING_SECONDS } from "./learningContent.js";
import { cleanProgress, saveProgress } from "./learningProgress.js";
import { createGazeInteraction } from "./createGazeInteraction.js";
import { createAutomaticPainter } from "./createAutomaticPainter.js";
import { createLearningIllustration } from "./createLearningIllustration.js";
import { createOizo } from "../sonoizo/createOizo.js";
import { sampleExperience } from "../chill/experienceTimeline.js";

export function createPoeticLearning({
  scene,
  camera,
  rig,
  navigation,
  canvas,
  sky,
  mobile,
  progress: initial,
  onChange = () => {},
  getAudio = () => ({}),
}) {
  const world = new THREE.Group();
  scene.add(world);
  const position = new THREE.Vector3(),
    direction = new THREE.Vector3(0, 0, -1),
    up = new THREE.Vector3(0, 1, 0),
    delta = new THREE.Vector3(),
    forward = new THREE.Vector3(),
    anchor = new THREE.Vector3();
  const flight = createLearningFlight(canvas, camera);
  let pose = flight.pose;
  const previousBird = new THREE.Vector3(),
    encounterPoint = new THREE.Vector3();
  const path = new THREE.Line3();
  const painter = createAutomaticPainter(world, mobile),
    illustration = createLearningIllustration(world),
    bird = createOizo();
  world.add(bird.group);
  bird.group.scale.setScalar(1.1);
  bird.setColor("#b4c8d0");
  const outer = new THREE.Group(),
    inner = new THREE.Group();
  world.add(outer, inner);
  const geometry = new THREE.SphereGeometry(
    1,
    mobile ? 16 : 24,
    mobile ? 12 : 16,
  );
  const sphereMaterial = (color) =>
    new THREE.ShaderMaterial({
      uniforms: {
        tint: { value: new THREE.Color(color) },
        presence: { value: 0.75 },
        light: { value: 1 },
        time: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      vertexShader:
        "varying vec3 n,v; void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}",
      fragmentShader:
        "uniform vec3 tint;uniform float presence,time,light;varying vec3 n,v;void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(v))),2.);float alpha=(.10+rim*.64)*presence;gl_FragColor=vec4(mix(tint*.45,tint+vec3(.24),light),alpha);\n#include <colorspace_fragment>\n}",
    });
  const bubbles = LEARNING_TOPICS.map((topic, i) => {
    const mesh = new THREE.Mesh(geometry, sphereMaterial(topic.color));
    // First destination opens straight ahead; other bearings cover the whole sky.
    const yaw = i === 0 ? 0 : i * 2.399963;
    const pitch = i === 0 ? 0 : Math.sin(i * 1.7) * 0.48;
    mesh.position
      .set(
        Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        -Math.cos(yaw) * Math.cos(pitch),
      )
      .multiplyScalar(18 + (i % 3) * 3);
    mesh.scale.setScalar(1.05);
    outer.add(mesh);
    return {
      id: topic.id,
      topic,
      mesh,
      base: mesh.position.clone(),
      color: new THREE.Color(topic.color),
    };
  });
  const haloCanvas = document.createElement("canvas");
  haloCanvas.width = haloCanvas.height = 64;
  const context = haloCanvas.getContext("2d"),
    gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,.6)");
  gradient.addColorStop(0.3, "rgba(255,255,255,.18)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const haloMap = new THREE.CanvasTexture(haloCanvas);
  for (const bubble of bubbles) {
    bubble.halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: haloMap,
        color: bubble.topic.color,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      }),
    );
    bubble.halo.scale.setScalar(5);
    outer.add(bubble.halo);
  }
  const connections = [],
    keys = new Set();
  for (const a of bubbles) {
    const neighbours = bubbles
      .filter((b) => a !== b)
      .sort(
        (b, c) =>
          a.base.distanceToSquared(b.base) - a.base.distanceToSquared(c.base),
      )
      .slice(0, 2);
    for (const b of neighbours) {
      const key = [a.id, b.id].sort().join(":");
      if (!keys.has(key)) {
        keys.add(key);
        connections.push(a, b);
      }
    }
  }
  const linkPositions = new Float32Array(connections.length * 3);
  const linkGeometry = new THREE.BufferGeometry();
  linkGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(linkPositions, 3).setUsage(
      THREE.DynamicDrawUsage,
    ),
  );
  const linkMaterial = new THREE.LineBasicMaterial({
    color: "#8da9c3",
    transparent: true,
    opacity: 0.11,
    depthWrite: false,
  });
  const links = new THREE.LineSegments(linkGeometry, linkMaterial);
  links.frustumCulled = false;
  outer.add(links);
  const satellites = [0, 1, 2].map((i) => {
    const mesh = new THREE.Mesh(
      geometry,
      sphereMaterial(["#98c8d1", "#d5b8d9", "#d7c89f"][i]),
    );
    mesh.scale.setScalar(0.42);
    inner.add(mesh);
    return {
      id: "message-" + i,
      index: i,
      mesh,
      color: mesh.material.uniforms.tint.value.clone(),
    };
  });
  inner.visible = false;
  let progress = cleanProgress(initial),
    mode = "EXPLORE",
    topic = null,
    message = null,
    paused = false,
    travelling = true,
    elapsed = progress.elapsed,
    time = 0,
    transition = 1,
    cooldown = 1.2,
    reportClock = 0,
    saveClock = 0,
    target = null,
    dwell = 0,
    disposed = false,
    storageAvailable = true;
  let lastBrush = null;
  const phase = {};
  const choices = [];
  function persist() {
    progress.elapsed = elapsed;
    storageAvailable = saveProgress(progress);
  }
  function snapshot() {
    return {
      mode,
      paused,
      travelling,
      topicId: topic?.id || null,
      message,
      progress: cleanProgress(progress),
      target,
      dwell,
      storageAvailable,
      invitation: elapsed >= LEARNING_SECONDS,
      activeBrush: lastBrush || null,
      flight: flight.state,
    };
  }
  function notify() {
    onChange(snapshot());
  }
  function enter(id) {
    if (paused || mode !== "EXPLORE" || cooldown > 0) return false;
    topic = LEARNING_TOPICS.find((t) => t.id === id);
    if (!topic) return false;
    mode = "BUBBLE";
    target = null;
    message = null;
    transition = 0;
    gaze.reset();
    painter.close();
    flight.setEnabled(false);
    anchor.copy(camera.position);
    void rig.enterContemplation(anchor);
    illustration.show(topic, anchor, camera.quaternion);
    inner.position.copy(anchor);
    inner.quaternion.copy(camera.quaternion);
    const offsets = [0, 0.68, -0.68];
    satellites.forEach((item, i) =>
      item.mesh.position.set(
        Math.sin(offsets[i]) * 4.5,
        [0, 0.65, -0.35][i],
        -Math.cos(offsets[i]) * 4.5,
      ),
    );
    inner.visible = true;
    persist();
    notify();
    return true;
  }
  function reveal(index) {
    if (mode !== "BUBBLE" || paused || message !== null || transition < 1)
      return false;
    const opened = progress.opened[topic.id],
      next = Math.min(2, opened.length);
    if (index !== next && !opened.includes(index)) return false;
    if (!opened.includes(index)) opened.push(index);
    message = index;
    gaze.reset();
    progress = cleanProgress(progress);
    persist();
    notify();
    return true;
  }
  const gaze = createGazeInteraction({
    onSelect(id) {
      if (mode === "EXPLORE") {
        if (!flight.state.manual && !progress.visited.includes(id))
          flight.guide(id);
      } else reveal(Number(id.split("-")[1]));
    },
  });
  function leave() {
    if (mode !== "BUBBLE") return;
    lastBrush = topic.id;
    painter.activate(lastBrush);
    progress.encountered.push(topic.id);
    progress = cleanProgress(progress);
    void rig.leaveContemplation();
    mode = "EXPLORE";
    topic = null;
    message = null;
    target = null;
    inner.visible = false;
    illustration.hide();
    transition = 0;
    cooldown = 3;
    gaze.reset();
    persist();
    notify();
  }
  function updateVisibility(dt) {
    transition = Math.min(1, transition + dt / 0.9);
    const blend = THREE.MathUtils.smoothstep(transition, 0, 1);
    for (const bubble of bubbles) {
      const visited = progress.visited.includes(bubble.id);
      bubble.mesh.material.uniforms.presence.value =
        (mode === "EXPLORE" ? blend : 1 - blend) * (visited ? 0.24 : 1);
      bubble.mesh.material.uniforms.time.value = time;
      bubble.mesh.material.uniforms.light.value = visited ? 0 : 1;
      bubble.halo.visible = bubble.mesh.visible && !visited;
      bubble.halo.material.opacity =
        (mode === "EXPLORE" ? blend : 1 - blend) * 0.4;
      bubble.halo.position.copy(bubble.mesh.position);
      bubble.mesh.material.uniforms.tint.value
        .copy(bubble.color)
        .multiplyScalar(1 - phase.progress * 0.65);
      bubble.mesh.visible = mode === "EXPLORE" || transition < 1;
      bubble.mesh.position
        .copy(bubble.base)
        .addScaledVector(up, Math.sin(time * 0.13 + bubble.topic.index) * 0.22);
    }
    for (let i = 0; i < connections.length; i++)
      connections[i].mesh.position.toArray(linkPositions, i * 3);
    linkGeometry.attributes.position.needsUpdate = true;
    linkMaterial.opacity = (mode === "EXPLORE" ? blend : 1 - blend) * 0.11;
    if (topic) {
      const opened = progress.opened[topic.id],
        next = Math.min(2, opened.length);
      satellites.forEach((item, i) => {
        item.mesh.visible = message === null;
        item.mesh.material.uniforms.tint.value
          .copy(item.color)
          .multiplyScalar(1 - phase.progress * 0.65);
        item.mesh.material.uniforms.presence.value =
          blend * (i === next ? 1 : opened.includes(i) ? 0.35 : 0.13);
        item.mesh.scale.setScalar(i === next ? 0.46 : 0.36);
      });
    }
  }
  navigation.windEnabled = true;
  navigation.chill = true;
  navigation.position.copy(pose.position);
  navigation.direction.copy(pose.direction);
  void rig.setMode("drone");
  sky.update(0, {}, 0, sampleExperience(0));
  notify();
  return {
    get state() {
      return snapshot();
    },
    enter,
    reveal,
    leave,
    dismissMessage() {
      message = null;
      gaze.reset();
      cooldown = 0.5;
      notify();
    },
    setPaused(value) {
      paused = Boolean(value);
      gaze.reset();
      dwell = 0;
      persist();
      notify();
    },
    setTravelling(value) {
      travelling = Boolean(value);
      notify();
    },
    persist,
    guide() {
      if (mode !== "EXPLORE") return;
      flight.guide();
      cooldown = 1;
      gaze.reset();
    },
    recenter() {
      if (mode === "EXPLORE") this.guide();
      else
        rig.lookAtExploration(
          anchor
            .clone()
            .add(new THREE.Vector3(0, 0, -4).applyQuaternion(inner.quaternion)),
        );
    },
    update(rawDt) {
      if (disposed) return;
      const dt = paused ? 0 : Math.max(0, Math.min(0.1, rawDt));
      time += dt;
      elapsed += dt;
      progress.elapsed = elapsed;
      cooldown = Math.max(0, cooldown - dt);
      previousBird.copy(pose.position);
      flight.setEnabled(mode === "EXPLORE" && travelling && !paused);
      pose = flight.update(
        mode === "EXPLORE" && travelling ? dt : 0,
        getAudio(),
        bubbles,
        progress.visited,
        Boolean(lastBrush),
      );
      position.copy(pose.position);
      navigation.position.copy(pose.position);
      navigation.direction.copy(pose.direction);
      navigation.velocity.copy(pose.velocity);
      navigation.acrobatics = pose.acrobatics;
      navigation.time = pose.time;
      if (mode === "BUBBLE") rig.setExplorationPosition(anchor);
      rig.update(dt);
      camera.getWorldDirection(direction);
      sky.object.position.copy(position);
      sampleExperience(
        Math.min(360, (elapsed / LEARNING_SECONDS) * 360),
        phase,
      );
      sky.update(time, getAudio(), phase.progress, phase);
      updateVisibility(dt);
      illustration.update(time, dt, direction, phase.progress);
      bird.group.visible = mode === "EXPLORE";
      pose.acoustic = getAudio();
      bird.update(pose);
      painter.update(
        dt,
        pose,
        pose.acoustic,
        mode === "EXPLORE" && travelling && transition >= 1,
      );
      if (mode === "EXPLORE" && dt > 0 && cooldown === 0) {
        path.set(previousBird, pose.position);
        for (const bubble of bubbles) {
          if (progress.visited.includes(bubble.id)) continue;
          path.closestPointToPoint(bubble.mesh.position, true, encounterPoint);
          if (
            encounterPoint.distanceToSquared(bubble.mesh.position) <
            1.45 * 1.45
          ) {
            enter(bubble.id);
            break;
          }
        }
      }
      choices.length = 0;
      if (!paused && message === null && cooldown === 0 && transition >= 1) {
        if (mode === "EXPLORE") {
          if (!flight.state.manual)
            choices.push(
              ...bubbles.filter((b) => !progress.visited.includes(b.id)),
            );
        } else {
          const next = Math.min(2, progress.opened[topic.id].length);
          choices.push(satellites[next]);
        }
      }
      world.updateMatrixWorld(true);
      let closest = null,
        best = Infinity;
      for (const item of choices) {
        item.mesh.getWorldPosition(delta);
        forward.copy(delta).sub(camera.position);
        const distance = forward.length();
        const alignment = forward.normalize().dot(direction);
        if (
          alignment <= 0 ||
          Math.acos(Math.min(1, alignment)) >
            Math.max(0.045, Math.atan2(item.mesh.scale.x, distance))
        )
          continue;
        if (distance < best) {
          closest = item.id;
          best = distance;
        }
      }
      const result = gaze.update(closest, dt);
      target = result.target;
      dwell = result.progress;
      canvas.dataset.learningFlight = JSON.stringify(flight.state);
      canvas.dataset.learningBirdPosition = pose.position
        .toArray()
        .map((n) => n.toFixed(4))
        .join(",");
      canvas.dataset.learningBubbles = JSON.stringify(
        bubbles.map((b) => ({
          id: b.id,
          visited: progress.visited.includes(b.id),
          visible: b.mesh.visible,
          luminous: !progress.visited.includes(b.id),
        })),
      );
      canvas.dataset.learningMode = mode;
      canvas.dataset.learningProgress = String(progress.visited.length);
      canvas.dataset.learningOpened = topic
        ? String(progress.opened[topic.id].length)
        : "0";
      canvas.dataset.learningBrush = lastBrush || "";
      canvas.dataset.learningPaint = JSON.stringify(painter.stats);
      canvas.dataset.cameraPosition = camera.position
        .toArray()
        .map((n) => n.toFixed(4))
        .join(",");
      canvas.dataset.cameraOrientation = camera.quaternion
        .toArray()
        .map((n) => n.toFixed(5))
        .join(",");
      canvas.dataset.learningTime = elapsed.toFixed(2);
      reportClock += rawDt;
      saveClock += dt;
      if (saveClock > 5) {
        saveClock = 0;
        persist();
      }
      if (reportClock > 0.1) {
        reportClock = 0;
        notify();
      }
    },
    dispose() {
      disposed = true;
      persist();
      flight.dispose();
      painter.dispose();
      illustration.dispose();
      bird.dispose();
      bubbles.forEach((b) => {
        b.mesh.material.dispose();
        b.halo.material.dispose();
      });
      haloMap.dispose();
      linkGeometry.dispose();
      linkMaterial.dispose();
      satellites.forEach((b) => b.mesh.material.dispose());
      geometry.dispose();
      world.removeFromParent();
    },
  };
}
