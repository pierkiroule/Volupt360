import {useEffect,useMemo,useRef} from "react";
import {useFrame} from "@react-three/fiber";
import * as THREE from "three";
import {pigment,WEATHER,type Zone} from "./weatherModel";
/** A single unlit, low-resolution membrane. All folds live in the vertex shader. */
export function SilkVeil({zone,index,paused}:{zone:Zone;index:number;paused:boolean}){
  const time=useRef(0);
  const assets=useMemo(()=>{
    const palette=WEATHER.find(w=>w.id===zone.kind)!;
    const map=new THREE.CanvasTexture(pigment(zone.seed,palette.color));map.colorSpace=THREE.SRGBColorSpace;
    const geometry=new THREE.PlaneGeometry(11,7,28,14);
    const material=new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,
      uniforms:{wash:{value:map},tint:{value:new THREE.Color(palette.secondary)},time:{value:0},phase:{value:zone.seed%97},opacity:{value:Math.min(.72,zone.opacity*.8)}},
      vertexShader:`uniform float time,phase;varying vec2 paint;varying float fold;void main(){paint=uv;vec3 p=position;float u=uv.x*2.-1.,v=uv.y*2.-1.,t=time*.24+phase;float a=u*2.7+v*.6+t;float b=v*3.1-u*.8-t*.63;p.x+=sin(v*2.4+t*.6)*.65;p.y+=sin(u*2.8+t*.5)*.65+sin(b)*.23;p.z+=sin(a)*1.45+sin(b)*.55;fold=.5+.5*cos(a)*cos(b*.5);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader:`uniform sampler2D wash;uniform vec3 tint;uniform float opacity;varying vec2 paint;varying float fold;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){vec4 pigment=texture2D(wash,paint);float grain=hash(floor(paint*360.));float edge=smoothstep(0.,.13,paint.x)*smoothstep(0.,.13,1.-paint.x)*smoothstep(0.,.16,paint.y)*smoothstep(0.,.16,1.-paint.y);float thread=.5+.5*sin(paint.x*180.+sin(paint.y*31.)*2.);vec3 color=mix(pigment.rgb,tint,.18+fold*.12)*(.72+fold*.21+grain*.07);float alpha=pigment.a*edge*opacity*(.7+fold*.3);alpha*=.87+thread*.13;gl_FragColor=vec4(color,alpha);\n#include <colorspace_fragment>\n}`});
    material.forceSinglePass=true;
    return {map,geometry,material};
  },[zone.kind,zone.seed,zone.opacity]);
  useEffect(()=>()=>{assets.map.dispose();assets.geometry.dispose();assets.material.dispose();},[assets]);
  useFrame((_,dt)=>{if(!paused)time.current+=Math.min(dt,.05);assets.material.uniforms.time.value=time.current;});
  return <mesh name={'Silk_'+zone.id} geometry={assets.geometry} material={assets.material} frustumCulled={false}
    position={[index?3:-2,index?1:-.5,-4-index*5]} rotation={[index*.25,index?-.6:.3,index?-.35:.15]}/>;
}
