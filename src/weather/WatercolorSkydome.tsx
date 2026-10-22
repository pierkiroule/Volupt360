import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { createSkyCanvas, skyPaperColor } from "./skydomeTexture";
import type { Zone } from "./weatherModel";
export function WatercolorSkydome({
  zones,
  paused,
}: {
  zones: Zone[];
  paused: boolean;
}) {
  const { scene, gl } = useThree(),
    mesh = useRef<THREE.Mesh>(null),
    clock = useRef(0);
  const assets = useMemo(() => {
    const canvas = createSkyCanvas(zones, innerWidth < 700 ? 512 : 1024),
      texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.generateMipmaps = true;
    const material = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        wash: { value: texture },
        paper: { value: skyPaperColor(zones) },
        time: { value: 0 },
      },
      vertexShader: `varying vec3 D;void main(){D=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform sampler2D wash;uniform vec3 paper;uniform float time;varying vec3 D;void main(){vec3 d=normalize(D);vec3 drift=vec3(sin(d.y*5.+time*.025),sin(d.z*4.-time*.018),cos(d.x*4.+time*.022))*.007;d=normalize(d+drift);vec2 uv=vec2(atan(d.z,d.x)/6.28318530718+.5,asin(clamp(d.y,-1.,1.))/3.14159265359+.5);vec3 c=texture2D(wash,uv).rgb;float horizon=smoothstep(-.03,.2,d.y);float pole=1.-smoothstep(.92,.999,d.y);c=mix(paper,c,horizon*pole);gl_FragColor=vec4(c,1.);\n#include <colorspace_fragment>\n}`,
    });
    const geometry = new THREE.SphereGeometry(48, 48, 24);
    return { canvas, texture, material, geometry };
  }, [zones]);
  useEffect(() => {
    if (scene.fog instanceof THREE.Fog)
      scene.fog.color.copy(skyPaperColor(zones));
    return () => {
      assets.material.dispose();
      assets.geometry.dispose();
      assets.texture.dispose();
    };
  }, [assets, scene, zones]);
  useFrame(({ camera }, raw) => {
    if (!paused) clock.current += Math.min(raw, 0.05);
    assets.material.uniforms.time.value = clock.current;
    if (mesh.current) mesh.current.position.copy(camera.position);
    gl.domElement.dataset.skydome = "watercolor";
    gl.domElement.dataset.skyTime = clock.current.toFixed(3);
  });
  return (
    <mesh
      ref={mesh}
      name="Emoji_watercolor_skydome"
      geometry={assets.geometry}
      material={assets.material}
      renderOrder={-1000}
      frustumCulled={false}
    />
  );
}
