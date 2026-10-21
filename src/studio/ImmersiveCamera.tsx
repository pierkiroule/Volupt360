import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { deviceQuaternion } from "../scene/gyroOrientation";
export function ImmersiveCamera({
  gyro,
  travel,
  recenter,
  paused,
  onUnavailable,
}: {
  gyro: boolean;
  travel: boolean;
  recenter: number;
  paused: boolean;
  onUnavailable: () => void;
}) {
  const { camera, gl } = useThree();
  const state = useRef({ yaw: Math.PI, pitch: 0, id: -1, x: 0, y: 0 });
  const sensor = useMemo(() => new THREE.Quaternion(), []),
    reference = useRef<THREE.Quaternion | null>(null),
    base = useMemo(() => new THREE.Quaternion(), []),
    target = useMemo(() => new THREE.Quaternion(), []),
    euler = useMemo(() => new THREE.Euler(0, 0, 0, "YXZ"), []),
    forward = useMemo(() => new THREE.Vector3(), []),
    inward = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, 5);
    return () => {};
  }, [camera]);
  useEffect(() => {
    const canvas = gl.domElement,
      s = state.current;
    const down = (e: PointerEvent) => {
      if (!e.isPrimary) return;
      s.id = e.pointerId;
      s.x = e.clientX;
      s.y = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== s.id) return;
      s.yaw -= (e.clientX - s.x) * 0.003;
      s.pitch = THREE.MathUtils.clamp(
        s.pitch - (e.clientY - s.y) * 0.003,
        -1.3,
        1.3,
      );
      s.x = e.clientX;
      s.y = e.clientY;
    };
    const up = () => {
      s.id = -1;
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    window.addEventListener("blur", up);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      window.removeEventListener("blur", up);
    };
  }, [gl]);
  useEffect(() => {
    reference.current = null;
    if (!gyro) {
      euler.setFromQuaternion(camera.quaternion, "YXZ");
      state.current.yaw = euler.y;
      state.current.pitch = euler.x;
      return;
    }
    let source = "";
    const sample = (e: DeviceOrientationEvent) => {
      if (source && source !== e.type) return;
      if (
        [e.alpha, e.beta, e.gamma].some(
          (v) => v === null || !Number.isFinite(v),
        )
      )
        return;
      source = e.type;
      deviceQuaternion(
        e.alpha!,
        e.beta!,
        e.gamma!,
        screen.orientation?.angle || 0,
        sensor,
      );
      if (!reference.current) {
        reference.current = sensor.clone().invert();
        base.copy(camera.quaternion);
      }
    };
    window.addEventListener("deviceorientation", sample);
    window.addEventListener("deviceorientationabsolute", sample);
    const timer = setTimeout(() => {
      if (!reference.current) onUnavailable();
    }, 6000);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("deviceorientation", sample);
      window.removeEventListener("deviceorientationabsolute", sample);
    };
  }, [gyro, recenter, camera]);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    target.setFromEuler(
      euler.set(state.current.pitch, state.current.yaw, 0, "YXZ"),
    );
    if (gyro && reference.current)
      target.copy(base).multiply(reference.current).multiply(sensor);
    camera.quaternion.slerp(target, 1 - Math.exp(-dt * 7));
    if (travel && !paused) {
      forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
      if (camera.position.length() > 5)
        forward
          .lerp(
            inward.copy(camera.position).normalize().negate(),
            THREE.MathUtils.smoothstep(camera.position.length(), 5, 8) * 0.85,
          )
          .normalize();
      camera.position.addScaledVector(forward, dt * 0.5).clampLength(0, 8);
    }
    gl.domElement.dataset.cameraPosition = camera.position
      .toArray()
      .map((v) => v.toFixed(3))
      .join(",");
    gl.domElement.dataset.cameraHeading = camera.quaternion
      .toArray()
      .map((v) => v.toFixed(4))
      .join(",");
  });
  return null;
}
