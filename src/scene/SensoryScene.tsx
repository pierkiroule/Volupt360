import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { seededRandom, transduce } from "../transduction/engine.ts";
import { useSensoryStore } from "../store/useSensoryStore.ts";
import {
  veilVertex,
  veilFragment,
  pointVertex,
  pointFragment,
  lineVertex,
  lineFragment,
} from "../shaders/sensoryShaders.ts";
export type Capture = () => Promise<Blob>;
function ContextGuard({ onFailure }: { onFailure: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault();
      onFailure();
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, onFailure]);
  return null;
}
function Look() {
  const { camera, gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement,
      pointers = new Map<number, { x: number; y: number }>();
    let yaw = 0,
      pitch = 0,
      distance = 0;
    const orient = () => {
      camera.rotation.set(pitch, yaw, 0, "YXZ");
    };
    const down = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      canvas.setPointerCapture(e.pointerId);
      distance = 0;
    };
    const move = (e: PointerEvent) => {
      const old = pointers.get(e.pointerId);
      if (!old) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const next = Math.hypot(a.x - b.x, a.y - b.y);
        if (distance) {
          const c = camera as THREE.PerspectiveCamera;
          c.fov = THREE.MathUtils.clamp(
            c.fov + (distance - next) * 0.08,
            42,
            88,
          );
          c.updateProjectionMatrix();
        }
        distance = next;
      } else {
        yaw -= (e.clientX - old.x) * 0.003;
        pitch = THREE.MathUtils.clamp(
          pitch - (e.clientY - old.y) * 0.003,
          -1.25,
          1.25,
        );
        orient();
      }
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      distance = 0;
    };
    const key = (e: KeyboardEvent) => {
      if (document.activeElement !== canvas) return;
      const keys = [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "+",
        "-",
      ];
      if (!keys.includes(e.key)) return;
      e.preventDefault();
      yaw += e.key === "ArrowLeft" ? 0.06 : e.key === "ArrowRight" ? -0.06 : 0;
      pitch = THREE.MathUtils.clamp(
        pitch +
          (e.key === "ArrowUp" ? 0.06 : e.key === "ArrowDown" ? -0.06 : 0),
        -1.25,
        1.25,
      );
      orient();
      if (e.key === "+" || e.key === "-") {
        const c = camera as THREE.PerspectiveCamera;
        c.fov = THREE.MathUtils.clamp(c.fov + (e.key === "+" ? -3 : 3), 42, 88);
        c.updateProjectionMatrix();
      }
    };
    canvas.tabIndex = 0;
    canvas.setAttribute(
      "aria-label",
      "Ciel sensoriel : glisser ou utiliser les flèches pour regarder, pincer ou + et − pour la profondeur",
    );
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("lostpointercapture", up);
    canvas.addEventListener("keydown", key);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("lostpointercapture", up);
      canvas.removeEventListener("keydown", key);
    };
  }, [camera, gl]);
  return null;
}
function Matter({
  onCapture,
  low,
}: {
  onCapture: (capture: Capture) => void;
  low: boolean;
}) {
  const composition = useSensoryStore((s) => s.composition),
    target = useMemo(() => transduce(composition), [composition]);
  const targetRef = useRef(target);
  targetRef.current = target;
  const colors = useMemo(
    () =>
      target.palette.map((c) =>
        new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace),
      ),
    [target],
  );
  const { gl, scene, camera } = useThree();
  const time = useRef(0),
    mesh = useRef<THREE.InstancedMesh>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uA: {
        value: new THREE.Vector4(
          ...(target.axes.slice(0, 4) as [number, number, number, number]),
        ),
      },
      uB: {
        value: new THREE.Vector4(
          ...(target.axes.slice(4, 8) as [number, number, number, number]),
        ),
      },
      uColor0: { value: colors[0].clone() },
      uColor1: { value: colors[1].clone() },
      uColor2: { value: colors[2].clone() },
      uSoftness: { value: target.softness },
      uStretch: { value: target.stretch },
      uDensity: { value: target.density },
      uTouch: { value: new THREE.Vector3(100, 100, 100) },
      uTouchTime: { value: -100 },
    }),
    [],
  );
  const assets = useMemo(() => {
    const r = seededRandom(composition.seed),
      count = 1600,
      points = new Float32Array(count * 3),
      seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const z = r() * 2 - 1,
        a = r() * Math.PI * 2,
        radius = 3 + r() * 11,
        s = Math.sqrt(1 - z * z);
      points.set(
        [Math.cos(a) * s * radius, z * radius * 0.7, Math.sin(a) * s * radius],
        i * 3,
      );
      seeds[i] = r();
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(points, 3));
    pg.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    const lines: number[] = [];
    for (let j = 0; j < 22; j++) {
      const a = r() * Math.PI * 2,
        rad = 3 + r() * 7,
        y = (r() - 0.5) * 8;
      for (let i = 0; i < 40; i++) {
        for (const k of [i, i + 1]) {
          const t = k / 40;
          lines.push(
            Math.cos(a + t * 1.8) * rad,
            y + Math.sin(t * 5 + j) * 0.5,
            Math.sin(a + t * 1.8) * rad,
          );
        }
      }
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.Float32BufferAttribute(lines, 3));
    const matrices: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      dummy.position.set(
        Math.sin(a) * (5 + r() * 4),
        (r() - 0.5) * 9,
        Math.cos(a) * (5 + r() * 4),
      );
      dummy.rotation.set((r() - 0.5) * 1.5, a + (r() - 0.5), r() * Math.PI);
      dummy.scale.set(3 + r() * 5, 1.8 + r() * 3, 1);
      if (i < 7) {
        dummy.position.set(
          (i - 3) * 1.1,
          Math.sin(i * 0.8) * 1.4,
          -5 - i * 0.45,
        );
        dummy.rotation.set(0.1, (i - 3) * 0.12, Math.sin(i * 0.7) * 0.65);
        dummy.scale.set(7 + r() * 3, 2 + r() * 1.5, 1);
      }
      dummy.updateMatrix();
      matrices.push(dummy.matrix.clone());
    }
    return { pg, lg, matrices };
  }, [composition.seed]);
  useEffect(() => {
    assets.matrices.forEach((m, i) => mesh.current?.setMatrixAt(i, m));
    if (mesh.current) mesh.current.instanceMatrix.needsUpdate = true;
    return () => {
      assets.pg.dispose();
      assets.lg.dispose();
    };
  }, [assets]);
  useEffect(() => {
    assets.pg.setDrawRange(0, low ? 800 : 1600);
  }, [assets, low]);
  useEffect(() => {
    onCapture(
      () =>
        new Promise((resolve, reject) => {
          gl.render(scene, camera);
          gl.domElement.toBlob(
            (b) => (b ? resolve(b) : reject(Error("Capture indisponible."))),
            "image/png",
          );
        }),
    );
  }, [gl, scene, camera, onCapture]);
  useFrame((_, dt) => {
    const state = useSensoryStore.getState();
    if (state.paused) return;
    const p = targetRef.current,
      f = 1 - Math.exp(-Math.min(dt, 0.25) * 1.7);
    if (!state.paused)
      time.current += Math.min(dt, 0.1) * p.speed * (state.reduced ? 0.08 : 1);
    uniforms.uTime.value = time.current;
    for (let i = 0; i < 4; i++) {
      uniforms.uA.value.setComponent(
        i,
        THREE.MathUtils.lerp(uniforms.uA.value.getComponent(i), p.axes[i], f),
      );
      uniforms.uB.value.setComponent(
        i,
        THREE.MathUtils.lerp(
          uniforms.uB.value.getComponent(i),
          p.axes[i + 4],
          f,
        ),
      );
    }
    [uniforms.uColor0, uniforms.uColor1, uniforms.uColor2].forEach((u, i) => {
      u.value.lerp(colors[i], f);
    });
    uniforms.uSoftness.value += (p.softness - uniforms.uSoftness.value) * f;
    uniforms.uStretch.value += (p.stretch - uniforms.uStretch.value) * f;
    uniforms.uDensity.value += (p.density - uniforms.uDensity.value) * f;
    const background = scene.background as THREE.Color;
    background.r += (colors[0].r * 0.025 + 0.002 - background.r) * f;
    background.g += (colors[0].g * 0.025 + 0.002 - background.g) * f;
    background.b += (colors[0].b * 0.025 + 0.005 - background.b) * f;
    gl.domElement.dataset.skyTime = time.current.toFixed(3);
    gl.domElement.dataset.skySeed = String(composition.seed);
  });
  return (
    <>
      <instancedMesh
        ref={mesh}
        args={[undefined, undefined, 24]}
        count={low ? 16 : 24}
        frustumCulled={false}
        onClick={(e) => {
          if (e.delta > 5 || useSensoryStore.getState().paused) return;
          uniforms.uTouch.value.copy(e.point);
          uniforms.uTouchTime.value = time.current;
        }}
      >
        <planeGeometry args={[1, 1, 32, 20]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={veilVertex}
          fragmentShader={veilFragment}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
      <points geometry={assets.pg} frustumCulled={false}>
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={pointVertex}
          fragmentShader={pointFragment}
          transparent
          depthWrite={false}
        />
      </points>
      <lineSegments geometry={assets.lg} frustumCulled={false} visible={!low}>
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={lineVertex}
          fragmentShader={lineFragment}
          transparent
          depthWrite={false}
        />
      </lineSegments>
    </>
  );
}
export default function SensoryScene({
  onCapture,
  onFailure,
}: {
  onCapture: (capture: Capture) => void;
  onFailure: () => void;
}) {
  const [low, setLow] = useState(false),
    [dpr, setDpr] = useState(1.5);
  return (
    <Canvas
      className="sensory-canvas"
      dpr={[1, dpr]}
      camera={{ position: [0, 0, 0.5], fov: 65, near: 0.1, far: 55 }}
      gl={{
        antialias: false,
        alpha: false,
        powerPreference: "default",
        preserveDrawingBuffer: false,
      }}
      onCreated={({ gl }) => {
        gl.setClearColor("#101b2c");
      }}
    >
      <color attach="background" args={["#101b2c"]} />
      <PerformanceMonitor
        onDecline={() => {
          if (!useSensoryStore.getState().paused) {
            setLow(true);
            setDpr(1);
          }
        }}
        onFallback={() => {
          if (!useSensoryStore.getState().paused) {
            setLow(true);
            setDpr(1);
          }
        }}
      >
        <AdaptiveDpr pixelated />
        <Matter onCapture={onCapture} low={low} />
      </PerformanceMonitor>
      <Look />
      <ContextGuard onFailure={onFailure} />
    </Canvas>
  );
}
