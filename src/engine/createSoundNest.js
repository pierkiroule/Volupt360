import * as THREE from "three";
import {
  BRUSHES,
  createBrushMark,
  createLandscapeGround,
  disposeMark,
} from "./brushes.js";
import { createCameraRig } from "./createCameraRig.js";

/** A circular watercolor landscape with a protected central point of view. */
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
  const camera = new THREE.PerspectiveCamera(
    82,
    innerWidth / innerHeight,
    0.1,
    180,
  );
  camera.position.set(0, 1.1, 1.2);
  const landscape = new THREE.Group();
  scene.add(landscape);
  const ground = createLandscapeGround();
  landscape.add(ground);
  let brush = "voiles",
    player = null,
    disposed = false,
    frameId = 0;
  let elapsed = 0,
    depositClock = 0,
    stroke = 0,
    previousFrequency = 0;
  let lastTime = performance.now(),
    lastReport = 0,
    reportState = null;
  const marks = [];
  const focus = new THREE.Vector3(0, 1, 16);
  const rig = createCameraRig(
    camera,
    renderer.domElement,
    landscape,
    (out) => out.copy(focus),
    onHint || (() => {}),
  );

  function deposit(id, f, introductory = false) {
    const definition = BRUSHES.find((item) => item.id === id);
    const angle = introductory
      ? stroke * 2.399963
      : stroke * 2.399963 + Math.sin(elapsed * 0.1) * 0.15;
    // Alternating rings and heights make foreground, middle ground and distant
    // silhouettes. Even the broadest brush cannot enter the central clearing.
    const radius = 12 + (stroke % 4) * 3.2 + f.low * 1.1;
    const height = -2.8 + (stroke % 5) * 1.45 + f.high * 1.7;
    const color = new THREE.Color(definition.color);
    color.offsetHSL(
      Math.sin(stroke * 1.7) * 0.025,
      f.energy * 0.09,
      Math.sin(stroke * 0.8) * 0.07,
    );
    const mark = createBrushMark(id, {
      angle,
      radius,
      height,
      energy: f.energy,
      seed: stroke * 1.37,
      color,
    });
    landscape.add(mark);
    marks.push({ object: mark, born: elapsed, introductory });
    if (!introductory) {
      focus.set(Math.sin(angle) * radius, height, Math.cos(angle) * radius);
    }
    stroke++;
    while (marks.length > 110) disposeMark(marks.shift().object);
    renderer.domElement.dataset.markCount = String(marks.length);
  }
  function reset() {
    marks.forEach((mark) => disposeMark(mark.object));
    marks.length = 0;
    stroke = 0;
    depositClock = 0;
    previousFrequency = 0;
    elapsed = 0;
    focus.set(0, 1, 16);
    renderer.domElement.dataset.markCount = "0";
    rig.reanchor();
  }
  // A pale landscape study introduces the circular composition before import.
  // Importing music replaces it with that track's own, sound-driven landscape.
  for (let i = 0; i < 16; i++)
    deposit(
      ["voiles", "falaises", "brumes", "corolles"][i % 4],
      { energy: 0.22, low: 0.2, high: 0.1 },
      true,
    );

  function frame(now) {
    if (disposed) return;
    frameId = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;
    const playback = player?.getState();
    if (playback?.playing) {
      elapsed += dt;
      depositClock += dt;
      const f = player.getFeatures();
      const change = Math.abs(f.freq - previousFrequency) / 1500;
      previousFrequency = f.freq;
      const interval = 0.7 + (1 - f.energy) * 0.9;
      if (
        f.rms > 0.006 &&
        depositClock > interval &&
        (f.flux > 0.004 || change > 0.015 || depositClock > 2.2)
      ) {
        deposit(brush, f);
        depositClock = 0;
      }
      for (let i = marks.length - 1; i >= 0; i--) {
        const item = marks[i],
          age = elapsed - item.born;
        const fade = 1 - THREE.MathUtils.smoothstep(age, 140, 200);
        item.object.traverse((object) => {
          if (object.material?.uniforms) {
            object.material.uniforms.uTime.value = elapsed;
            object.material.uniforms.uFade.value = fade;
          }
        });
        if (fade <= 0) {
          disposeMark(item.object);
          marks.splice(i, 1);
        }
      }
      renderer.domElement.dataset.markCount = String(marks.length);
    }
    rig.update(dt);
    try {
      renderer.render(scene, camera);
    } catch (error) {
      onError?.(error.message);
    }
    if (reportState && now - lastReport > 80) {
      reportState(playback);
      lastReport = now;
    }
  }
  const resize = () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
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
    setBrush(id) {
      if (BRUSHES.some((item) => item.id === id)) brush = id;
    },
    setCameraMode: rig.setMode,
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
      marks.forEach((mark) => disposeMark(mark.object));
      disposeMark(ground);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
