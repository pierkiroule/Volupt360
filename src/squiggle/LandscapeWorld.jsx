import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import WatercolorPaper from "./WatercolorPaper.jsx";
import { createLandscape, LAND_RADIUS } from "./landscapeModel.js";
import { deviceQuaternion } from "../scene/gyroOrientation.ts";

function Navigator({
  land,
  travel,
  gyro,
  recenter,
  onGyroUnavailable,
  paused,
}) {
  const { camera, gl } = useThree();
  const state = useRef({ yaw: 0, pitch: -0.18, held: null, last: 0 });
  const sensor = useRef(new THREE.Quaternion()),
    reference = useRef(null),
    base = useRef(new THREE.Quaternion());
  const desired = useMemo(() => new THREE.Quaternion(), []),
    euler = useMemo(() => new THREE.Euler(0, 0, 0, "YXZ"), []);
  const forward = useMemo(() => new THREE.Vector3(), []),
    inward = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    camera.position.set(0, land.heightAt(0, 8) + 3.5, 8);
    camera.lookAt(0, land.heightAt(0, 0), 0);
    euler.setFromQuaternion(camera.quaternion, "YXZ");
    state.current.yaw = euler.y;
    state.current.pitch = euler.x;
  }, [camera]);
  useEffect(() => {
    const canvas = gl.domElement;
    const s = state.current;
    const down = (e) => {
      if (!e.isPrimary || e.button > 0) return;
      canvas.setPointerCapture(e.pointerId);
      s.held = { id: e.pointerId, x: e.clientX, y: e.clientY };
    };
    const move = (e) => {
      if (s.held?.id !== e.pointerId) return;
      s.yaw -= (e.clientX - s.held.x) * 0.003;
      s.pitch = THREE.MathUtils.clamp(
        s.pitch - (e.clientY - s.held.y) * 0.003,
        -1.1,
        1.1,
      );
      s.held = { id: e.pointerId, x: e.clientX, y: e.clientY };
      s.last = performance.now();
    };
    const end = () => {
      s.held = null;
    };
    const keys = (e) => {
      if (!e.key.startsWith("Arrow")) return;
      e.preventDefault();
      s.yaw += e.key === "ArrowLeft" ? 0.1 : e.key === "ArrowRight" ? -0.1 : 0;
      s.pitch = THREE.MathUtils.clamp(
        s.pitch +
          (e.key === "ArrowUp" ? 0.08 : e.key === "ArrowDown" ? -0.08 : 0),
        -1.1,
        1.1,
      );
      s.last = performance.now();
    };
    canvas.tabIndex = 0;
    canvas.setAttribute(
      "aria-label",
      "Paysage 360 : glisser pour regarder, flèches pour orienter",
    );
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("keydown", keys);
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
      canvas.addEventListener(name, end);
    window.addEventListener("blur", end);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("keydown", keys);
      for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
        canvas.removeEventListener(name, end);
      window.removeEventListener("blur", end);
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
    let sensorSource = "";
    const sample = (e) => {
      if (sensorSource && sensorSource !== e.type) return;
      if (
        [e.alpha, e.beta, e.gamma].some(
          (v) => v === null || !Number.isFinite(v),
        )
      )
        return;
      sensorSource = e.type;
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
      }
    };
    window.addEventListener("deviceorientation", sample);
    window.addEventListener("deviceorientationabsolute", sample);
    const timeout = setTimeout(() => {
      if (!reference.current) onGyroUnavailable?.();
    }, 6000);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("deviceorientation", sample);
      window.removeEventListener("deviceorientationabsolute", sample);
    };
  }, [gyro, recenter, camera]);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05),
      s = state.current;
    desired.setFromEuler(euler.set(s.pitch, s.yaw, 0, "YXZ"));
    if (gyro && reference.current)
      desired
        .copy(base.current)
        .multiply(reference.current)
        .multiply(sensor.current);
    camera.quaternion.slerp(desired, 1 - Math.exp(-dt * 7));
    if (travel && !paused) {
      forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
      forward.y = 0;
      forward.normalize();
      const radius = Math.hypot(camera.position.x, camera.position.z);
      if (radius > 8) {
        inward.set(-camera.position.x, 0, -camera.position.z).normalize();
        const pull = THREE.MathUtils.smoothstep(radius, 8, 12.5);
        forward.lerp(inward, pull * 0.95).normalize();
        if (!gyro && !s.held && performance.now() - s.last > 2000) {
          const target = Math.atan2(-forward.x, -forward.z);
          const diff = Math.atan2(
            Math.sin(target - s.yaw),
            Math.cos(target - s.yaw),
          );
          s.yaw += diff * (1 - Math.exp(-dt * 0.8));
        }
      }
      camera.position.addScaledVector(forward, dt * 1.0);
      const r = Math.hypot(camera.position.x, camera.position.z);
      if (r > 12.5) {
        camera.position.x *= 12.5 / r;
        camera.position.z *= 12.5 / r;
      }
      const floor = land.heightAt(camera.position.x, camera.position.z) + 2.2;
      camera.position.y = Math.max(
        land.heightAt(camera.position.x, camera.position.z) + 0.8,
        THREE.MathUtils.damp(
          camera.position.y,
          floor + 0.25 * Math.sin(_.clock.elapsedTime * 0.18),
          2,
          dt,
        ),
      );
    }
    gl.domElement.dataset.heading = camera.quaternion
      .toArray()
      .map((v) => v.toFixed(4))
      .join(",");
    gl.domElement.dataset.position = camera.position
      .toArray()
      .map((v) => v.toFixed(3))
      .join(",");
    gl.domElement.dataset.interaction = travel ? "travel" : "look";
  });
  return null;
}
function Terrain({
  strokes,
  draft,
  materials,
  editor,
  tool,
  onDraft,
  onStroke,
  onCapture,
  ...props
}) {
  const { camera, gl, scene, size } = useThree();
  const held = useRef(null),
    heldPointer = useRef(null),
    mesh = useRef(),
    lastPublish = useRef(0),
    shader = useRef(null),
    clock = useRef(0);
  const land = useMemo(
    () =>
      createLandscape(
        draft ? [...strokes, draft] : strokes,
        materials,
        innerWidth < 600,
      ),
    [strokes, draft, materials],
  );
  useEffect(() => () => land.dispose(), [land]);
  useEffect(() => {
    if (!editor) return;
    camera.position.set(0, 35, 0.001);
    camera.lookAt(0, 0, 0);
    camera.zoom = Math.min(size.width, size.height) / (LAND_RADIUS * 2);
    camera.updateProjectionMatrix();
  }, [editor, camera, size]);
  useEffect(() => {
    onCapture?.(
      () =>
        new Promise((resolve, reject) => {
          gl.render(scene, camera);
          gl.domElement.toBlob((b) =>
            b ? resolve(b) : reject(Error("Capture indisponible.")),
          );
        }),
    );
    return () => onCapture?.(null);
  }, [onCapture, gl, scene, camera]);
  const finish = (event) => {
    if (
      !held.current ||
      (event?.pointerId != null && event.pointerId !== heldPointer.current)
    )
      return;
    const stroke = held.current;
    held.current = null;
    heldPointer.current = null;
    if (stroke.points.length) onStroke(stroke);
    onDraft(null);
  };
  useEffect(() => {
    window.addEventListener("blur", finish);
    return () => window.removeEventListener("blur", finish);
  }, [onStroke, onDraft]);
  const append = (e) => {
    const p = { x: e.point.x, z: e.point.z };
    if (Math.hypot(p.x, p.z) > LAND_RADIUS * 0.97) return;
    const points = held.current.points,
      last = points.at(-1);
    if (!last || Math.hypot(last.x - p.x, last.z - p.z) > 0.12) points.push(p);
    if (points.length >= 300) {
      finish();
      return;
    }
    if (performance.now() - lastPublish.current > 85) {
      onDraft({ ...held.current, points: [...points] });
      lastPublish.current = performance.now();
    }
  };
  useFrame((_, dt) => {
    if (!props.paused) clock.current += Math.min(dt, 0.1);
    if (shader.current) {
      shader.current.uniforms.landTime.value = clock.current;
      shader.current.uniforms.landEnergy.value =
        props.audioRef?.current?.getFeatures().energy || 0;
    }
    gl.domElement.dataset.landscapeStrokes = String(strokes.length);
    gl.domElement.dataset.landscapeMode = editor ? "disk" : "360";
  });
  return (
    <>
      <color attach="background" args={["#f3ecdc"]} />
      <WatercolorPaper />
      <ambientLight intensity={1.6} />
      <directionalLight
        position={[-9, 18, 6]}
        intensity={2.1}
        color="#fff1d7"
      />
      <hemisphereLight args={["#d9e9e3", "#ad9278", 0.8]} />
      <mesh
        ref={mesh}
        geometry={land.geometry}
        onPointerDown={
          editor
            ? (e) => {
                if (e.button > 0 || e.isPrimary === false || held.current)
                  return;
                e.stopPropagation();
                e.target.setPointerCapture(e.pointerId);
                heldPointer.current = e.pointerId;
                held.current = { ...tool, id: Date.now(), points: [] };
                append(e);
              }
            : undefined
        }
        onPointerMove={
          editor
            ? (e) => {
                if (held.current && heldPointer.current === e.pointerId) {
                  e.stopPropagation();
                  append(e);
                }
              }
            : undefined
        }
        onPointerUp={editor ? finish : undefined}
        onPointerCancel={editor ? finish : undefined}
      >
        <meshStandardMaterial
          map={land.texture}
          roughness={1}
          metalness={0}
          side={THREE.DoubleSide}
          onBeforeCompile={(s) => {
            s.uniforms.landTime = { value: 0 };
            s.uniforms.landEnergy = { value: 0 };
            s.vertexShader = "varying vec2 landXZ;\n" + s.vertexShader;
            s.vertexShader = s.vertexShader.replace(
              "#include <begin_vertex>",
              "#include <begin_vertex>\nlandXZ=position.xz;",
            );
            s.fragmentShader =
              "uniform float landTime,landEnergy;varying vec2 landXZ;\n" +
              s.fragmentShader;
            s.fragmentShader = s.fragmentShader.replace(
              "#include <map_fragment>",
              THREE.ShaderChunk.map_fragment +
                "\nfloat wash=.5+.5*sin(landXZ.x*2.+landXZ.y*1.4+landTime*.35);\ndiffuseColor.rgb*=1.-wash*(.035+landEnergy*.05);\nfloat aqua=smoothstep(.035,.16,diffuseColor.g-diffuseColor.r);\nfloat ripple=pow(max(0.,sin(landXZ.x*9.+landXZ.y*14.-landTime*.8)),16.);\ndiffuseColor.rgb+=aqua*ripple*vec3(.025,.045,.05);",
            );
            shader.current = s;
          }}
        />
      </mesh>
      {!editor && <Navigator land={land} {...props} />}
    </>
  );
}
export default function LandscapeWorld(props) {
  return (
    <Canvas
      key={props.editor ? "disk" : "world"}
      orthographic={props.editor}
      dpr={[1, 1.4]}
      camera={
        props.editor
          ? { position: [0, 35, 0.001], near: 0.1, far: 100, zoom: 12 }
          : { position: [0, 4, 8], near: 0.1, far: 100, fov: 78 }
      }
      gl={{ antialias: true }}
    >
      <Terrain {...props} />
    </Canvas>
  );
}
