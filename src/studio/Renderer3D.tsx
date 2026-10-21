import { useEffect, useMemo, useRef } from "react";
import { Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { AudioEngine } from "./AudioEngine";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { type Project } from "./model";
import { TransductionEngine } from "./TransductionEngine";
import { type AnimationTimeline } from "./AnimationTimeline";
import { ImmersiveCamera } from "./ImmersiveCamera";
function Content({
  project,
  depth,
  original,
  timeline,
  immersive,
  gyro,
  travel,
  recenter,
  quality,
  onCapture,
  onUnavailable,
  audioEngine,
  paused,
}: {
  project: Project;
  depth: number;
  original: boolean;
  timeline: AnimationTimeline;
  immersive: boolean;
  gyro: boolean;
  travel: boolean;
  recenter: number;
  quality: boolean;
  paused: boolean;
  audioEngine: AudioEngine | null;
  onCapture: (fn: (() => Promise<Blob>) | null) => void;
  onUnavailable: () => void;
}) {
  const { camera, gl, scene, size } = useThree();
  const wasImmersive = useRef(false);
  const orbit = useRef<OrbitControlsImpl>(null),
    forward = useMemo(() => new Vector3(), []),
    up = useMemo(() => new Vector3(), []);
  const engine = useMemo(
    () => new TransductionEngine(project, quality),
    [project.strokes, quality],
  );
  useEffect(() => () => engine.dispose(), [engine]);
  useEffect(() => {
    const returning = wasImmersive.current && !immersive;
    wasImmersive.current = immersive;
    if (immersive) return;
    if (depth < 0.001 || returning) {
      camera.position.set(
        0,
        0,
        Math.max(
          15.5,
          8 / (size.width / size.height) / Math.tan((22 * Math.PI) / 180),
        ),
      );
      camera.lookAt(0, 0, 0);
      orbit.current?.target.set(0, 0, 0);
      orbit.current?.update();
    }
    camera.updateProjectionMatrix();
  }, [camera, depth, immersive, size]);
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
    return () => onCapture(null);
  }, [onCapture, gl, scene, camera]);
  useFrame(() => {
    const time = timeline.tick(performance.now());
    engine.update(project, time, depth, original);
    forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    audioEngine?.setListener(camera.position, forward, up);
    gl.domElement.dataset.depth = depth.toFixed(3);
    gl.domElement.dataset.strokes = String(project.strokes.length);
    gl.domElement.dataset.animationTime = time.toFixed(3);
    gl.domElement.dataset.immersive = String(immersive);
  });
  return (
    <>
      <color attach="background" args={[project.background]} />
      <primitive object={engine.group} />
      {immersive ? (
        <ImmersiveCamera
          gyro={gyro}
          travel={travel}
          recenter={recenter}
          paused={!timeline.running}
          onUnavailable={onUnavailable}
        />
      ) : (
        <OrbitControls
          ref={orbit}
          enableDamping
          dampingFactor={0.08}
          enableRotate={depth > 0.01}
          minDistance={4}
          maxDistance={40}
        />
      )}
    </>
  );
}
export function Renderer3D(props: Parameters<typeof Content>[0]) {
  return (
    <Canvas
      className="studio-three"
      frameloop={props.paused ? "demand" : "always"}
      dpr={[1, props.quality ? 1 : 1.5]}
      camera={{ position: [0, 0, 18], fov: 44, near: 0.05, far: 100 }}
      gl={{ antialias: !props.quality, preserveDrawingBuffer: false }}
    >
      <Content {...props} />
    </Canvas>
  );
}
