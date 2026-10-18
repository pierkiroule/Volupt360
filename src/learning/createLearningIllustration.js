import * as THREE from "three";
import { createWatercolorAlpha } from "../chill/createWatercolorAlpha.js";

// A single reusable point/line field: 12 different motion models, no simulations
// claiming to measure the participant. Gaze is the only interaction signal.
export function createLearningIllustration(parent) {
  const group = new THREE.Group();
  parent.add(group);
  group.visible = false;
  const points = new Float32Array(96 * 3),
    lines = new Float32Array(96 * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(points, 3).setUsage(THREE.DynamicDrawUsage),
  );
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(lines, 3).setUsage(THREE.DynamicDrawUsage),
  );
  const material = new THREE.PointsMaterial({
    color: "#d1ccd8",
    size: 0.12,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const lineMaterial = new THREE.LineBasicMaterial({
    color: "#a8beca",
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const particles = new THREE.Points(geometry, material);
  const line = new THREE.Line(lineGeometry, lineMaterial);
  particles.frustumCulled = line.frustumCulled = false;
  group.add(particles, line);
  const alpha = new THREE.CanvasTexture(
    createWatercolorAlpha("wash", 429, 128),
  );
  const plane = new THREE.PlaneGeometry(1, 1, 8, 8),
    washes = [];
  for (let i = 0; i < 5; i++) {
    const wash = new THREE.Mesh(
      plane,
      new THREE.MeshBasicMaterial({
        map: alpha,
        color: "#bacfda",
        transparent: true,
        opacity: 0.13,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    const yaw = i * 2.399963;
    wash.position.set(
      Math.sin(yaw) * 11,
      Math.sin(i * 2) * 3,
      -Math.cos(yaw) * 11,
    );
    wash.lookAt(0, 0, 0);
    wash.scale.set(6 + i, 4 + i, 1);
    group.add(wash);
    washes.push(wash);
  }
  let topic = null,
    weight = 0;
  const pigment = new THREE.Color();
  const gaze = new THREE.Vector3(),
    inverse = new THREE.Quaternion();
  return {
    group,
    show(next, position, quaternion) {
      topic = next;
      weight = 0;
      group.position.copy(position);
      group.quaternion.copy(quaternion);
      group.visible = true;
      pigment.set(next.color);
      material.color.copy(pigment);
      lineMaterial.color.set(next.color);
      washes.forEach((wash) => wash.material.color.set(next.color));
    },
    hide() {
      topic = null;
      group.visible = false;
    },
    update(time, dt, worldDirection, light = 0) {
      if (!topic) return;
      material.color.copy(pigment).multiplyScalar(1 - light * 0.55);
      lineMaterial.color.copy(material.color);
      gaze
        .copy(worldDirection)
        .applyQuaternion(inverse.copy(group.quaternion).invert());
      weight += (gaze.y - weight) * (1 - Math.exp(-dt * 2));
      for (let i = 0; i < 96; i++) {
        const p = i / 95,
          a = p * Math.PI * 2,
          s = time * 0.25,
          model = topic.animation;
        let x = Math.cos(a) * 2.2,
          y = Math.sin(a) * 1.5,
          z = -5;
        if (model === "body") {
          x = Math.cos(a) * (i < 48 ? 1 : 1.4 + weight * 0.3);
          y = Math.sin(a) * 1.7;
          z = -5 - (i < 48 ? 0.5 : 0);
        } else if (model === "grains") {
          x = Math.sin(i * 2.4) * (1.8 + weight);
          y = Math.cos(i * 1.8) * 1.5 + Math.sin(s + i) * 0.15;
          z = -5 + Math.sin(i) * 0.8;
        } else if (model === "breath") {
          x = (p - 0.5) * 6;
          y = Math.sin(p * 6 + s) * (0.6 + 0.3 * Math.sin(s)) + weight;
          z = -5 + Math.cos(p * 4 + s) * 0.8;
        } else if (model === "flow") {
          x = Math.sin(i * 2.4) * 5;
          y = Math.cos(i * 1.8) * 3;
          z = -3 - ((p * 16 + time * 0.25) % 16);
        } else if (model === "outline") {
          x = Math.cos(a) * (1.7 + Math.sin(a * 3) * 0.35);
          y = Math.sin(a) * (1.4 + weight * 0.3);
          z = -5 + Math.cos(s + a) * 0.3;
        } else if (model === "dream") {
          x = Math.sin(i * 3) * 3 + Math.sin(s + i * 0.1) * 0.3;
          y = Math.cos(i * 2.7) * 1.8;
          z = -6 + Math.sin(i + s) * 1.4;
        } else if (model === "horizon") {
          x = (p - 0.5) * 9;
          y = i < 48 ? -0.7 : Math.sin(p * 7 + s) * 0.35 + 0.6;
          z = -6;
        } else if (model === "rings") {
          const r = 1 + Math.floor(i / 32) * 0.6;
          x = Math.cos(a * 3) * r;
          y = Math.sin(a * 3) * r * (0.8 + weight * 0.1);
          z = -5 + Math.sin(s) * 0.12;
        } else if (model === "ribbon") {
          x = (p - 0.5) * 6;
          y = Math.sin(p * Math.PI) * (1 + weight * 1.8);
          z = -5 + Math.sin(p * 9 + s) * 0.35;
        } else if (model === "focus") {
          x = (p - 0.5) * 7;
          y =
            Math.sin(p * 48) *
            (0.25 + Math.exp(-Math.pow((p - 0.5 - gaze.x * 0.3) * 5, 2)));
          z = -5;
        } else if (model === "scales") {
          const r = 1 + Math.floor(i / 24) * 1.6;
          x = Math.cos(a * 4) * r;
          y = Math.sin(a * 4) * r;
          z = -5 - r * 0.45;
        } else if (model === "paths") {
          x = (p - 0.5) * 8;
          y = Math.sin(p * 4 + Math.floor(i / 32) * 2) + weight * p;
          z = -5 - Math.floor(i / 32) * 0.6;
        }
        const offset = i * 3;
        points[offset] = lines[offset] = x;
        points[offset + 1] = lines[offset + 1] = y;
        points[offset + 2] = lines[offset + 2] = z;
      }
      geometry.attributes.position.needsUpdate =
        lineGeometry.attributes.position.needsUpdate = true;
      // Discontinuous phenomena are points, not falsely connected graphs.
      lineMaterial.opacity = ["grains", "dream", "flow"].includes(
        topic.animation,
      )
        ? 0
        : 0.32;
      washes.forEach((wash, i) => {
        wash.rotation.z = Math.sin(time * 0.025 + i) * 0.12;
        wash.material.opacity = 0.1 + 0.025 * Math.sin(time * 0.12 + i);
      });
    },
    dispose() {
      geometry.dispose();
      lineGeometry.dispose();
      material.dispose();
      lineMaterial.dispose();
      washes.forEach((w) => w.material.dispose());
      plane.dispose();
      alpha.dispose();
      group.removeFromParent();
    },
  };
}
