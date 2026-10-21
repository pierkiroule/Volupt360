import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { BubbleField } from "./BubbleField";
import { INGREDIENTS, resourceWorld, type Resource } from "./resources";
import { deviceQuaternion } from "../scene/gyroOrientation";
export interface FlightInput {
  x: number;
  y: number;
  active: boolean;
  gyro: THREE.Quaternion | null;
}
interface Props {
  choices: string[];
  inside: boolean;
  paused: boolean;
  visited: Set<string>;
  input: React.RefObject<FlightInput>;
  onEncounter: (r: Resource) => void;
}
function World({
  choices,
  inside,
  paused,
  visited,
  input,
  onEncounter,
}: Props) {
  const { camera, gl } = useThree();
  const bird = useRef<THREE.Group>(null),
    left = useRef<THREE.Mesh>(null),
    right = useRef<THREE.Mesh>(null);
  const [field, setField] = useState<BubbleField | null>(null);
  useEffect(() => {
    const next = new BubbleField(
      resourceWorld(choices),
      INGREDIENTS.filter((i) => choices.includes(i.emoji)),
      innerWidth < 700,
    );
    setField(next);
    return () => next.dispose();
  }, [choices]);
  const state = useRef({
    time: 0,
    cooldown: 0,
    yaw: 0,
    pitch: 0,
    idle: 0,
    previous: new THREE.Vector3(),
    target: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    quaternion: new THREE.Quaternion(),
    matrix: new THREE.Matrix4(),
    euler: new THREE.Euler(),
    up: new THREE.Vector3(0, 1, 0),
  });

  useEffect(() => {
    camera.position.set(0, 0, inside ? 0 : 21);
    camera.quaternion.identity();
    state.current.yaw = state.current.pitch = 0;
    state.current.previous.copy(camera.position);
  }, [inside, camera]);
  const wing = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(-0.08, 0.13, -0.35, 0.2, -0.52, 0.06);
    shape.bezierCurveTo(-0.29, -0.04, -0.1, -0.025, 0, 0);
    return new THREE.ShapeGeometry(shape);
  }, []);
  useEffect(() => () => wing.dispose(), [wing]);
  useFrame((_, raw) => {
    if (!field) return;
    const dt = Math.min(raw, 0.05),
      s = state.current;
    s.time += dt;
    field.update(s.time, camera, dt);
    for (const e of field.entries) e.visited = visited.has(e.id);
    gl.domElement.dataset.bubbles = String(field.entries.length);
    gl.domElement.dataset.position = camera.position
      .toArray()
      .map((n) => n.toFixed(3))
      .join(",");
    if (!inside) {
      camera.lookAt(0, 0, 0);
      return;
    }
    if (bird.current) {
      bird.current.position.copy(camera.position);
      bird.current.quaternion.copy(camera.quaternion);
      bird.current.translateZ(-1.25);
      bird.current.translateY(-0.18);
      bird.current.rotation.z += Math.sin(s.time * 1.3) * 0.06;
    }
    if (left.current && right.current) {
      left.current.rotation.y = Math.sin(s.time * 16) * 0.55;
      right.current.rotation.y = -Math.sin(s.time * 16) * 0.55;
    }
    if (paused) return;
    s.cooldown = Math.max(0, s.cooldown - dt);
    s.previous.copy(camera.position);
    const controls = input.current;
    if (controls.active) {
      s.idle = 0;
      s.yaw -= controls.x * dt * 1.25;
      s.pitch = THREE.MathUtils.clamp(
        s.pitch - controls.y * dt * 0.85,
        -0.9,
        0.9,
      );
      s.quaternion.setFromEuler(s.euler.set(s.pitch, s.yaw, 0, "YXZ"));
      camera.quaternion.slerp(s.quaternion, 1 - Math.exp(-dt * 6));
    } else if (controls.gyro) {
      camera.quaternion.slerp(controls.gyro, 1 - Math.exp(-dt * 5));
      const e = s.euler.setFromQuaternion(camera.quaternion, "YXZ");
      s.yaw = e.y;
      s.pitch = e.x;
    } else {
      s.idle += dt;
      if (s.idle > 1.4) {
        let nearest = Infinity;
        let found = false;
        for (const e of field.entries) {
          const distance = e.position.distanceToSquared(camera.position);
          if (!visited.has(e.id) && distance < nearest) {
            nearest = distance;
            s.target.copy(e.position);
            found = true;
          }
        }
        if (!found)
          s.target.set(
            Math.sin(s.time * 0.08) * 3,
            Math.sin(s.time * 0.12),
            Math.cos(s.time * 0.08) * 3,
          );
        const matrix = s.matrix.lookAt(camera.position, s.target, s.up);
        s.quaternion.setFromRotationMatrix(matrix);
        camera.quaternion.slerp(s.quaternion, 1 - Math.exp(-dt * 0.65));
        const e = s.euler.setFromQuaternion(camera.quaternion, "YXZ");
        s.yaw = e.y;
        s.pitch = e.x;
      }
    }
    camera.getWorldDirection(s.direction);
    if (camera.position.length() > 11) {
      s.target.copy(camera.position).multiplyScalar(-1).normalize();
      s.direction.lerp(s.target, 0.04).normalize();
    }
    camera.position.addScaledVector(
      s.direction,
      dt * (controls.active ? 0.95 : 0.65),
    );
    for (const e of field.entries) {
      const segment = s.target.copy(camera.position).sub(s.previous);
      const length = segment.lengthSq();
      const t = length
        ? THREE.MathUtils.clamp(
            s.direction.copy(e.position).sub(s.previous).dot(segment) / length,
            0,
            1,
          )
        : 0;
      const distance = s.direction
        .copy(s.previous)
        .addScaledVector(segment, t)
        .distanceTo(e.position);
      if (distance > e.radius + 1) e.armed = true;
      if (
        e.armed &&
        !visited.has(e.id) &&
        distance < e.radius + 0.22 &&
        s.cooldown === 0
      ) {
        e.armed = false;
        s.cooldown = 4;
        onEncounter(e.resource);
        break;
      }
    }
  });
  return (
    <>
      <color attach="background" args={["#f4f0e6"]} />
      <fog attach="fog" args={["#f4f0e6", 14, 32]} />
      {field && (
        <primitive
          object={field.group}
          onClick={(event: any) => {
            if (!inside || paused) return;
            event.stopPropagation();
            const e = field.entries.find((e) => e.mesh === event.object);
            if (e) {
              e.armed = false;
              state.current.cooldown = 4;
              onEncounter(e.resource);
            }
          }}
        />
      )}
      {inside && (
        <group ref={bird} scale={0.4}>
          <mesh position={[0, 0.055, -0.1]} scale={0.055}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshBasicMaterial color="#456e69" />
          </mesh>
          <mesh scale={[0.055, 0.075, 0.15]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshBasicMaterial color="#517c79" />
          </mesh>
          <mesh position={[0, 0.02, -0.19]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.009, 0.16, 6]} />
            <meshBasicMaterial color="#47615f" />
          </mesh>
          <mesh
            ref={left}
            geometry={wing}
            position={[-0.025, 0.025, 0]}
            rotation={[0.35, 0, 0]}
          >
            <meshBasicMaterial
              color="#86aaa0"
              transparent
              opacity={0.65}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh
            ref={right}
            geometry={wing}
            position={[0.025, 0.025, 0]}
            scale={[-1, 1, 1]}
            rotation={[0.35, 0, 0]}
          >
            <meshBasicMaterial
              color="#86aaa0"
              transparent
              opacity={0.65}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}
    </>
  );
}
export function ColibriWorld(props: Props) {
  return (
    <Canvas
      camera={{ fov: props.inside ? 68 : 44, near: 0.05, far: 60 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: false }}
    >
      <World {...props} />
    </Canvas>
  );
}
export { deviceQuaternion };
