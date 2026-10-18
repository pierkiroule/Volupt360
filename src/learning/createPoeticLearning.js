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
    side = new THREE.Vector3(1, 0, 0),
    up = new THREE.Vector3(0, 1, 0),
    delta = new THREE.Vector3(),
    forward = new THREE.Vector3(),
    anchor = new THREE.Vector3();
  const pose = {
    position: new THREE.Vector3(),
    direction,
    side,
    up,
    velocity: new THREE.Vector3(),
    time: 0,
    acoustic: {},
  };
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
        time: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      vertexShader:
        "varying vec3 n,v; void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}",
      fragmentShader:
        "uniform vec3 tint;uniform float presence,time;varying vec3 n,v;void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(v))),2.);float alpha=(.055+rim*.38)*presence;gl_FragColor=vec4(tint+rim*.10,alpha);\n#include <colorspace_fragment>\n}",
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
    transition = 0,
    cooldown = 1.2,
    reportClock = 0,
    saveClock = 0,
    target = null,
    dwell = 0,
    disposed = false,
    storageAvailable = true;
  let lastBrush = progress.visited.at(-1);
  if (lastBrush) painter.activate(lastBrush);
  const phase = {};
  const ray = new THREE.Raycaster(),
    ndc = new THREE.Vector2(0, 0),
    choices = [];
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
    anchor.copy(position);
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
      if (mode === "EXPLORE") enter(id);
      else reveal(Number(id.split("-")[1]));
    },
  });
  function leave() {
    if (mode !== "BUBBLE") return;
    const completed = progress.opened[topic.id].length === 3;
    if (completed) {
      lastBrush = topic.id;
      painter.activate(lastBrush);
    }
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
        (mode === "EXPLORE" ? blend : 1 - blend) * (visited ? 0.3 : 0.95);
      bubble.mesh.material.uniforms.time.value = time;
      bubble.mesh.material.uniforms.tint.value
        .copy(bubble.color)
        .multiplyScalar(1 - phase.progress * 0.65);
      bubble.mesh.visible = mode === "EXPLORE" || transition < 1;
      bubble.mesh.position
        .copy(bubble.base)
        .addScaledVector(up, Math.sin(time * 0.13 + bubble.topic.index) * 0.22);
    }
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
  void rig.enterContemplation(position);
  rig.setExplorationPosition(position);
  rig.lookAtExploration(new THREE.Vector3(0, 0, -18));
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
      const candidate =
        bubbles.find((b) => !progress.visited.includes(b.id)) || bubbles[0];
      rig.lookAtExploration(candidate.mesh.position);
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
      camera.getWorldDirection(direction);
      side.crossVectors(direction, up).normalize();
      if (side.lengthSq() < 0.1) side.set(1, 0, 0);
      if (mode === "EXPLORE" && travelling) {
        // Keep the visit navigable; reduce outward drift at the soft boundary.
        const outward = position.length() > 34 && direction.dot(position) > 0;
        const speed = outward
          ? Math.max(0, (40 - position.length()) / 6) * 0.7
          : 0.7;
        position.addScaledVector(direction, dt * speed);
      }
      rig.setExplorationPosition(position);
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
      pose.position
        .copy(position)
        .addScaledVector(direction, 3.8)
        .addScaledVector(up, -0.45);
      pose.time = time;
      pose.acoustic = getAudio();
      pose.velocity.copy(direction).multiplyScalar(travelling ? 0.7 : 0);
      bird.update(pose);
      painter.update(
        dt,
        pose,
        pose.acoustic,
        mode === "EXPLORE" && travelling && transition >= 1,
      );
      choices.length = 0;
      if (!paused && message === null && cooldown === 0 && transition >= 1) {
        if (mode === "EXPLORE") choices.push(...bubbles);
        else {
          const next = Math.min(2, progress.opened[topic.id].length);
          choices.push(satellites[next]);
        }
      }
      world.updateMatrixWorld(true);
      ray.setFromCamera(ndc, camera);
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
      painter.dispose();
      illustration.dispose();
      bird.dispose();
      bubbles.forEach((b) => b.mesh.material.dispose());
      satellites.forEach((b) => b.mesh.material.dispose());
      geometry.dispose();
      world.removeFromParent();
    },
  };
}
