import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { WEATHER, type Zone } from "./weatherModel";
export function riverCenter(z: number) {
  return Math.sin(z * 0.13) * 2.8 + Math.sin(z * 0.31 + 0.6) * 0.75;
}
/** Shared by the terrain and flight clearance; no physics engine or per-frame raycast. */
export function groundHeight(x: number, z: number) {
  const distance = Math.abs(x - riverCenter(z));
  const valley = 1 - Math.exp(-distance * distance * 0.06);
  const hills =
    Math.sin(x * 0.17 + z * 0.08) * 0.45 +
    Math.sin(z * 0.21 - x * 0.13) * 0.35 +
    Math.cos(x * 0.31 + z * 0.27) * 0.2;
  const edge = THREE.MathUtils.smoothstep(Math.hypot(x, z), 7, 27);
  return -4.7 + valley * (0.65 + hills * 0.8 + edge * (1.4 + hills * 1.3));
}
export function WeatherLandscape({
  zones,
  paused,
}: {
  zones: Zone[];
  paused: boolean;
}) {
  const { gl } = useThree(),
    clock = useRef(0);
  const assets = useMemo(() => {
    const segments = innerWidth < 700 ? 80 : 112,
      geometry = new THREE.PlaneGeometry(100, 100, segments, segments);
    geometry.rotateX(-Math.PI / 2);
    const p = geometry.attributes.position;
    const color = new THREE.Color("#b4bea2");
    for (const z of zones) {
      const w = WEATHER.find((w) => w.id === z.kind)!;
      color.lerp(new THREE.Color(w.color), 0.12 * z.opacity);
    }
    const colors = new Float32Array(p.count * 3),
      paper = new THREE.Color("#e8debd"),
      ink = new THREE.Color("#738c83"),
      c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i),
        height = groundHeight(x, z);
      p.setY(i, height);
      const blend =
        0.5 +
        0.23 * Math.sin(x * 0.19 + z * 0.12) +
        0.15 * Math.sin(z * 0.43 - x * 0.2);
      c.copy(paper)
        .lerp(color, blend)
        .lerp(ink, THREE.MathUtils.smoothstep(height, -4, -1) * 0.28);
      c.toArray(colors, i * 3);
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    const material = new THREE.ShaderMaterial({
      vertexColors: true,
      uniforms: { paper: { value: new THREE.Color("#eff1ec") } },
      vertexShader: `varying vec3 world;varying vec3 wash;void main(){world=(modelMatrix*vec4(position,1.)).xyz;wash=color;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}`,
      fragmentShader: `uniform vec3 paper;varying vec3 world,wash;float grain(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){float g=grain(floor(world.xz*110.));float fold=.5+.5*sin(world.x*.9+sin(world.z*.35)*2.);float tide=1.-smoothstep(.025,.1,abs(sin((world.y+sin(world.x*.2)*.06)*15.)));vec3 c=wash*(.9+g*.1+fold*.07)-tide*.035;float fog=smoothstep(16.,46.,distance(cameraPosition,world));gl_FragColor=vec4(mix(c,paper,fog),1.);\n#include <colorspace_fragment>\n}`,
    });
    const count = 160,
      positions = new Float32Array((count + 1) * 6),
      uv = new Float32Array((count + 1) * 4),
      indices: number[] = [];
    for (let i = 0; i <= count; i++) {
      const z = -45 + (i / count) * 90,
        width = 0.48 + Math.sin(z * 0.14) * 0.13;
      for (let side = 0; side < 2; side++) {
        const x = riverCenter(z) + (side ? width : -width);
        const k = i * 6 + side * 3;
        positions[k] = x;
        positions[k + 1] = groundHeight(x, z) + 0.045;
        positions[k + 2] = z;
        uv[i * 4 + side * 2] = side;
        uv[i * 4 + side * 2 + 1] = i / count;
      }
      if (i < count) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const river = new THREE.BufferGeometry();
    river.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    river.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    river.setIndex(indices);
    river.computeBoundingSphere();
    const water = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color("#9bbfbb") },
        paper: { value: new THREE.Color("#eff1ec") },
      },
      vertexShader: `varying vec2 U;varying vec3 W;void main(){U=uv;W=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(W,1.);}`,
      fragmentShader: `uniform float time;uniform vec3 color,paper;varying vec2 U;varying vec3 W;void main(){float rim=smoothstep(0.,.18,U.x)*smoothstep(0.,.18,1.-U.x);float flow=.5+.5*sin(U.y*180.-time*.38+sin(U.x*8.)*2.);vec3 c=mix(color,vec3(.93,.94,.82),flow*.3);float fog=smoothstep(16.,46.,distance(cameraPosition,W));gl_FragColor=vec4(mix(c,paper,fog),rim*.74*(1.-fog));\n#include <colorspace_fragment>\n}`,
    });
    return { geometry, material, river, water };
  }, [zones]);
  useEffect(
    () => () => {
      assets.geometry.dispose();
      assets.material.dispose();
      assets.river.dispose();
      assets.water.dispose();
    },
    [assets],
  );
  useFrame((_, raw) => {
    if (!paused) clock.current += Math.min(raw, 0.05);
    assets.water.uniforms.time.value = clock.current;
    gl.domElement.dataset.landscape = "watercolor";
  });
  return (
    <group name="Watercolor_landscape">
      <mesh
        name="Pigment_hills_and_valleys"
        geometry={assets.geometry}
        material={assets.material}
      />
      <mesh
        name="Meandering_water"
        geometry={assets.river}
        material={assets.water}
      />
    </group>
  );
}
