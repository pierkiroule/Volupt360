import {useEffect,useMemo,useRef} from "react";
import {useFrame,useThree} from "@react-three/fiber";
import * as THREE from "three";
import {buildFilaments} from "./FilamentGeometry";
import {SilkVeil} from "./SilkVeil";
import {random,type Zone} from "./weatherModel";
export {cosmoAnchor} from "./cosmoPosition";
/** Two shared draw calls plus at most two pigment membranes. No per-frame buffer writes. */
export function CosmoMatter({zones,paused}:{zones:Zone[];paused:boolean}){
  const {gl}=useThree(),clock=useRef(0);
  const assets=useMemo(()=>{
    const mobile=innerWidth<700, field=buildFilaments(zones,mobile);
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(field.positions,3));
    geometry.setAttribute('color',new THREE.BufferAttribute(field.colors,3));
    geometry.setAttribute('phase',new THREE.BufferAttribute(field.phases,1));
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,vertexColors:true,
      uniforms:{time:{value:0},energy:{value:0}},
      vertexShader:`uniform float time,energy;attribute float phase;varying vec3 ink;void main(){vec3 p=position;float t=time*.17+phase;p.x+=sin(p.y*.3+t)*(.22+energy*.35);p.y+=sin(p.z*.24-t*.7)*.32;p.z+=cos(p.x*.2+t)*.25;ink=color;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader:`varying vec3 ink;void main(){gl_FragColor=vec4(ink,.64);\n#include <colorspace_fragment>\n}`});
    const count=mobile?120:200, r=random(zones.reduce((a,z)=>a^z.seed,93)), points=new Float32Array(count*3);
    for(let i=0;i<count;i++){points[i*3]=(r()-.5)*36;points[i*3+1]=(r()-.5)*22;points[i*3+2]=(r()-.5)*36;}
    const dust=new THREE.BufferGeometry();dust.setAttribute('position',new THREE.BufferAttribute(points,3));
    const dustMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0}},
      vertexShader:`uniform float time;void main(){vec3 p=position;p.y+=sin(time*.15+p.x)*.4;vec4 v=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*v;gl_PointSize=clamp(20./max(1.,-v.z),1.,3.);}`,
      fragmentShader:`void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(.36,.46,.46,(1.-d)*.5);}`});
    return {...field,geometry,material,dust,dustMaterial,count};
  },[zones]);
  useEffect(()=>()=>{assets.geometry.dispose();assets.material.dispose();assets.dust.dispose();assets.dustMaterial.dispose();},[assets]);
  useFrame((_,raw)=>{
    const dt=Math.min(raw,.05);if(!paused)clock.current+=dt;
    assets.material.uniforms.time.value=clock.current;assets.dustMaterial.uniforms.time.value=clock.current;
    gl.domElement.dataset.cosmos='sensory';gl.domElement.dataset.renderStyle='filaments';
    gl.domElement.dataset.particles=String(assets.count);gl.domElement.dataset.cosmoTime=clock.current.toFixed(3);
    gl.domElement.dataset.filamentZones=String(assets.selected.length);
    gl.domElement.dataset.drawCalls=String(gl.info.render.calls);
    gl.domElement.dataset.triangles=String(gl.info.render.triangles);
  });
  return <group name="Filament_cosmos">
    <lineSegments geometry={assets.geometry} material={assets.material} frustumCulled={false}/>
    <points geometry={assets.dust} material={assets.dustMaterial} frustumCulled={false}/>
    {assets.selected.slice(0,2).map((zone,index)=><SilkVeil key={zone.id} zone={zone} index={index} paused={paused}/>)}
  </group>;
}
