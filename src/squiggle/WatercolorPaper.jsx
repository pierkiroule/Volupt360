import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createDisplacementNoise } from "./displacementNoise.js";

/** Camera-centred paper vault: seamless world-space grain, no per-frame texture upload. */
export default function WatercolorPaper() {
  const noise = useMemo(() => createDisplacementNoise(), []);
  const uniforms = useMemo(() => ({ grain: { value: noise } }), [noise]);
  useEffect(() => () => noise.dispose(), [noise]);
  const mesh = useRef();
  useFrame(({ camera }) => { mesh.current.position.copy(camera.position); });
  return (
    <mesh
      ref={mesh}
      renderOrder={-100}
      frustumCulled={false}
    >
      <sphereGeometry args={[45, 32, 20]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        toneMapped={false}
        uniforms={uniforms}
        vertexShader={`varying vec3 D;void main(){D=normalize(position);vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;}`}
        fragmentShader={`uniform sampler2D grain;varying vec3 D;
        void main(){vec3 d=normalize(D);vec3 w=abs(d);w/=w.x+w.y+w.z;
        vec3 a=texture2D(grain,d.yz*13.).rgb;
        vec3 b=texture2D(grain,d.zx*13.).rgb;
        vec3 c=texture2D(grain,d.xy*13.).rgb;
        vec3 n=a*w.x+b*w.y+c*w.z;
        float wash=.5+.5*sin(d.x*3.+d.y*2.+d.z*4.);
        vec3 paper=mix(vec3(.947,.923,.867),vec3(.918,.945,.923),wash*.32);
        paper+=(n.g-.5)*.045+(n.r-.5)*.022;
        gl_FragColor=vec4(paper,1.);
        #include <colorspace_fragment>
        }`}
      />
    </mesh>
  );
}
