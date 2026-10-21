import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  WEATHER,
  pigment,
  random,
  skyPosition,
  type Zone,
} from "./weatherModel";
import { deviceQuaternion, requestGyroscope } from "../scene/gyroOrientation";
import { ProjectiveVeil, InkBirds } from "./ProjectiveAtmosphere";
import { WeatherLandscape, groundHeight } from "./WeatherLandscape";
import { HorizonGyro, angleDelta } from "./HorizonGyro";
export { requestGyroscope };
interface Navigation {
  x: number;
  y: number;
  active: boolean;
}
interface Props {
  zones: Zone[];
  travel: boolean;
  paused: boolean;
  gyro: boolean;
  navigation: React.RefObject<Navigation>;
  onGyroError: (text: string) => void;
}
function Phenomenon({ zone, paused }: { zone: Zone; paused: boolean }) {
  const root = useRef<THREE.Group>(null),
    particles = useRef<THREE.Points>(null),
    time = useRef(0);
  const type = WEATHER.find((w) => w.id === zone.kind)!;
  const assets = useMemo(() => {
    const texture = new THREE.CanvasTexture(pigment(zone.seed, type.color));
    texture.colorSpace = THREE.SRGBColorSpace;
    const r = random(zone.seed),
      positions = new Float32Array(48 * 3);
    for (let i = 0; i < 48; i++) {
      positions[i * 3] = (r() - 0.5) * 5;
      positions[i * 3 + 1] = (r() - 0.5) * 4;
      positions[i * 3 + 2] = (r() - 0.5) * 4;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const rainGeometry = new THREE.BufferGeometry();
    rainGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(48 * 6), 3),
    );
    return { texture, geometry, rainGeometry, original: positions.slice(), r };
  }, [zone.seed, type.color]);
  useEffect(
    () => () => {
      assets.texture.dispose();
      assets.geometry.dispose();
      assets.rainGeometry.dispose();
    },
    [assets],
  );
  const layouts = useMemo(() => {
    const r = random(zone.seed);
    return Array.from({ length: 3 }, () => ({
      position: [(r() - 0.5) * 3, (r() - 0.5) * 1.7, (r() - 0.5) * 2.5] as [
        number,
        number,
        number,
      ],
      scale: 2 + r() * 2,
      angle: r() * 6.28,
    }));
  }, [zone.seed]);
  useFrame(({ camera }, raw) => {
    if (!paused) time.current += Math.min(raw, 0.05);
    const t = time.current;
    if (root.current) {
      root.current.rotation.y = Math.sin(t * 0.06 + zone.seed) * 0.08;
      for (const child of root.current.children)
        if (child instanceof THREE.Sprite)
          child.material.rotation = Math.sin(t * 0.09 + zone.seed) * 0.1;
    }
    if (particles.current) {
      const p = assets.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < 48; i++) {
        const k = i * 3;
        p[k] = assets.original[k] + Math.sin(t * 0.35 + i) * 0.2;
        p[k + 1] =
          zone.kind === "rain" || zone.kind === "snow"
            ? ((((assets.original[k + 1] +
                2 -
                t * (zone.kind === "rain" ? 1.1 : 0.18)) %
                4) +
                4) %
                4) -
              2
            : assets.original[k + 1] + Math.sin(t * 0.2 + i) * 0.15;
      }
      assets.geometry.attributes.position.needsUpdate = true;
      const rain = assets.rainGeometry.attributes.position
        .array as Float32Array;
      for (let i = 0; i < 48; i++) {
        const k = i * 3,
          j = i * 6;
        rain[j] = p[k];
        rain[j + 1] = p[k + 1];
        rain[j + 2] = p[k + 2];
        rain[j + 3] = p[k] - 0.03;
        rain[j + 4] = p[k + 1] - 0.2;
        rain[j + 5] = p[k + 2];
      }
      assets.rainGeometry.attributes.position.needsUpdate = true;
      if (zone.kind === "dream") {
        for (let i = 0; i < 48; i++) {
          p[i * 3] += Math.sin(t * 0.11 + i) * 0.3;
          p[i * 3 + 1] =
            assets.original[i * 3 + 1] + Math.sin(t * 0.16 + i) * 0.4;
        }
      }
    }
    void camera;
  });
  const scale = zone.size * 5;
  return (
    <group position={skyPosition(zone)} scale={scale}>
      <ProjectiveVeil zone={zone} paused={paused} />
      <group ref={root}>
        {layouts.map((l, i) => (
          <sprite
            key={i}
            position={l.position}
            scale={[l.scale, l.scale * 0.8, 1]}
          >
            <spriteMaterial
              map={assets.texture}
              transparent
              depthWrite={false}
              opacity={zone.opacity * 0.45}
              rotation={l.angle}
              color={i % 3 === 0 ? type.secondary : "#ffffff"}
            />
          </sprite>
        ))}
      </group>
      {zone.kind === "rain" && (
        <lineSegments geometry={assets.rainGeometry}>
          <lineBasicMaterial
            color={type.color}
            transparent
            opacity={zone.opacity * 0.6}
            depthWrite={false}
          />
        </lineSegments>
      )}
      <points
        ref={particles}
        geometry={assets.geometry}
        visible={zone.kind !== "rain"}
      >
        <pointsMaterial
          color={zone.kind === "snow" ? "#ffffff" : type.secondary}
          size={zone.kind === "rain" ? 0.055 : 0.035}
          transparent
          opacity={zone.opacity * 0.6}
          depthWrite={false}
          map={assets.texture}
          alphaTest={0.01}
          sizeAttenuation
        />
      </points>
      {zone.kind === "storm" && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[
                new Float32Array([
                  0, 1, 0, -0.3, 0.2, 0, -0.3, 0.2, 0, 0.15, 0.25, 0, 0.15,
                  0.25, 0, -0.2, -0.7, 0,
                ]),
                3,
              ]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color="#d2ad75"
            transparent
            opacity={zone.opacity * 0.7}
          />
        </lineSegments>
      )}
    </group>
  );
}
function Flight({
  zones,
  travel,
  paused,
  gyro,
  navigation,
  onGyroError,
}: Props) {
  const { camera, gl } = useThree();
  const state = useRef({
    time: 0,
    yaw: 0,
    pitch: 0,
    gyro: null as THREE.Quaternion | null,
    horizon: new HorizonGyro(),
    viewYaw: 0,
    viewPitch: 0,
    desired: new THREE.Quaternion(),
    euler: new THREE.Euler(),
    target: new THREE.Vector3(),
    forward: new THREE.Vector3(),
    matrix: new THREE.Matrix4(),
    up: new THREE.Vector3(0, 1, 0),
  });
  useEffect(() => {
    camera.position.set(0, 0, 2);
    if (zones[0]) camera.lookAt(...skyPosition(zones[0]));
    const s = state.current;
    s.desired.copy(camera.quaternion);
    s.euler.setFromQuaternion(camera.quaternion, "YXZ");
    s.yaw = s.euler.y;
    s.pitch = s.euler.x;
    s.viewYaw = s.yaw;
    s.viewPitch = s.pitch;
  }, [camera]);
  useEffect(() => {
    const s = state.current;
    s.gyro = null;
    s.horizon.reset();
    if (!gyro) return;
    let received = false;
    const timer = setTimeout(() => {
      if (!received)
        onGyroError(
          "Aucun signal gyro reçu. Le glissement tactile reste disponible.",
        );
    }, 4000);
    const handler = (e: DeviceOrientationEvent) => {
      if (
        ![e.alpha, e.beta, e.gamma].every(
          (v) => typeof v === "number" && Number.isFinite(v),
        )
      )
        return;
      received = true;
      s.gyro = deviceQuaternion(
        e.alpha!,
        e.beta!,
        e.gamma!,
        screen.orientation?.angle || 0,
        s.gyro || new THREE.Quaternion(),
      );
    };
    window.addEventListener("deviceorientation", handler);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("deviceorientation", handler);
    };
  }, [gyro, onGyroError]);
  useFrame((_, raw) => {
    const s = state.current,
      dt = Math.min(raw, 0.05);
    if (paused) return;
    s.time += dt;
    const input = navigation.current;
    if (travel) {
      const t = s.time * 0.075;
      const radius = 4.5 + Math.sin(t * 0.61) * 2.1;
      s.target.set(
        Math.sin(t) * radius,
        Math.sin(t * 0.7) * 1.2,
        Math.cos(t) * radius - 2,
      );
      camera.position.lerp(s.target, 1 - Math.exp(-dt * 0.6));
    }
    camera.position.y = Math.max(
      camera.position.y,
      groundHeight(camera.position.x, camera.position.z) + 1.3,
    );
    if (input.active) {
      s.horizon.reset();
      s.yaw -= input.x * dt;
      s.pitch = THREE.MathUtils.clamp(
        s.pitch - input.y * dt * 0.7,
        -1.15,
        1.15,
      );
      s.desired.setFromEuler(s.euler.set(s.pitch, s.yaw, 0, "YXZ"));
    } else if (s.gyro) {
      const look = s.horizon.update(s.gyro, s.viewYaw, s.viewPitch);
      s.yaw = look.yaw;
      s.pitch = look.pitch;
      s.desired.setFromEuler(s.euler.set(s.pitch, s.yaw, 0, "YXZ"));
    } else if (travel) {
      s.target.set(
        Math.sin(s.time * 0.04) * 1.3,
        Math.sin(s.time * 0.06) * 0.35,
        -2,
      );
      s.matrix.lookAt(camera.position, s.target, s.up);
      s.desired.setFromRotationMatrix(s.matrix);
      s.euler.setFromQuaternion(s.desired, "YXZ");
      s.yaw = s.euler.y;
      s.pitch = s.euler.x;
    }
    // Smooth yaw/pitch rather than slerping: interpolation must never introduce bank.
    const blend = 1 - Math.exp(-dt * 3);
    s.viewYaw += angleDelta(s.yaw - s.viewYaw) * blend;
    s.viewPitch = THREE.MathUtils.damp(s.viewPitch, s.pitch, 3, dt);
    camera.quaternion.setFromEuler(
      s.euler.set(s.viewPitch, s.viewYaw, 0, "YXZ"),
    );
    gl.domElement.dataset.heading = camera.quaternion
      .toArray()
      .map((n) => n.toFixed(6))
      .join(",");
    gl.domElement.dataset.position = camera.position
      .toArray()
      .map((n) => n.toFixed(3))
      .join(",");
    gl.domElement.dataset.zones = String(zones.length);
  });
  return (
    <>
      <color attach="background" args={["#eff1ec"]} />
      <fog attach="fog" args={["#eff1ec", 13, 34]} />
      <WeatherLandscape zones={zones} paused={paused} />
      <InkBirds paused={paused} />
      {zones.map((z) => (
        <Phenomenon key={z.id} zone={z} paused={paused} />
      ))}
    </>
  );
}
export function WeatherWorld(props: Props) {
  return (
    <Canvas
      camera={{ fov: 78, near: 0.05, far: 70 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true }}
    >
      <Flight {...props} />
    </Canvas>
  );
}
