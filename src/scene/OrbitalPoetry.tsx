import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSensoryStore } from "../store/useSensoryStore.ts";
import { poetryFor } from "../data/orbitalPoetry.ts";
import { seededRandom } from "../transduction/engine.ts";
import { audioVisualResonance } from "../audio/audioVisualResonance.ts";
/** Two reusable ink cards, created locally without a font service or DOM overlay. */
export default function OrbitalPoetry() {
  const composition = useSensoryStore((s) => s.composition),
    { camera, gl } = useThree(),
    meshes = useRef<(THREE.Mesh | null)[]>([]),
    elapsed = useRef(0),
    next = useRef(5),
    cursor = useRef(0),
    lastEvent = useRef(0);
  const pool = useMemo(() => {
    const words = poetryFor(composition.words.map((w) => w.id)),
      random = seededRandom(composition.seed ^ 0x57ac);
    for (let i = words.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [words[i], words[j]] = [words[j], words[i]];
    }
    return words;
  }, [composition]);
  const assets = useMemo(() => {
    const random = seededRandom(composition.seed ^ 0x31f7);
    return Array.from({ length: 2 }, () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 256;
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return {
        canvas,
        texture,
        born: -100,
        base: new THREE.Vector3(),
        phase: random() * 6,
      };
    });
  }, [composition.seed]);
  const forward = useMemo(() => new THREE.Vector3(), []),
    offset = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    elapsed.current = 0;
    next.current = 5;
    cursor.current = 0;
    return () => assets.forEach((a) => a.texture.dispose());
  }, [assets]);
  useFrame((_, delta) => {
    const state = useSensoryStore.getState();
    if (state.paused) return;
    const dt = Math.min(delta, 0.1);
    elapsed.current += dt;
    const event = audioVisualResonance.state.last,
      now = elapsed.current;
    if (event && event.id !== lastEvent.current) {
      lastEvent.current = event.id;
      if (event.kind === "melody")
        next.current = Math.min(next.current, now + 1);
    }
    if (state.poetry && now >= next.current) {
      const slot = cursor.current % 2,
        item = assets[slot],
        ctx = item.canvas.getContext("2d")!,
        text = pool[cursor.current % pool.length];
      ctx.clearRect(0, 0, 1024, 256);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `italic ${text.length > 28 ? 52 : 80}px Georgia, serif`;
      ctx.shadowColor = "rgba(11,18,31,.9)";
      ctx.shadowBlur = 9;
      ctx.fillStyle = "rgba(244,238,221,.94)";
      ctx.fillText(text, 512, 128, 960);
      item.texture.needsUpdate = true;
      forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
      const perspective = camera as THREE.PerspectiveCamera;
      const viewWidth =
        15 *
        Math.tan(THREE.MathUtils.degToRad(perspective.fov / 2)) *
        perspective.aspect;
      offset
        .set(
          (slot === 0 ? -1 : 1) * Math.min(2.4, viewWidth * 0.09),
          ((cursor.current % 3) - 1) * 0.75,
          0,
        )
        .applyQuaternion(camera.quaternion);
      item.base.copy(camera.position).addScaledVector(forward, 7.5).add(offset);
      item.born = now;
      cursor.current++;
      next.current = now + 10;
    }
    let visibleCount = 0;
    for (let i = 0; i < 2; i++) {
      const mesh = meshes.current[i];
      if (!mesh) continue;
      const item = assets[i],
        age = now - item.born,
        fade =
          Math.min(1, Math.max(0, age / 2)) *
          Math.min(1, Math.max(0, (15 - age) / 3));
      mesh.visible = state.poetry && fade > 0;
      if (mesh.visible) visibleCount++;
      const c = camera as THREE.PerspectiveCamera;
      const width =
        15 * Math.tan(THREE.MathUtils.degToRad(c.fov / 2)) * c.aspect;
      mesh.scale.setScalar(Math.min(1, (width * 0.74) / 5.4));
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = fade * 0.72;
      mesh.position.copy(item.base);
      if (!state.reduced) {
        mesh.position.y += Math.sin(age * 0.18 + item.phase) * 0.22;
        mesh.position.x += Math.sin(age * 0.13) * 0.18;
      }
      mesh.quaternion.copy(camera.quaternion);
    }
    gl.domElement.dataset.poetryCount = String(visibleCount);
  });
  return (
    <group>
      {assets.map((a, i) => (
        <mesh
          key={i}
          ref={(m) => {
            meshes.current[i] = m;
          }}
          visible={false}
          renderOrder={5}
        >
          <planeGeometry args={[5.4, 1.35]} />
          <meshBasicMaterial
            map={a.texture}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
