import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { transduce } from "../transduction/engine.ts";
import { useSensoryStore } from "../store/useSensoryStore.ts";
import {
  cloudVertex,
  cloudFragment,
  ribbonVertex,
  ribbonFragment,
  inkFragment,
  pointVertex,
  pointFragment,
} from "../shaders/sensoryShaders.ts";
import { createSensoryWorld } from "./sensoryWorld.ts";
import DroneNavigation from "./DroneNavigation.tsx";
export type Capture = () => Promise<Blob>;
function ContextGuard({ onFailure }: { onFailure: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const lost = (e: Event) => {
      e.preventDefault();
      onFailure();
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, onFailure]);
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
    p = useMemo(() => transduce(composition), [composition]);
  const colors = useMemo(
    () =>
      p.palette.map((c) =>
        new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace),
      ),
    [p],
  );
  const { gl, scene, camera } = useThree(),
    time = useRef(0),
    clouds = useRef<THREE.InstancedMesh>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResonance: { value: p.coupling },
      uA: {
        value: new THREE.Vector4(
          ...(p.axes.slice(0, 4) as [number, number, number, number]),
        ),
      },
      uB: {
        value: new THREE.Vector4(
          ...(p.axes.slice(4, 8) as [number, number, number, number]),
        ),
      },
      uColor0: { value: colors[0].clone() },
      uColor1: { value: colors[1].clone() },
      uColor2: { value: colors[2].clone() },
      uSoftness: { value: p.softness },
      uStretch: { value: p.stretch },
      uDensity: { value: p.density },
      uTouch: { value: new THREE.Vector3(100, 100, 100) },
      uTouchTime: { value: -100 },
    }),
    [],
  );
  const world = useMemo(
    () => createSensoryWorld(composition.seed),
    [composition.seed],
  );
  useEffect(() => {
    world.matrices.forEach((m, i) => clouds.current?.setMatrixAt(i, m));
    if (clouds.current) clouds.current.instanceMatrix.needsUpdate = true;
    return () => {
      world.ribbons.dispose();
      world.ink.dispose();
      world.particles.dispose();
    };
  }, [world]);
  useEffect(() => {
    world.particles.setDrawRange(0, low ? 1000 : 2400);
    world.ribbons.setDrawRange(0, low ? 12 * 100 * 6 : Infinity);
    world.ink.setDrawRange(0, low ? 12 * 100 * 6 : Infinity);
  }, [world, low]);
  useEffect(
    () =>
      onCapture(
        () =>
          new Promise((resolve, reject) => {
            gl.render(scene, camera);
            gl.domElement.toBlob(
              (b) => (b ? resolve(b) : reject(Error("Capture indisponible."))),
              "image/png",
            );
          }),
      ),
    [gl, scene, camera, onCapture],
  );
  useFrame((_, delta) => {
    const state = useSensoryStore.getState();
    if (state.paused) return;
    const dt = Math.min(delta, 0.1),
      f = 1 - Math.exp(-dt * 2);
    time.current += dt * (0.5 + p.speed * 2) * (state.reduced ? 0.07 : 1);
    uniforms.uTime.value = time.current;
    uniforms.uResonance.value += (p.coupling - uniforms.uResonance.value) * f;
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
    uniforms.uColor0.value.lerp(colors[0], f);
    uniforms.uColor1.value.lerp(colors[1], f);
    uniforms.uColor2.value.lerp(colors[2], f);
    uniforms.uSoftness.value += (p.softness - uniforms.uSoftness.value) * f;
    uniforms.uStretch.value += (p.stretch - uniforms.uStretch.value) * f;
    uniforms.uDensity.value += (p.density - uniforms.uDensity.value) * f;
    const bg = scene.background as THREE.Color;
    bg.r += (colors[0].r * 0.014 + 0.008 - bg.r) * f;
    bg.g += (colors[0].g * 0.014 + 0.012 - bg.g) * f;
    bg.b += (colors[0].b * 0.014 + 0.027 - bg.b) * f;
    gl.domElement.dataset.skyTime = time.current.toFixed(3);
    gl.domElement.dataset.skySeed = String(composition.seed);
    gl.domElement.dataset.worldClouds = String(low ? 28 : 44);
  });
  const encounter = (point: THREE.Vector3, delta: number) => {
    if (delta > 5 || useSensoryStore.getState().paused) return;
    uniforms.uTouch.value.copy(point);
    uniforms.uTouchTime.value = time.current;
  };
  return (
    <>
      <instancedMesh
        ref={clouds}
        args={[undefined, undefined, 44]}
        count={low ? 28 : 44}
        frustumCulled={false}
        onClick={(e) => encounter(e.point, e.delta)}
      >
        <icosahedronGeometry args={[1, 3]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={cloudVertex}
          fragmentShader={cloudFragment}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
      <mesh
        geometry={world.ribbons}
        frustumCulled={false}
        onClick={(e) => encounter(e.point, e.delta)}
      >
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={ribbonVertex}
          fragmentShader={ribbonFragment}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={world.ink} frustumCulled={false}>
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={ribbonVertex}
          fragmentShader={inkFragment}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <points geometry={world.particles} frustumCulled={false}>
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={pointVertex}
          fragmentShader={pointFragment}
          transparent
          depthWrite={false}
        />
      </points>
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
  const reduce = () => {
    if (!useSensoryStore.getState().paused) {
      setLow(true);
      setDpr(1);
    }
  };
  return (
    <Canvas
      className="sensory-canvas"
      dpr={[1, dpr]}
      camera={{ position: [0, 0, 3], fov: 70, near: 0.15, far: 85 }}
      gl={{
        antialias: false,
        alpha: false,
        powerPreference: "default",
        preserveDrawingBuffer: false,
      }}
    >
      <color attach="background" args={["#151b31"]} />
      <PerformanceMonitor onDecline={reduce} onFallback={reduce}>
        <AdaptiveDpr pixelated />
        <Matter onCapture={onCapture} low={low} />
      </PerformanceMonitor>
      <DroneNavigation />
      <ContextGuard onFailure={onFailure} />
    </Canvas>
  );
}
