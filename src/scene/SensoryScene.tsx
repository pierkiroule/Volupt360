import StellarField from "./StellarField.tsx";
import { audioVisualResonance } from "../audio/audioVisualResonance.ts";
import { seededRandom } from "../transduction/engine.ts";
import OrbitalPoetry from "./OrbitalPoetry.tsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { transduce } from "../transduction/engine.ts";
import { useSensoryStore } from "../store/useSensoryStore.ts";
import {
  burstVertex,
  burstFragment,
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
  const reduced = useSensoryStore((s) => s.reduced);
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
    clouds = useRef<THREE.InstancedMesh>(null),
    echoTime = useRef(0),
    lastBurst = useRef(-10),
    burstSlot = useRef(0),
    echoSlot = useRef(0);
  const focusDirection = useMemo(() => new THREE.Vector3(), []);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAudio: { value: new THREE.Vector4() },
      uEchoes: {
        value: Array.from(
          { length: 4 },
          () => new THREE.Vector4(100, 100, 100, 0),
        ),
      },
      uEchoAges: { value: new THREE.Vector4(-100, -100, -100, -100) },
      uEchoTime: { value: 0 },
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
  const bursts = useMemo(() => {
    const geometry = new THREE.BufferGeometry(),
      count = 576,
      random = seededRandom(composition.seed ^ 0x819f),
      drift = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const y = random() * 2 - 1,
        a = random() * Math.PI * 2,
        r = 0.3 + random() * 0.7,
        s = Math.sqrt(1 - y * y);
      drift.set([Math.cos(a) * s * r, y * r, Math.sin(a) * s * r], i * 3);
    }
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(count * 3), 3),
    );
    geometry.setAttribute("aDrift", new THREE.BufferAttribute(drift, 3));
    geometry.setAttribute(
      "aOrigin",
      new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    geometry.setAttribute(
      "aBorn",
      new THREE.BufferAttribute(new Float32Array(count).fill(-100), 1).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    geometry.setAttribute(
      "aStrength",
      new THREE.BufferAttribute(new Float32Array(count), 1).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    return geometry;
  }, [composition.seed]);
  useEffect(() => () => bursts.dispose(), [bursts]);
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
    bursts.setDrawRange(0, low ? 288 : 576);
    world.particles.setDrawRange(0, low ? 1000 : 2400);
    world.ribbons.setDrawRange(0, low ? 12 * 100 * 6 : Infinity);
    world.ink.setDrawRange(0, low ? 12 * 100 * 6 : Infinity);
  }, [world, low, bursts]);
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
    echoTime.current += dt;
    uniforms.uEchoTime.value = echoTime.current;
    const audio = audioVisualResonance.sample(dt),
      amount = state.sound ? (state.reduced ? 0.15 : 1) : 0;
    uniforms.uAudio.value.set(
      audio.bass * amount,
      audio.body * amount,
      audio.air * amount,
      audio.energy * amount,
    );
    for (const event of audio.events) {
      if (!state.sound) continue;
      camera.getWorldDirection(focusDirection);
      let index = (event.midi * 7 + event.id * 3) % world.matrices.length,
        best = -Infinity;
      for (let i = 0; i < world.matrices.length; i++) {
        const m = world.matrices[i].elements,
          dx = m[12] - camera.position.x,
          dy = m[13] - camera.position.y,
          dz = m[14] - camera.position.z,
          distance = Math.max(0.1, Math.hypot(dx, dy, dz));
        const facing =
          (dx * focusDirection.x +
            dy * focusDirection.y +
            dz * focusDirection.z) /
          distance;
        const score =
          facing * 0.9 -
          distance * 0.012 +
          Math.sin(i * 2.3 + event.midi * 0.5 + event.id) * 0.22;
        if (score > best) {
          best = score;
          index = i;
        }
      }
      const matrix = world.matrices[index],
        slot = echoSlot.current++ % 4;
      uniforms.uEchoes.value[slot].set(
        matrix.elements[12],
        matrix.elements[13],
        matrix.elements[14],
        event.strength * amount,
      );
      uniforms.uEchoAges.value.setComponent(slot, echoTime.current);
      if (
        !state.reduced &&
        event.kind === "melody" &&
        echoTime.current - lastBurst.current > 2.8
      ) {
        const first = (burstSlot.current++ % (low ? 3 : 6)) * 96,
          origin = bursts.getAttribute("aOrigin"),
          born = bursts.getAttribute("aBorn"),
          strength = bursts.getAttribute("aStrength");
        for (let i = first; i < first + 96; i++) {
          origin.setXYZ(
            i,
            matrix.elements[12],
            matrix.elements[13],
            matrix.elements[14],
          );
          born.setX(i, echoTime.current);
          strength.setX(i, event.strength);
        }
        origin.needsUpdate = born.needsUpdate = strength.needsUpdate = true;
        lastBurst.current = echoTime.current;
      }
    }
    gl.domElement.dataset.audioEnergy = audio.energy.toFixed(4);
    gl.domElement.dataset.pigmentReleases = String(burstSlot.current);
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
    bg.r += (0.0006 - bg.r) * f;
    bg.g += (0.001 - bg.g) * f;
    bg.b += (0.003 - bg.b) * f;
    gl.domElement.dataset.skyTime = time.current.toFixed(3);
    gl.domElement.dataset.skySeed = String(composition.seed);
    gl.domElement.dataset.worldClouds = String(low ? 28 : 44);
  });
  const encounter = (point: THREE.Vector3, delta: number) => {
    if (delta > 5 || useSensoryStore.getState().paused) return;
    audioVisualResonance.gesture(point.x / 15, 0.5 + point.y / 20);
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
      <points geometry={bursts} frustumCulled={false} visible={!reduced}>
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={burstVertex}
          fragmentShader={burstFragment}
          transparent
          depthWrite={false}
        />
      </points>
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
function PreviewOrbit() {
  const { camera } = useThree();
  const t = useRef(0);
  useFrame((_, dt) => {
    const state = useSensoryStore.getState();
    if (!state.paused && !state.reduced) t.current += Math.min(dt, 0.1) * 0.075;
    camera.position.set(Math.sin(t.current) * 46, 9, Math.cos(t.current) * 46);
    camera.lookAt(0, 0, 0);
  });
  return null;
}
export default function SensoryScene({
  onCapture,
  onFailure,
  preview = false,
}: {
  onCapture: (capture: Capture) => void;
  onFailure: () => void;
  preview?: boolean;
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
      dpr={[1, preview ? 1 : dpr]}
      camera={{
        position: preview ? [0, 9, 46] : [0, 0, 3],
        fov: preview ? 55 : 70,
        near: 0.15,
        far: 180,
      }}
      gl={{
        antialias: false,
        alpha: false,
        powerPreference: "default",
        preserveDrawingBuffer: false,
      }}
    >
      <color attach="background" args={["#02040b"]} />
      <StellarField low={low} />
      <PerformanceMonitor onDecline={reduce} onFallback={reduce}>
        <AdaptiveDpr pixelated />
        <Matter onCapture={onCapture} low={low} />
      </PerformanceMonitor>
      {preview ? (
        <PreviewOrbit />
      ) : (
        <>
          <OrbitalPoetry />
          <DroneNavigation />
        </>
      )}
      <ContextGuard onFailure={onFailure} />
    </Canvas>
  );
}
