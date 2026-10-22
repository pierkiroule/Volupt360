import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { LivingPhenomena } from "./LivingPhenomena";
import { ProjectiveVeil } from "./ProjectiveAtmosphere";
import { WEATHER, pigment, random, type Zone } from "./weatherModel";
import { getLandscapeMusic } from "../landscape/StrudelMusicEngine";

export function cosmoAnchor(zone: Zone): [number, number, number] {
  const angle = zone.x * Math.PI, elevation = -zone.y * 9;
  const radius = 9 + Math.hypot(zone.x, zone.y) * 12;
  return [Math.sin(angle) * radius, elevation, -Math.cos(angle) * radius];
}
function Island({ zone, paused }: {zone: Zone; paused: boolean}) {
  const root = useRef<THREE.Group>(null), time = useRef(0);
  const texture = useMemo(() => {
    const w = WEATHER.find(w=>w.id===zone.kind)!;
    const t = new THREE.CanvasTexture(pigment(zone.seed,w.secondary));
    t.colorSpace = THREE.SRGBColorSpace; return t;
  }, [zone.seed, zone.kind]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  useFrame((_,dt)=>{
    if(!paused) time.current += Math.min(dt,.05);
    if(root.current) {
      root.current.position.y = Math.sin(time.current*.13+zone.seed)*.75;
      root.current.rotation.y = Math.sin(time.current*.065+zone.seed)*.25;
    }
  });
  return <group position={cosmoAnchor(zone)} scale={1.2+zone.size*4}>
    <group ref={root}>
      <ProjectiveVeil zone={zone} paused={paused}/>
      <group rotation={[.7,1.1,.4]} scale={[.9,1.4,1]}><ProjectiveVeil zone={{...zone,seed:zone.seed^713,opacity:zone.opacity*.7}} paused={paused}/></group>
      {[0,1,2].map(i=><sprite key={i} position={[(i-1)*1.2,Math.sin(i+zone.seed),i*.7]} scale={[5,3.5,1]}>
        <spriteMaterial map={texture} transparent depthWrite={false} opacity={zone.opacity*.42}/>
      </sprite>)}
    </group>
  </group>;
}
/** Folded pigment currents: dry edges and capillary channels, without bloom. */
function DreamRibbon({zone,index,paused}:{zone:Zone;index:number;paused:boolean}) {
  const time=useRef(0);
  const assets=useMemo(()=>{
    const palette=WEATHER.find(w=>w.id===zone.kind)!;
    const geometry=new THREE.PlaneGeometry(12,7,48,16);
    const material=new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,
      uniforms:{time:{value:0},phase:{value:zone.seed%71},ink:{value:new THREE.Color(palette.color)},wash:{value:new THREE.Color(palette.secondary)},opacity:{value:zone.opacity}},
      vertexShader:`uniform float time,phase;varying vec2 uvPaint;void main(){uvPaint=uv;vec3 p=position;float t=time*.12+phase;p.z+=sin(p.x*.5+t)*1.6+cos(p.y*.7-t)*.6;p.y+=sin(p.x*.6+t*.7)*.5;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader:`uniform float time,phase,opacity;uniform vec3 ink,wash;varying vec2 uvPaint;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){vec2 uv=uvPaint;float n=noise(uv*vec2(14,9)+phase);float cap=noise(uv*vec2(58,31));float flow=.5+.09*sin(uv.x*9.+phase+time*.08);float width=.1+.065*n;float d=abs(uv.y-flow);float edge=1.-smoothstep(width-.018,width+.025,d);float ends=smoothstep(0.,.16,uv.x)*smoothstep(0.,.2,1.-uv.x);float rim=1.-smoothstep(.008,.028,abs(d-width+.015));float grain=hash(floor(uv*520.));float channel=pow(.5+.5*sin(uv.x*58.+sin(uv.y*42.)*3.+cap*7.),10.);float a=edge*ends*(.25+n*.23+rim*.4+channel*.15)*opacity;vec3 c=mix(ink,wash,n*.8);c*=.82+grain*.18;c=mix(c,ink,rim*.5);gl_FragColor=vec4(c,a);
#include <colorspace_fragment>
}`});
    return {geometry,material};
  },[zone.kind,zone.seed,zone.opacity]);
  useEffect(()=>()=>{assets.geometry.dispose();assets.material.dispose();},[assets]);
  useFrame((_,dt)=>{if(!paused)time.current+=Math.min(dt,.05);assets.material.uniforms.time.value=time.current;});
  return <mesh geometry={assets.geometry} material={assets.material}
    position={[Math.sin(index*2.3)*3,Math.cos(index*1.8)*2,-3-index*1.5]}
    rotation={[index*.23,index*.28,(index-1.5)*.6]} />;
}
/** Bounded shared geometry: particles, pigment orbits, floating mineral relics. */
export function CosmoMatter({zones, paused}:{zones:Zone[];paused:boolean}) {
  const {gl} = useThree();
  const pebbles = useRef<THREE.InstancedMesh>(null), motes = useRef<THREE.Points>(null);
  const clock=useRef(0), energy=useRef(0), samples=useRef(new Float32Array(512));
  const selected=useMemo(()=>[...zones].sort((a,b)=>b.size*b.opacity-a.size*a.opacity).slice(0,12),[zones]);
  const assets=useMemo(()=>{
    const seed=zones.reduce((n,z)=>n^z.seed,513), r=random(seed);
    const count=innerWidth<700?1000:1800;
    const positions=new Float32Array(count*3), colors=new Float32Array(count*3), phases=new Float32Array(count), characters=new Float32Array(count);
    const anchors=selected.map(cosmoAnchor), color=new THREE.Color();
    for(let i=0;i<count;i++) {
      const zone=selected[i%selected.length], anchor=anchors[i%anchors.length]||[0,0,0];
      const a=r()*Math.PI*2, d=2+r()*10;
      positions.set([anchor[0]+Math.cos(a)*d,anchor[1]+(r()-.5)*12,anchor[2]+Math.sin(a)*d],i*3);
      const palette=WEATHER.find(w=>w.id===zone?.kind)||WEATHER[0];
      color.set(i%2?palette.color:palette.secondary).toArray(colors,i*3); phases[i]=r()*6.28;
      characters[i]=zone?.kind==='wave'||zone?.kind==='wind'?1:zone?.kind==='storm'?2:zone?.kind==='spark'||zone?.kind==='prism'?3:zone?.kind==='stone'?4:zone?.kind==='fire'||zone?.kind==='sun'?5:0;
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
    geometry.setAttribute('phase',new THREE.BufferAttribute(phases,1));
    geometry.setAttribute('character',new THREE.BufferAttribute(characters,1));
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,vertexColors:true,
      uniforms:{time:{value:0},energy:{value:0},ratio:{value:Math.min(devicePixelRatio,1.4)}},
      vertexShader:`uniform float time,energy,ratio;attribute float phase,character;varying vec3 tint;varying float alpha;void main(){vec3 p=position;float t=time*(.13+sin(phase)*.025);p.x+=sin(t+phase+p.y*.17)*(1.+energy*1.8);p.y+=sin(t*.7+phase)*1.4;p.z+=cos(t*.8+phase+p.x*.1)*1.1;
      if(character>.5&&character<1.5){p.y+=sin(p.x*.3-t*2.)*1.3;p.x+=sin(t+phase)*2.;}
      if(character>1.5&&character<2.5){p.z+=sin(t*1.7+phase)*sin(t*.6)*1.4;}
      if(character>2.5&&character<3.5){p.y+=sin(t*1.8+phase)*.7;}
      if(character>3.5&&character<4.5){p.y+=sin(t*.4+phase)*.2;}
      if(character>4.5){p.y+=sin(t*.8+phase)*2.;p.x+=sin(t+phase)*.4;}
      vec4 v=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*v;gl_PointSize=clamp((38.+sin(phase)*16.+energy*30.)*ratio/max(1.,-v.z),1.3,12.);tint=color;alpha=.45+.25*sin(t+phase)*sin(t+phase);}`,
      fragmentShader:`varying vec3 tint;varying float alpha;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(tint,alpha*pow(1.-d,1.8));\n#include <colorspace_fragment>\n}`});
    const stone=new THREE.IcosahedronGeometry(1,2), p=stone.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const n=1+Math.sin(x*7+y*4)*Math.cos(z*8)*.12;p.setXYZ(i,x*n,y*n*.55,z*n);}
    stone.computeVertexNormals();
    const texture=new THREE.CanvasTexture(pigment(seed,'#b8a8b3'));texture.colorSpace=THREE.SRGBColorSpace;
    const stoneMaterial=new THREE.MeshStandardMaterial({color:'#ddd5cb',roughness:.95,map:texture,bumpMap:texture,bumpScale:.1,transparent:true,opacity:.85});
    const relics=Array.from({length:36},(_,i)=>{const anchor=anchors[i%anchors.length]||[0,0,0];return {x:anchor[0]+(r()-.5)*12,y:anchor[1]+(r()-.5)*9,z:anchor[2]+(r()-.5)*12,s:.18+r()*.7,p:r()*6.28};});
    const linePositions=new Float32Array(selected.length*140*6), lineColors=new Float32Array(linePositions.length);
    selected.forEach((zone,index)=>{
      const anchor=cosmoAnchor(zone), palette=WEATHER.find(w=>w.id===zone.kind)!;
      const c=new THREE.Color(palette.color);
      for(let n=0;n<140;n++)for(let end=0;end<2;end++) {
        const a=(n+end)/140*Math.PI*2, rad=3+zone.size*8;
        const k=(index*140*2+n*2+end)*3;
        linePositions.set([anchor[0]+Math.cos(a)*rad,anchor[1]+Math.sin(a*3+zone.seed)*1.4,anchor[2]+Math.sin(a)*rad*.65],k);c.toArray(lineColors,k);
      }
    });
    const lines=new THREE.BufferGeometry();lines.setAttribute('position',new THREE.BufferAttribute(linePositions,3));lines.setAttribute('color',new THREE.BufferAttribute(lineColors,3));
    const lineMaterial=new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.22,depthWrite:false});
    return {geometry,material,stone,stoneMaterial,texture,relics,lines,lineMaterial,dummy:new THREE.Object3D(),count};
  },[zones,selected]);
  useEffect(()=>()=>{assets.geometry.dispose();assets.material.dispose();assets.stone.dispose();assets.stoneMaterial.dispose();assets.texture.dispose();assets.lines.dispose();assets.lineMaterial.dispose();},[assets]);
  useEffect(()=>{
    if (!pebbles.current) return;
    const color=new THREE.Color();
    assets.relics.forEach((_,i)=>{
      const zone=selected[i%selected.length];
      const palette=WEATHER.find(w=>w.id===zone?.kind)||WEATHER[0];
      color.set(palette.secondary).lerp(new THREE.Color('#faf2df'),.22);
      pebbles.current!.setColorAt(i,color);
    });
    if(pebbles.current.instanceColor)pebbles.current.instanceColor.needsUpdate=true;
  },[assets,selected]);
  useFrame((_,raw)=>{
    const dt=Math.min(raw,.05);if(!paused)clock.current+=dt;
    const t=clock.current;
    const signal=paused?0:Math.min(1,getLandscapeMusic().sampleEnergy(samples.current)*5);
    if(!paused) energy.current=THREE.MathUtils.damp(energy.current,signal,2,dt);
    assets.material.uniforms.time.value=t;assets.material.uniforms.energy.value=energy.current;
    if(pebbles.current){assets.relics.forEach((o,i)=>{const d=assets.dummy;d.position.set(o.x,o.y+Math.sin(t*.18+o.p)*.7,o.z);d.rotation.set(t*.035+o.p,t*.06+o.p,Math.sin(t*.1+o.p)*.3);d.scale.setScalar(o.s*(1+energy.current*.12));d.updateMatrix();pebbles.current!.setMatrixAt(i,d.matrix);});pebbles.current.instanceMatrix.needsUpdate=true;}
    assets.lineMaterial.opacity=.17+energy.current*.14;
    gl.domElement.dataset.cosmos='sensory';gl.domElement.dataset.particles=String(assets.count);
    gl.domElement.dataset.cosmoTime=t.toFixed(3);
  });
  return <group name="Sensory_cosmos">
    <LivingPhenomena zones={zones} paused={paused}/>
    {selected.slice(0,4).map((z,i)=><DreamRibbon key={z.id} zone={z} index={i} paused={paused}/>)}
    {selected.map(z=><Island key={z.id} zone={z} paused={paused}/>)}
    {selected.slice(0,6).map((z,i)=>{
      const anchor=cosmoAnchor(z);
      return <group key={'confluence'+z.id} position={[anchor[0]*.3,anchor[1]*.3,anchor[2]*.3]}
        scale={[3.2,2.8,2]} rotation={[.15*Math.sin(i),i*.65,.22*Math.cos(i)]}>
        <ProjectiveVeil zone={{...z,seed:z.seed^337,opacity:Math.min(1,z.opacity*1.3)}} paused={paused}/>
      </group>;
    })}
    <points ref={motes} geometry={assets.geometry} material={assets.material} frustumCulled={false}/>
    <lineSegments geometry={assets.lines} material={assets.lineMaterial}/>
    <instancedMesh ref={pebbles} args={[assets.stone,assets.stoneMaterial,36]} frustumCulled={false}/>
  </group>;
}
