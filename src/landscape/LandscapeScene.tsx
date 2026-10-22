import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { AssetLibrary, type ModelAsset } from "./AssetLibrary";
import { ATMOSPHERE } from "./AtmosphereEngine";
import { BIOME_RULES } from "./BiomeComposer";
import type { ComposedLandscape } from "./LandscapeComposer";
import type { Placement } from "./types";
import { deviceQuaternion, requestGyroscope } from "../scene/gyroOrientation";
import { HorizonGyro, angleDelta, smoothGyroHeading } from "../weather/HorizonGyro";
import { CosmoMatter, cosmoAnchor } from "../weather/CosmoMatter";
import { WatercolorSkydome } from "../weather/WatercolorSkydome";
import { Phenomenon } from "../weather/WeatherWorld";
import { InkBirds } from "../weather/ProjectiveAtmosphere";
import { WEATHER, type Zone } from "../weather/weatherModel";
import { surfaceGrain } from "./SurfaceMaterials";
export { requestGyroscope };
export interface Steering {
  x: number;
  y: number;
  active: boolean;
}
interface Props {
  weatherZones?: Zone[];
  surreal?: boolean;
  moving?: boolean;
  world: ComposedLandscape;
  exploring: boolean;
  paused: boolean;
  gyro: boolean;
  steering: React.RefObject<Steering>;
  model: ModelAsset | null;
  environment: THREE.DataTexture | null;
  onGyroError: (message: string) => void;
}
function Instances({
  items,
  kind,
  world,
  distant = false,
  weatherZones,
}: {
  weatherZones?: Zone[];
  distant?: boolean;
  items: Placement[];
  kind: "tree" | "rock" | "plant";
  world: ComposedLandscape;
}) {
  const a = useRef<THREE.InstancedMesh>(null),
    b = useRef<THREE.InstancedMesh>(null);
  const count = items.length,
    biome = world.settings.biome;
  const assets = useMemo(() => {
    const geometry =
      kind === "tree"
        ? distant
          ? new THREE.DodecahedronGeometry(1, 0)
          : new THREE.SphereGeometry(1, 12, 9)
        : kind === "rock"
          ? new THREE.IcosahedronGeometry(1, distant ? 0 : 1)
          : new THREE.ConeGeometry(0.5, 1, 5);
    if (!distant) {
      const p = geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i),
          y = p.getY(i),
          z = p.getZ(i),
          warp = 1 + Math.sin(x * 7 + y * 3) * Math.cos(z * 6 - y * 4) * 0.09;
        p.setXYZ(i, x * warp, y * warp, z * warp);
      }
      geometry.computeVertexNormals();
    }
    const texture = surfaceGrain(
      kind === "tree" ? 352 : 547,
      kind === "tree" ? 2 : 1,
    );
    const trunk = new THREE.CylinderGeometry(0.065, 0.12, 1, 5);
    const color =
      kind === "rock"
        ? "#8d8e7f"
        : biome === "dream"
          ? "#aa9eae"
          : biome === "coast"
            ? "#849783"
            : kind === "plant"
              ? "#89986e"
              : "#607966";
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.92,
      map: texture,
      bumpMap: texture,
      bumpScale: kind === "rock" ? 0.12 : 0.025,
      envMapIntensity: 0.45,
      metalness: 0,
    });
    const bark = new THREE.MeshStandardMaterial({
      color: "#746b59",
      roughness: 1,
    });
    return { geometry, trunk, material, bark, texture };
  }, [kind, biome, distant]);
  useEffect(
    () => () => {
      assets.geometry.dispose();
      assets.trunk.dispose();
      assets.material.dispose();
      assets.bark.dispose();
      assets.texture.dispose();
    },
    [assets],
  );
  useEffect(() => {
    if (!a.current) return;
    const dummy = new THREE.Object3D(),
      color = new THREE.Color(),
      up = new THREE.Vector3(0, 1, 0),
      yaw = new THREE.Quaternion();
    items.forEach((p, i) => {
      const n = world.terrain.sample(p.x, p.z).normal;
      dummy.quaternion.setFromUnitVectors(
        up,
        n.lerp(up, kind === "tree" ? 0.9 : 0.4).normalize(),
      );
      yaw.setFromAxisAngle(up, p.yaw);
      dummy.quaternion.multiply(yaw);
      if (kind === "tree") {
        dummy.position.set(p.x, p.y + p.scale * 1.8, p.z);
        dummy.scale.set(p.scale * 0.82, p.scale * 0.9, p.scale * 0.72);
        dummy.updateMatrix();
        a.current!.setMatrixAt(i * 2, dummy.matrix);
        dummy.position.y += p.scale * 0.75;
        dummy.scale.multiplyScalar(0.73);
        dummy.updateMatrix();
        a.current!.setMatrixAt(i * 2 + 1, dummy.matrix);
        dummy.position.set(p.x, p.y + p.scale * 0.9, p.z);
        dummy.scale.set(p.scale, p.scale * 1.8, p.scale);
        dummy.updateMatrix();
        b.current?.setMatrixAt(i, dummy.matrix);
      } else {
        dummy.position.set(
          p.x,
          p.y + p.scale * (kind === "rock" ? 0.35 : 0.5),
          p.z,
        );
        dummy.scale.set(
          p.scale,
          kind === "rock" ? p.scale * 0.65 : p.scale,
          p.scale * 0.82,
        );
        dummy.updateMatrix();
        a.current!.setMatrixAt(i, dummy.matrix);
      }
      color.setScalar(0.8 + (i % 7) * 0.045);
      if (weatherZones) {
        for (const zone of weatherZones) {
          const distance = Math.hypot(p.x - zone.x * 28, p.z - zone.y * 28);
          const weight = Math.exp(-distance * distance / ((5 + zone.size * 30) ** 2)) * zone.opacity;
          const pigment = WEATHER.find(w => w.id === zone.kind)!;
          color.lerp(new THREE.Color(pigment.secondary), weight * .45);
        }
      }
      a.current!.setColorAt(kind === "tree" ? i * 2 : i, color);
      if (kind === "tree") a.current!.setColorAt(i * 2 + 1, color);
    });
    a.current.instanceMatrix.needsUpdate = true;
    if (a.current.instanceColor) a.current.instanceColor.needsUpdate = true;
    a.current.computeBoundingSphere();
    if (b.current) {
      b.current.instanceMatrix.needsUpdate = true;
      b.current.computeBoundingSphere();
    }
  }, [items, world, kind, weatherZones]);
  return (
    <>
      <instancedMesh
        ref={a}
        args={[
          assets.geometry,
          assets.material,
          kind === "tree" ? count * 2 : count,
        ]}
        castShadow={kind !== "plant"}
        receiveShadow
      />
      <>
        {kind === "tree" && (
          <instancedMesh
            ref={b}
            args={[assets.trunk, assets.bark, count]}
            castShadow
            receiveShadow
          />
        )}
      </>
    </>
  );
}
function ObjectLayers({
  world,
  model,
  weatherZones,
}: {
  world: ComposedLandscape;
  model: ModelAsset | null;
  weatherZones?: Zone[];
}) {
  const [split, setSplit] = useState(() => ({
    near: world.objects.filter(
      (p) => Math.hypot(p.x - world.camera[0], p.z - world.camera[2]) < 26,
    ),
    far: world.objects.filter(
      (p) => Math.hypot(p.x - world.camera[0], p.z - world.camera[2]) >= 26,
    ),
  }));
  const timer = useRef(0),
    signature = useRef("");
  useFrame(({ camera }, dt) => {
    timer.current += dt;
    if (timer.current < 0.8) return;
    timer.current = 0;
    const near: Placement[] = [],
      far: Placement[] = [];
    let key = "";
    for (let i = 0; i < world.objects.length; i++) {
      const p = world.objects[i],
        d = Math.hypot(p.x - camera.position.x, p.z - camera.position.z);
      if (d < 26) {
        near.push(p);
        key += i + ",";
      } else if (d < 62) far.push(p);
    }
    if (key !== signature.current) {
      signature.current = key;
      setSplit({ near, far });
    }
  });
  const external = model
    ? world.objects.filter((p) => p.kind === model.kind).slice(0, 3)
    : [];
  return (
    <>
      {(["tree", "rock", "plant"] as const).map((kind) => (
        <Instances
          key={kind}
          kind={kind}
          weatherZones={weatherZones}
          world={world}
          items={split.near.filter(
            (p) => p.kind === kind && !external.includes(p),
          )}
        />
      ))}
      {(["tree", "rock"] as const).map((kind) => (
        <Instances
          key={"far" + kind}
          kind={kind}
          weatherZones={weatherZones}
          distant
          world={world}
          items={split.far.filter(
            (p) => p.kind === kind && !external.includes(p),
          )}
        />
      ))}
      {model && <RemoteObjects model={model} items={external} />}
    </>
  );
}
function RemoteObjects({
  model,
  items,
}: {
  model: ModelAsset;
  items: Placement[];
}) {
  const clones = useMemo(
    () =>
      items.slice(0, 3).map((p) => {
        const group = new THREE.Group();
        group.add(model.scene.clone(true));
        group.position.set(p.x, p.y, p.z);
        group.scale.setScalar(p.scale * 1.7);
        group.rotation.y = p.yaw;
        group.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });
        return group;
      }),
    [model, items],
  );
  const { gl } = useThree();
  useEffect(() => {
    gl.shadowMap.needsUpdate = true;
  }, [clones, gl]);
  return (
    <>
      {clones.map((clone, i) => (
        <primitive key={i} object={clone} dispose={null} />
      ))}
    </>
  );
}
function FloatingAssets({world,model,paused}:{world:ComposedLandscape;model:ModelAsset;paused:boolean}) {
  const root=useRef<THREE.Group>(null), time=useRef(0);
  const items=useMemo(()=>world.objects.filter(p=>p.kind===model.kind).slice(0,3).map((p,i)=>({...p,
    x:Math.sin(i*2.1+world.settings.seed)*14,y:Math.sin(i*1.7)*5,z:Math.cos(i*2.1+world.settings.seed)*14,scale:p.scale*.65})),[world,model]);
  useFrame((_,dt)=>{if(!paused)time.current+=Math.min(dt,.05);if(root.current){root.current.position.y=Math.sin(time.current*.15)*.8;root.current.rotation.y=Math.sin(time.current*.06)*.1;}});
  return <group ref={root}><RemoteObjects model={model} items={items}/></group>;
}
function Atmosphere({
  world,
  environment,
  watercolor = false,
}: {
  watercolor?: boolean;
  world: ComposedLandscape;
  environment: THREE.DataTexture | null;
}) {
  const { scene, gl } = useThree(),
    preset = ATMOSPHERE[world.settings.atmosphere];
  const sky = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          zenith: { value: new THREE.Color(preset.zenith) },
          horizon: { value: new THREE.Color(preset.horizon) },
          sun: { value: new THREE.Color(preset.sun) },
          direction: {
            value: new THREE.Vector3(-0.5, preset.elevation, -0.6).normalize(),
          },
        },
        vertexShader: `varying vec3 D;void main(){D=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `uniform vec3 zenith,horizon,sun,direction;varying vec3 D;void main(){vec3 d=normalize(D);float h=smoothstep(-.08,.8,d.y);vec3 c=mix(horizon,zenith,h);float glow=pow(max(0.,dot(d,direction)),70.);c=mix(c,sun,glow*.42);gl_FragColor=vec4(c,1.);\n#include <colorspace_fragment>\n}`,
      }),
    [preset],
  );
  const dome = useRef<THREE.Mesh>(null);
  useEffect(() => {
    const room = new RoomEnvironment(),
      pmrem = new THREE.PMREMGenerator(gl),
      target = environment
        ? pmrem.fromEquirectangular(environment)
        : pmrem.fromScene(room, 0.04);
    scene.environment = target.texture;
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    return () => {
      if (scene.environment === target.texture) scene.environment = null;
      target.dispose();
      pmrem.dispose();
      room.dispose();
      sky.dispose();
    };
  }, [gl, scene, sky, environment]);
  useFrame(({ camera }) => {
    dome.current?.position.copy(camera.position);
  });
  return (
    <>
      <color attach="background" args={[preset.sky]} />
      <fog attach="fog" args={[preset.fog, 26, 68]} />
      {!watercolor && <mesh ref={dome} material={sky} renderOrder={-1000}>
        <sphereGeometry args={[85, 32, 16]} />
      </mesh>}
      <hemisphereLight args={[preset.horizon, "#626e65", preset.ambient * (watercolor ? 1.3 : 1)]} />
      <directionalLight
        color={preset.sun}
        intensity={preset.intensity}
        position={[-20, Math.max(6, preset.elevation * 40), -24]}
        castShadow
        shadow-mapSize={[
          innerWidth < 700 ? 1024 : 2048,
          innerWidth < 700 ? 1024 : 2048,
        ]}
        shadow-camera-left={-36}
        shadow-camera-right={36}
        shadow-camera-top={36}
        shadow-camera-bottom={-36}
        shadow-camera-far={110}
        shadow-normalBias={0.12}
        shadow-bias={-0.0002}
      />
    </>
  );
}
function World({
  surreal = false,
  weatherZones,
  moving = true,
  world,
  exploring,
  paused,
  gyro,
  steering,
  model,
  environment,
  onGyroError,
}: Props) {
  const { camera, gl } = useThree();
  const time = useRef(0);
  const state = useRef({
    yaw: 0,
    pitch: 0,
    viewYaw: 0,
    viewPitch: 0,
    euler: new THREE.Euler(),
    target: new THREE.Vector3(),
    forward: new THREE.Vector3(),
    sensor: null as THREE.Quaternion | null,
    sensorScreen: 0,
    horizon: new HorizonGyro(),
  });
  const texture = useMemo(() => surfaceGrain(world.settings.seed, 24), [world]);
  useEffect(() => () => texture.dispose(), [texture]);
  const terrain = useMemo(
    () => world.terrain.geometry(innerWidth < 700),
    [world],
  );
  useEffect(() => () => terrain.dispose(), [terrain]);
  const groups = useMemo(
    () => ({
      tree: world.objects.filter((p) => p.kind === "tree"),
      rock: world.objects.filter((p) => p.kind === "rock"),
      plant: world.objects.filter((p) => p.kind === "plant"),
    }),
    [world],
  );
  useEffect(() => {
    camera.position.fromArray(world.camera);
    camera.lookAt(...world.target);
    if (surreal) {
      camera.position.set(0,1,10);
      camera.lookAt(...(weatherZones?.[0] ? cosmoAnchor(weatherZones[0]) : [0,0,0] as [number,number,number]));
    }
    const s = state.current;
    s.euler.setFromQuaternion(camera.quaternion, "YXZ");
    s.yaw = s.viewYaw = s.euler.y;
    s.pitch = s.viewPitch = s.euler.x;
    s.horizon.reset();
    gl.shadowMap.needsUpdate = true;
  }, [world, camera, gl, surreal, weatherZones]);
  useEffect(() => {
    if (!exploring) return;
    const s = state.current;
    s.euler.setFromQuaternion(camera.quaternion, "YXZ");
    s.yaw = s.viewYaw = s.euler.y;
    s.pitch = s.viewPitch = THREE.MathUtils.clamp(s.euler.x, -1.1, 1.1);
    s.horizon.reset();
  }, [exploring, camera]);
  useEffect(() => {
    const s = state.current;
    s.sensor = null;
    s.yaw = s.viewYaw;
    s.pitch = s.viewPitch;
    s.sensorScreen = screen.orientation?.angle || 0;
    s.horizon.reset();
    gl.domElement.dataset.gyro = gyro ? "waiting" : "off";
    if (!gyro) return;
    let received = false;
    const timer = setTimeout(() => {
      if (!received)
        onGyroError("Aucun signal reçu. Le glissement reste disponible.");
    }, 4000);
    const handler = (e: DeviceOrientationEvent) => {
      if (
        ![e.alpha, e.beta, e.gamma].every(
          (v) => typeof v === "number" && Number.isFinite(v),
        )
      )
        return;
      received = true;
      const orientation = screen.orientation?.angle || 0;
      if (orientation !== s.sensorScreen) {
        s.horizon.reset();
        s.sensorScreen = orientation;
      }
      s.sensor = deviceQuaternion(
        e.alpha!,
        e.beta!,
        e.gamma!,
        screen.orientation?.angle || 0,
        s.sensor || new THREE.Quaternion(),
      );
      // Calibrate on the first sensor event, even when a heavy frame is pending.
      if (!steering.current.active) s.horizon.update(s.sensor, s.viewYaw, s.viewPitch);
      gl.domElement.dataset.gyro = "tracking";
    };
    window.addEventListener("deviceorientation", handler);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("deviceorientation", handler);
    };
  }, [gyro, onGyroError, gl, steering]);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05),
      s = state.current;
    if (!paused) time.current += dt;
    if (exploring && !paused) {
      const input = steering.current;
      if (input.active) {
        s.horizon.reset();
        s.yaw -= input.x * dt * 0.85;
        s.pitch = THREE.MathUtils.clamp(
          s.pitch - input.y * dt * 0.6,
          -1.1,
          1.1,
        );
      } else if (s.sensor) {
        const look = s.horizon.update(s.sensor, s.viewYaw, s.viewPitch);
        s.yaw = look.yaw;
        s.pitch = look.pitch;
      } else if (weatherZones && moving) {
        // An unpiloted bird follows the river into the composition.
        const targetZ = Math.sin(time.current * .065) * 15;
        s.target.set(world.terrain.river(targetZ),
          Math.max(world.terrain.height(world.terrain.river(targetZ), targetZ) + 5, 5), targetZ);
        if (surreal) s.target.set(Math.sin(time.current*.09)*10,Math.sin(time.current*.13)*4,Math.cos(time.current*.075)*10-3);
        s.forward.copy(s.target).sub(camera.position);
        if (s.forward.lengthSq() > 9) {
          s.yaw = Math.atan2(-s.forward.x, -s.forward.z);
          s.pitch = Math.atan2(s.forward.y, Math.hypot(s.forward.x, s.forward.z));
        } else s.yaw += dt * .16;
      }
      s.viewYaw = gyro && !input.active
        ? smoothGyroHeading(s.viewYaw, s.yaw, dt)
        : s.viewYaw + angleDelta(s.yaw - s.viewYaw) * (1 - Math.exp(-dt * 4));
      const pitchStep = THREE.MathUtils.damp(s.viewPitch, s.pitch, 4, dt)-s.viewPitch;
      s.viewPitch += gyro ? THREE.MathUtils.clamp(pitchStep,-1.5*dt,1.5*dt) : pitchStep;
      camera.quaternion.setFromEuler(
        s.euler.set(s.viewPitch, s.viewYaw, 0, "YXZ"),
      );
      if (moving) {
      camera.getWorldDirection(s.forward);
      if (!weatherZones) s.forward.y = 0;
      s.forward.normalize();
      const radius = Math.hypot(camera.position.x, camera.position.z);
      if (radius > 35) {
        s.target.set(-camera.position.x, 0, -camera.position.z).normalize();
        s.forward
          .lerp(s.target, THREE.MathUtils.smoothstep(radius, 35, 45))
          .normalize();
      }
      camera.position.addScaledVector(s.forward, dt * 1.6);
      if (surreal) camera.position.y = THREE.MathUtils.clamp(camera.position.y, -16, 16);
      else {
      const floor =
        world.terrain.height(camera.position.x, camera.position.z) + 2.3;
      camera.position.y = Math.max(
        THREE.MathUtils.damp(
          camera.position.y,
          Math.max(floor, world.terrain.waterLevel + 2.8, weatherZones ? camera.position.y : -Infinity),
          0.8,
          dt,
        ),
        floor,
      );
      }
      }
    }
    if (weatherZones) {
      gl.domElement.dataset.zones = String(weatherZones.length);
      gl.domElement.dataset.landscape = surreal ? "sensory-cosmos" : "composed-weather";
    }
    gl.domElement.dataset.heading = camera.quaternion
      .toArray()
      .map((n) => n.toFixed(6))
      .join(",");
    gl.domElement.dataset.objects = String(world.objects.length);
    gl.domElement.dataset.biome = world.settings.biome;
    gl.domElement.dataset.position = camera.position
      .toArray()
      .map((n) => n.toFixed(3))
      .join(",");
  });
  return (
    <>
      <Atmosphere world={world} environment={environment} watercolor={!!weatherZones} />
      {weatherZones && <>
        <WatercolorSkydome zones={weatherZones} paused={paused} />
        <InkBirds paused={paused} />
        {!surreal && weatherZones.map(zone => {
          const x = zone.x * 28, z = zone.y * 28;
          const height = Math.max(world.terrain.height(x,z), world.terrain.waterLevel) + 9 + zone.size * 8;
          return <group key={zone.id} position={[x, height, z]} scale={3}>
            <Phenomenon zone={zone} paused={paused} position={[0,0,0]} />
          </group>;
        })}
      </>}
      {surreal && weatherZones && <CosmoMatter zones={weatherZones} paused={paused} />}
      {!surreal && <mesh geometry={terrain} receiveShadow>
        <meshStandardMaterial
          vertexColors
          roughness={0.94}
          metalness={0}
          map={texture}
          bumpMap={texture}
          bumpScale={0.09}
          envMapIntensity={0.5}
        />
      </mesh>}
      {!surreal && world.settings.biome !== "desert" && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, world.terrain.waterLevel, 0]}
          receiveShadow
        >
          <planeGeometry args={[112, 112]} />
          <meshStandardMaterial
            color={BIOME_RULES[world.settings.biome].water}
            roughness={0.28}
            metalness={0.18}
            transparent
            opacity={0.86}
          />
        </mesh>
      )}
      {!surreal && <ObjectLayers key={world.settings.seed} world={world} model={model} weatherZones={weatherZones} />}
      {surreal && model && <FloatingAssets world={world} model={model} paused={paused} />}
      {!exploring && (
        <OrbitControls
          target={world.target}
          enableDamping
          dampingFactor={0.06}
          minDistance={4}
          maxDistance={48}
          maxPolarAngle={Math.PI * 0.47}
          enablePan={false}
        />
      )}
    </>
  );
}
export function LandscapeScene(props: Props) {
  return (
    <Canvas
      shadows
      camera={{ fov: 66, near: 0.1, far: 120 }}
      dpr={[1, 1.4]}
      gl={{ antialias: true }}
      onCreated={({ gl }) => {
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
    >
      <World {...props} />
    </Canvas>
  );
}
