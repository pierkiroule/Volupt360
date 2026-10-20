import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { seededRandom } from "../transduction/engine.ts";
import { useSensoryStore } from "../store/useSensoryStore.ts";
export default function StellarField({ low }: { low: boolean }) {
  const seed = useSensoryStore((s) => s.composition.seed),
    time = useRef(0);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []),
    geometry = useMemo(() => {
      const random = seededRandom(seed ^ 0x7342),
        positions = new Float32Array(1600 * 3),
        sizes = new Float32Array(1600);
      for (let i = 0; i < 1600; i++) {
        const z = random() * 2 - 1,
          a = random() * Math.PI * 2,
          r = 76 + random() * 32,
          s = Math.sqrt(1 - z * z);
        positions.set([Math.cos(a) * s * r, z * r, Math.sin(a) * s * r], i * 3);
        sizes[i] = 0.7 + random() * 1.5;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      g.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
      return g;
    }, [seed]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => geometry.setDrawRange(0, low ? 800 : 1600), [geometry, low]);
  useFrame((_, dt) => {
    const s = useSensoryStore.getState();
    if (!s.paused && !s.reduced) time.current += Math.min(dt, 0.1);
    uniforms.uTime.value = time.current;
  });
  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={-10}>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={`attribute float aSize;varying float vSeed;void main(){vSeed=aSize;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=aSize*1.2;}`}
        fragmentShader={`uniform float uTime;varying float vSeed;void main(){float d=length(gl_PointCoord-.5)*2.;float a=(1.-smoothstep(.1,1.,d))*(.5+vSeed*.14)*(.88+sin(uTime*.13+vSeed*13.)*.12);gl_FragColor=vec4(.8,.87,1.,a);}`}
        transparent
        depthWrite={false}
      />
    </points>
  );
}
