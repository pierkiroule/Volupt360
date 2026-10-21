import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { pigment, WEATHER, skyPosition, type Zone } from "./weatherModel";
/** One tessellated watercolor membrane per zone; deformation never accumulates. */
export function ProjectiveVeil({
  zone,
  paused,
}: {
  zone: Zone;
  paused: boolean;
}) {
  const time = useRef(0);
  const type = WEATHER.find((w) => w.id === zone.kind)!;
  const assets = useMemo(() => {
    const texture = new THREE.CanvasTexture(
      pigment(zone.seed ^ 1753, type.color),
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    const geometry = new THREE.PlaneGeometry(4.8, 2.7, 28, 12);
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        pigment: { value: texture },
        time: { value: 0 },
        phase: { value: (zone.seed % 997) * 0.01 },
        opacity: { value: zone.opacity },
        tint: { value: new THREE.Color(type.secondary) },
        fantasy: {
          value: zone.kind === "aurora" ? 1 : zone.kind === "dream" ? 2 : 0,
        },
      },
      vertexShader: `uniform float time,phase,fantasy;varying vec2 vUv;varying float fold;void main(){vUv=uv;vec3 p=position;float t=time*.22+phase;p.z+=sin(p.x*1.3+t)*.32+sin(p.y*2.-t*.6)*.19;p.y+=sin(p.x*.8+t*.7)*(.16+fantasy*.08);fold=sin(p.x*1.3+t)*.5+.5;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader:
        `uniform sampler2D pigment;uniform float time,phase,opacity,fantasy;uniform vec3 tint;varying vec2 vUv;varying float fold;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 void main(){vec2 uv=vUv;uv+=vec2(sin(uv.y*9.+time*.12+phase),cos(uv.x*8.-time*.1))*.017;vec4 p=texture2D(pigment,uv);float grain=hash(floor(vUv*380.));float edge=smoothstep(0.,.14,vUv.x)*smoothstep(0.,.14,1.-vUv.x)*smoothstep(0.,.2,vUv.y)*smoothstep(0.,.2,1.-vUv.y);float tide=.5+.5*sin(vUv.x*22.+sin(vUv.y*13.+phase)*2.+time*.12);vec3 color=mix(p.rgb,tint,.12+fold*.19);color*=.8+grain*.14+tide*.09;float alpha=p.a*edge*opacity*(.72+fold*.4)*(.68+tide*.32);gl_FragColor=vec4(color,alpha);#include <colorspace_fragment>
}`.replace(";#include", ";\n#include"),
    });
    return { texture, geometry, material };
  }, [zone.seed, zone.kind, type.color, type.secondary]);
  useEffect(
    () => () => {
      assets.material.dispose();
      assets.geometry.dispose();
      assets.texture.dispose();
    },
    [assets],
  );
  useFrame((_, raw) => {
    if (!paused) time.current += Math.min(raw, 0.05);
    assets.material.uniforms.time.value = time.current;
    assets.material.uniforms.opacity.value = zone.opacity;
  });
  return (
    <mesh
      name={"PigmentVeil_" + zone.id}
      geometry={assets.geometry}
      material={assets.material}
      rotation={[
        0.08,
        Math.atan2(-skyPosition(zone)[0], 2 - skyPosition(zone)[2]),
        -0.12,
      ]}
    />
  );
}
/** Five distant ink silhouettes in a single draw call, with intermittent visibility. */
export function InkBirds({ paused }: { paused: boolean }) {
  const time = useRef(0);
  const { gl } = useThree();
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(5 * 18), 3),
    );
    return g;
  }, []);
  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: "#485967",
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame((_, raw) => {
    if (!paused) time.current += Math.min(raw, 0.05);
    const t = time.current,
      positions = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < 5; i++) {
      const x = Math.sin(t * 0.055 + 0.2) * 10 + (i - 2) * 0.58,
        y = 2.1 + Math.sin(t * 0.14 + i * 0.2) * 0.35 + Math.abs(i - 2) * 0.14,
        z = -9 + Math.cos(t * 0.055) * 1.6 + i * 0.08;
      const wing = Math.sin(t * 4 + i * 0.65) * 0.12,
        span = 0.19 + i * 0.012;
      positions.set(
        [
          x - span,
          y + wing,
          z + 0.06,
          x,
          y,
          z,
          x,
          y,
          z,
          x + span,
          y + wing,
          z + 0.06,
          x,
          y,
          z,
          x,
          y - 0.025,
          z + 0.16,
        ],
        i * 18,
      );
    }
    geometry.attributes.position.needsUpdate = true;
    material.opacity =
      0.3 * THREE.MathUtils.smoothstep(Math.sin(t * 0.055 + 0.9), -0.15, 0.65);
    gl.domElement.dataset.birds = "5";
  });
  return (
    <lineSegments
      geometry={geometry}
      material={material}
      name="Distant_ink_birds"
    />
  );
}
