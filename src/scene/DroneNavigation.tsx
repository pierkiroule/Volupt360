import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSensoryStore } from "../store/useSensoryStore.ts";
/** Manual heading with inertia; a soft inward field keeps the sculpture within reach. */
export default function DroneNavigation() {
  const { camera, gl } = useThree();
  const target = useRef({ yaw: 0, pitch: 0, fov: 70, boost: false }),
    heading = useRef({ yaw: 0, pitch: 0 }),
    velocity = useRef(new THREE.Vector3()),
    forward = useRef(new THREE.Vector3()),
    inward = useRef(new THREE.Vector3());
  useEffect(() => {
    const canvas = gl.domElement,
      contacts = new Map<
        number,
        { x: number; y: number; startX: number; startY: number; start: number }
      >();
    let pinch = 0;
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      contacts.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        startX: e.clientX,
        startY: e.clientY,
        start: performance.now(),
      });
      canvas.setPointerCapture(e.pointerId);
      pinch = 0;
    };
    const move = (e: PointerEvent) => {
      const p = contacts.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x,
        dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (contacts.size === 2) {
        const [a, b] = [...contacts.values()],
          d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch)
          target.current.fov = THREE.MathUtils.clamp(
            target.current.fov + (pinch - d) * 0.09,
            48,
            86,
          );
        pinch = d;
      } else {
        target.current.yaw -= dx * 0.0032;
        target.current.pitch = THREE.MathUtils.clamp(
          target.current.pitch - dy * 0.0028,
          -1.05,
          1.05,
        );
      }
    };
    const up = (e: PointerEvent) => {
      contacts.delete(e.pointerId);
      target.current.boost = false;
      pinch = 0;
    };
    const contextMenu = (e: Event) => e.preventDefault();
    const blur = () => {
      contacts.clear();
      target.current.boost = false;
      pinch = 0;
    };
    const keys = (e: KeyboardEvent) => {
      if (document.activeElement !== canvas) return;
      let handled = true;
      switch (e.key) {
        case "ArrowLeft":
          target.current.yaw += 0.1;
          break;
        case "ArrowRight":
          target.current.yaw -= 0.1;
          break;
        case "ArrowUp":
          target.current.pitch = Math.min(1.05, target.current.pitch + 0.08);
          break;
        case "ArrowDown":
          target.current.pitch = Math.max(-1.05, target.current.pitch - 0.08);
          break;
        case "+":
          target.current.fov = Math.max(48, target.current.fov - 4);
          break;
        case "-":
          target.current.fov = Math.min(86, target.current.fov + 4);
          break;
        default:
          handled = false;
      }
      if (handled) e.preventDefault();
    };
    const hold = setInterval(() => {
      const p = contacts.values().next().value;
      target.current.boost =
        contacts.size === 1 && !!p && performance.now() - p.start > 450;
    }, 120);
    canvas.tabIndex = 0;
    canvas.setAttribute(
      "aria-label",
      "Univers sensoriel 3D : glisser pour piloter, maintenir pour accélérer, pincer pour le champ. Flèches au clavier.",
    );
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("lostpointercapture", up);
    canvas.addEventListener("keydown", keys);
    canvas.addEventListener("contextmenu", contextMenu);
    window.addEventListener("blur", blur);
    return () => {
      clearInterval(hold);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("lostpointercapture", up);
      canvas.removeEventListener("keydown", keys);
      canvas.removeEventListener("contextmenu", contextMenu);
      window.removeEventListener("blur", blur);
    };
  }, [camera, gl]);
  useFrame((_, delta) => {
    const state = useSensoryStore.getState();
    const dt = Math.min(delta, 0.1),
      f = 1 - Math.exp(-dt * 4);
    if (state.paused) return;
    if (state.travel && !state.reduced && camera.position.length() > 15) {
      inward.current.copy(camera.position).negate().normalize();
      const yaw = Math.atan2(-inward.current.x, -inward.current.z);
      target.current.yaw +=
        Math.atan2(
          Math.sin(yaw - target.current.yaw),
          Math.cos(yaw - target.current.yaw),
        ) *
        dt *
        0.32;
      target.current.pitch +=
        (-Math.asin(THREE.MathUtils.clamp(-inward.current.y, -1, 1)) -
          target.current.pitch) *
        dt *
        0.3;
    }
    heading.current.yaw += (target.current.yaw - heading.current.yaw) * f;
    heading.current.pitch += (target.current.pitch - heading.current.pitch) * f;
    camera.rotation.set(
      heading.current.pitch,
      heading.current.yaw,
      Math.sin(target.current.yaw - heading.current.yaw) * 0.018,
      "YXZ",
    );
    const c = camera as THREE.PerspectiveCamera;
    c.fov += (target.current.fov - c.fov) * f;
    c.updateProjectionMatrix();
    const speed =
      state.travel && !state.reduced ? (target.current.boost ? 2.3 : 0.85) : 0;
    forward.current
      .set(0, 0, -1)
      .applyQuaternion(camera.quaternion)
      .multiplyScalar(speed);
    velocity.current.lerp(forward.current, f);
    if (!state.travel || state.reduced) velocity.current.set(0, 0, 0);
    camera.position.addScaledVector(velocity.current, dt);
    // Continuous radial drag: no wrap, teleport or abrupt forced camera cut.
    if (camera.position.length() > 20)
      camera.position.multiplyScalar(
        Math.exp(-dt * (camera.position.length() - 20) * 0.04),
      );
    gl.domElement.dataset.cameraPosition = camera.position
      .toArray()
      .map((v) => v.toFixed(3))
      .join(",");
    gl.domElement.dataset.cameraFov = c.fov.toFixed(2);
  });
  return null;
}
