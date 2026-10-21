import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { createWatercolorField } from "./createWatercolorField.js";
import { deviceQuaternion } from "../scene/gyroOrientation.ts";
import { createWatercolorMotion } from "./drawAccents.js";
import { directionToPaper, SCULPT_RADIUS } from "./brushes.js";
function Painting({ strokes, draft, source, paused, onCapture, materials }) {
  const { gl, scene, camera } = useThree(),
    time = useRef(0);
  const weather = useMemo(
      () =>
        createWatercolorField({
          mobile: innerWidth < 600 || matchMedia("(pointer: coarse)").matches,
        }),
      [],
    ),
    texture = useMemo(() => {
      const t = new THREE.CanvasTexture(source.canvas);
      t.colorSpace = THREE.SRGBColorSpace;
      t.repeat.y = 1 / 0.92;
      t.offset.y = -0.04 / 0.92;
      return t;
    }, [source.canvas]);
  const accents = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.repeat.y = 1 / 0.92;
    texture.offset.y = -0.04 / 0.92;
    return {
      canvas,
      ctx: canvas.getContext("2d"),
      texture,
      motion: createWatercolorMotion({ mobile: innerWidth < 600 }),
      last: -1,
    };
  }, []);
  useEffect(
    () => () => {
      accents.texture.dispose();
      accents.motion.dispose();
    },
    [accents],
  );
  useEffect(() => {
    accents.motion.setMaterials(materials);
    weather.setMaterials(materials);
    accents.last = -1;
  }, [materials, accents, weather]);
  useEffect(() => {
    accents.last = -1;
    accents.motion.setDocument(draft ? [...strokes, draft] : strokes);
  }, [strokes, draft, accents]);
  useEffect(() => () => weather.dispose(), [weather]);
  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => {
    texture.needsUpdate = true;
  }, [source, texture]);
  useEffect(() => {
    weather.setDocument(draft ? [...strokes, draft] : strokes);
  }, [strokes, draft, weather]);
  useEffect(() => {
    onCapture(
      () =>
        new Promise((resolve, reject) => {
          gl.render(scene, camera);
          gl.domElement.toBlob((b) =>
            b ? resolve(b) : reject(Error("Capture indisponible.")),
          );
        }),
    );
  }, [gl, scene, camera, onCapture]);
  useFrame((_, dt) => {
    if (!paused) time.current += Math.min(dt, 0.1);
    weather.update(time.current, 1);
    if (accents.last < 0 || time.current - accents.last > 1 / 15) {
      accents.last = time.current;
      accents.ctx.clearRect(0, 0, accents.canvas.width, accents.canvas.height);
      accents.ctx.save();
      accents.ctx.scale(
        accents.canvas.width / 768,
        accents.canvas.height / 768,
      );
      accents.motion.draw(accents.ctx, time.current);
      accents.ctx.restore();
      accents.texture.needsUpdate = true;
    }
    gl.domElement.dataset.externalMaterials = String(
      Object.keys(materials).length,
    );
    gl.domElement.dataset.materialStyle = "abstract-watercolor";
    gl.domElement.dataset.reliefVertices = String(weather.stats.ribbonVertices);
    gl.domElement.dataset.particles = String(weather.stats.particles);
    gl.domElement.dataset.veils = String(weather.stats.veils);
    gl.domElement.dataset.strokes = String(strokes.length);
    gl.domElement.dataset.animationTime = time.current.toFixed(3);
  });
  return (
    <>
      <color attach="background" args={["#05070d"]} />
      <primitive object={weather.group} />
      <mesh>
        <sphereGeometry args={[8.98, 64, 40]} />
        <meshBasicMaterial
          map={accents.texture}
          side={THREE.BackSide}
          transparent
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[9, 64, 40]} />
        <meshBasicMaterial map={texture} side={THREE.BackSide} transparent />
      </mesh>
    </>
  );
}
function Interaction({
  strokes,
  paint,
  travel,
  tool,
  onStroke,
  onDraft,
  onErase,
  onGyroUnavailable,
  recenter,
  gyro,
  paused,
}) {
  const { camera, gl } = useThree(),
    state = useRef({ paint, tool, onStroke, onDraft, onErase, paused });
  state.current = { paint, tool, onStroke, onDraft, onErase, paused };
  const goal = useRef({ yaw: 0, pitch: 0 }),
    desired = useRef(new THREE.Quaternion()),
    viewEuler = useRef(new THREE.Euler()),
    sensor = useRef(new THREE.Quaternion()),
    base = useRef(new THREE.Quaternion()),
    reference = useRef(null),
    sensorReady = useRef(false),
    flight = useRef({ held: false, holdTime: 0, speed: 0 }),
    forward = useRef(new THREE.Vector3()),
    inward = useRef(new THREE.Vector3()),
    nextPosition = useRef(new THREE.Vector3());
  useEffect(() => {
    // Enter facing the latest gesture instead of a potentially empty longitude.
    const recent = strokes.at(-1);
    if (!recent?.points.length) return;
    const p = recent.points[Math.floor(recent.points.length / 2)];
    const longitude = p.x * Math.PI * 2,
      latitude = (0.04 + p.y * 0.92) * Math.PI;
    camera.lookAt(
      -Math.cos(longitude) * Math.sin(latitude),
      Math.cos(latitude),
      Math.sin(longitude) * Math.sin(latitude),
    );
    const e = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
    goal.current = { yaw: e.y, pitch: e.x };
  }, [camera]);
  useEffect(() => {
    if (!gyro) {
      const e = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
      goal.current = { yaw: e.y, pitch: e.x };
      sensorReady.current = false;
      return;
    }
    reference.current = null;
    sensorReady.current = false;
    const pose = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
    goal.current = { yaw: pose.y, pitch: pose.x };
    let source = "";
    const sample = (e) => {
      if (source && source !== e.type) return;
      if (
        [e.alpha, e.beta, e.gamma].some(
          (v) => v === null || !Number.isFinite(v),
        )
      )
        return;
      source = e.type;
      deviceQuaternion(
        e.alpha,
        e.beta,
        e.gamma,
        screen.orientation?.angle ?? window.orientation ?? 0,
        sensor.current,
      );
      if (!reference.current) {
        reference.current = sensor.current.clone().invert();
        base.current.copy(camera.quaternion);
        goal.current = { yaw: 0, pitch: 0 };
      }
      sensorReady.current = true;
    };
    window.addEventListener("deviceorientation", sample);
    window.addEventListener("deviceorientationabsolute", sample);
    const timeout = setTimeout(() => {
      if (!sensorReady.current) onGyroUnavailable?.();
    }, 6000);
    return () => {
      window.removeEventListener("deviceorientation", sample);
      window.removeEventListener("deviceorientationabsolute", sample);
      clearTimeout(timeout);
    };
  }, [gyro, camera, recenter]);
  useEffect(() => {
    const canvas = gl.domElement,
      ray = new THREE.Raycaster(),
      pointer = new THREE.Vector2(),
      sphere = new THREE.Sphere(new THREE.Vector3(), SCULPT_RADIUS),
      hit = new THREE.Vector3();
    let gesture = null;
    const point = (e) => {
      const r = canvas.getBoundingClientRect();
      pointer.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      );
      camera.updateMatrixWorld();
      ray.setFromCamera(pointer, camera);
      return ray.ray.intersectSphere(sphere, hit)
        ? directionToPaper(hit)
        : null;
    };
    const down = (e) => {
      if (!e.isPrimary || e.button > 0) return;
      canvas.setPointerCapture(e.pointerId);
      const p = point(e);
      if (state.current.paint && state.current.tool.erase) {
        if (p) state.current.onErase(p);
        return;
      }
      flight.current.held = true;
      flight.current.holdTime = 0;
      gesture = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        paint: state.current.paint,
        stroke: { ...state.current.tool, points: p ? [p] : [] },
      };
      if (gesture.paint)
        state.current.onDraft({
          ...gesture.stroke,
          points: [...gesture.stroke.points],
        });
    };
    const move = (e) => {
      if (!gesture || gesture.id !== e.pointerId) return;
      if (gesture.paint) {
        const p = point(e);
        if (p && gesture.stroke.points.length < 512) {
          const prev = gesture.stroke.points.at(-1);
          if (prev && Math.abs(prev.x - p.x) > 0.5) {
            if (gesture.stroke.points.length)
              state.current.onStroke(gesture.stroke);
            gesture.stroke = { ...state.current.tool, points: [p] };
          } else gesture.stroke.points.push(p);
        }
      } else {
        goal.current.yaw -= (e.clientX - gesture.x) * 0.003;
        goal.current.pitch = THREE.MathUtils.clamp(
          goal.current.pitch - (e.clientY - gesture.y) * 0.003,
          -1.3,
          1.3,
        );
      }
      if (gesture.paint)
        state.current.onDraft({
          ...gesture.stroke,
          points: [...gesture.stroke.points],
        });
      gesture.x = e.clientX;
      gesture.y = e.clientY;
    };
    const up = (e) => {
      if (!e || (gesture && e.pointerId === gesture.id))
        flight.current.held = false;
      if (!gesture || (e && e.pointerId !== gesture.id)) return;
      if (gesture.paint && gesture.stroke.points.length)
        state.current.onStroke(gesture.stroke);
      gesture = null;
      state.current.onDraft(null);
    };
    const keys = (e) => {
      if (document.activeElement !== canvas) return;
      if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        goal.current.yaw +=
          e.key === "ArrowLeft" ? 0.1 : e.key === "ArrowRight" ? -0.1 : 0;
        goal.current.pitch = THREE.MathUtils.clamp(
          goal.current.pitch +
            (e.key === "ArrowUp" ? 0.1 : e.key === "ArrowDown" ? -0.1 : 0),
          -1.3,
          1.3,
        );
      }
    };
    const blur = () => up();
    canvas.tabIndex = 0;
    canvas.setAttribute(
      "aria-label",
      "Création 360 : peindre au doigt ou regarder en glissant",
    );
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    for (const key of ["pointerup", "pointercancel", "lostpointercapture"])
      canvas.addEventListener(key, up);
    canvas.addEventListener("keydown", keys);
    window.addEventListener("blur", blur);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      for (const key of ["pointerup", "pointercancel", "lostpointercapture"])
        canvas.removeEventListener(key, up);
      canvas.removeEventListener("keydown", keys);
      window.removeEventListener("blur", blur);
    };
  }, [gl, camera]);
  useFrame((_, dt) => {
    desired.current.setFromEuler(
      viewEuler.current.set(goal.current.pitch, goal.current.yaw, 0, "YXZ"),
    );
    if (gyro && sensorReady.current && reference.current)
      desired.current
        .copy(base.current)
        .multiply(reference.current)
        .multiply(sensor.current);
    camera.quaternion.slerp(
      desired.current,
      1 - Math.exp(-Math.min(dt, 0.1) * 10),
    );
    const step = Math.min(dt, 0.05),
      f = flight.current;
    // Fly inside the painted sphere; ease back towards its centre before its edge.
    if (travel && !paused) {
      f.holdTime = f.held ? f.holdTime + step : 0;
      f.speed = THREE.MathUtils.damp(
        f.speed,
        f.held ? 0.65 + Math.min(1, f.holdTime / 2) : 0.65,
        2,
        step,
      );
      forward.current.set(0, 0, -1).applyQuaternion(camera.quaternion);
      inward.current.copy(camera.position).negate();
      const radius = camera.position.length();
      if (radius > 3.5) {
        const influence = THREE.MathUtils.smoothstep(radius, 3.5, 6.2);
        forward.current
          .lerp(inward.current.normalize(), influence * 0.9)
          .normalize();
        if (!f.held && !gyro) {
          viewEuler.current.setFromQuaternion(camera.quaternion, "YXZ");
          const targetYaw = Math.atan2(-inward.current.x, -inward.current.z);
          const delta = Math.atan2(
            Math.sin(targetYaw - goal.current.yaw),
            Math.cos(targetYaw - goal.current.yaw),
          );
          goal.current.yaw += delta * (1 - Math.exp(-step * influence * 0.8));
          goal.current.pitch = THREE.MathUtils.damp(
            goal.current.pitch,
            Math.asin(THREE.MathUtils.clamp(inward.current.y, -1, 1)),
            0.6 * influence,
            step,
          );
        }
      }
      nextPosition.current
        .copy(camera.position)
        .addScaledVector(forward.current, step * f.speed);
      nextPosition.current.clampLength(0, 6.3);
      camera.position.copy(nextPosition.current);
    } else {
      f.speed = 0;
      f.holdTime = 0;
    }
    const nextFov = THREE.MathUtils.damp(
      camera.fov,
      travel ? 82 + f.speed * 2 : 75,
      2,
      step,
    );
    if (Math.abs(camera.fov - nextFov) > 0.001) {
      camera.fov = nextFov;
      camera.updateProjectionMatrix();
    }
    gl.domElement.dataset.speed = f.speed.toFixed(3);
    gl.domElement.dataset.position = camera.position
      .toArray()
      .map((n) => n.toFixed(4))
      .join(",");
    gl.domElement.dataset.heading = camera.quaternion
      .toArray()
      .map((n) => n.toFixed(4))
      .join(",");
    gl.domElement.dataset.interaction = travel
      ? "travel"
      : paint
        ? "paint"
        : "look";
  });
  return null;
}
export default function SquiggleWorld(props) {
  return (
    <Canvas
      className="squiggle-world"
      dpr={[1, 1.4]}
      camera={{ position: [0, 0, 0.001], fov: 75, near: 0.1, far: 40 }}
      gl={{ antialias: false }}
    >
      <Painting {...props} />
      <Interaction {...props} />
    </Canvas>
  );
}
