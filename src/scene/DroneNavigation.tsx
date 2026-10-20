import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { deviceQuaternion } from "./gyroOrientation.ts";
import { useSensoryStore } from "../store/useSensoryStore.ts";
/** Manual heading with inertia; a soft inward field keeps the sculpture within reach. */
export default function DroneNavigation() {
  const { camera, gl } = useThree();
  const device = useRef(new THREE.Quaternion()),
    base = useRef(new THREE.Quaternion()),
    reference = useRef(new THREE.Quaternion()),
    desired = useRef(new THREE.Quaternion()),
    scratch = useRef(new THREE.Quaternion()),
    calibrated = useRef(false),
    hasSample = useRef(false),
    lastRecenter = useRef(0),
    lastTouch = useRef(0),
    touching = useRef(false),
    rotation = useRef(new THREE.Euler());
  const gyro = useSensoryStore((s) => s.gyro);
  useEffect(() => {
    if (!gyro) {
      hasSample.current = false;
      calibrated.current = false;
      return;
    }
    let source = "";
    const sample = (event: DeviceOrientationEvent) => {
      if (source && event.type !== source) return;
      if (
        event.alpha === null ||
        event.beta === null ||
        event.gamma === null ||
        ![event.alpha, event.beta, event.gamma].every(Number.isFinite)
      )
        return;
      source = event.type;
      deviceQuaternion(
        event.alpha,
        event.beta,
        event.gamma,
        window.screen.orientation?.angle ??
          (window as Window & { orientation?: number }).orientation ??
          0,
        device.current,
      );
      hasSample.current = true;
      if (!calibrated.current) {
        reference.current.copy(device.current).invert();
        base.current.copy(camera.quaternion);
        target.current.yaw = 0;
        target.current.pitch = 0;
        heading.current.yaw = 0;
        heading.current.pitch = 0;
        calibrated.current = true;
      }
      if (useSensoryStore.getState().gyroStatus !== "active")
        useSensoryStore.getState().patch({ gyroStatus: "active" });
    };
    window.addEventListener("deviceorientation", sample);
    window.addEventListener(
      "deviceorientationabsolute",
      sample as EventListener,
    );
    const timeout = setTimeout(() => {
      if (!hasSample.current)
        useSensoryStore
          .getState()
          .patch({ gyro: false, gyroStatus: "unavailable" });
    }, 5000);
    return () => {
      window.removeEventListener("deviceorientation", sample);
      window.removeEventListener(
        "deviceorientationabsolute",
        sample as EventListener,
      );
      clearTimeout(timeout);
      const euler = new THREE.Euler().setFromQuaternion(
        camera.quaternion,
        "YXZ",
      );
      target.current.yaw = euler.y;
      target.current.pitch = euler.x;
      heading.current.yaw = euler.y;
      heading.current.pitch = euler.x;
      calibrated.current = false;
    };
  }, [gyro, camera]);
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
      if (e.pointerType === "mouse" && e.button !== 0) return;
      touching.current = true;
      lastTouch.current = performance.now();
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
      lastTouch.current = performance.now();
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
      touching.current = contacts.size > 0;
      lastTouch.current = performance.now();
      target.current.boost = false;
      pinch = 0;
    };
    const contextMenu = (e: Event) => e.preventDefault();
    const blur = () => {
      contacts.clear();
      touching.current = false;
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
    if (
      state.travel &&
      !state.reduced &&
      !state.gyro &&
      !touching.current &&
      performance.now() - lastTouch.current > 1800 &&
      camera.position.length() > 15
    ) {
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
    desired.current.setFromEuler(
      rotation.current.set(
        heading.current.pitch,
        heading.current.yaw,
        Math.sin(target.current.yaw - heading.current.yaw) * 0.018,
        "YXZ",
      ),
    );
    if (state.recenter !== lastRecenter.current) {
      lastRecenter.current = state.recenter;
      reference.current.copy(device.current).invert();
      base.current.copy(camera.quaternion);
      target.current.yaw = 0;
      target.current.pitch = 0;
      heading.current.yaw = 0;
      heading.current.pitch = 0;
    }
    if (state.gyro && hasSample.current) {
      scratch.current.copy(reference.current).multiply(device.current);
      desired.current.copy(base.current).multiply(scratch.current);
      // Touch offsets remain available while the sensor controls the view.
      scratch.current.setFromEuler(
        rotation.current.set(
          heading.current.pitch,
          heading.current.yaw,
          0,
          "YXZ",
        ),
      );
      desired.current.premultiply(scratch.current);
    }
    camera.quaternion.slerp(desired.current, 1 - Math.exp(-dt * 9));
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
    if (state.travel && !state.reduced && camera.position.length() > 23)
      camera.position.multiplyScalar(
        Math.exp(-dt * (camera.position.length() - 23) * 0.04),
      );
    gl.domElement.dataset.cameraPosition = camera.position
      .toArray()
      .map((v) => v.toFixed(3))
      .join(",");
    gl.domElement.dataset.cameraFov = c.fov.toFixed(2);
    gl.domElement.dataset.cameraQuaternion = camera.quaternion
      .toArray()
      .map((v) => v.toFixed(4))
      .join(",");
  });
  return null;
}
