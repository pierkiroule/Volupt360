import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { random, WEATHER, type Zone } from "./weatherModel";
import { PHENOMENA, selectPhenomena, phenomenonPosition, seedFlight, advanceSurprise, type PhenomenonKind } from "./phenomenaConfig";

function texture(seed:number) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d')!, r=random(seed);
  ctx.fillStyle='#fff3d9';ctx.fillRect(0,0,128,128);
  for(let i=0;i<2600;i++){ctx.globalAlpha=.08+r()*.16;ctx.fillStyle=i%3?'#8b734d':'#ffffff';ctx.fillRect(r()*128,r()*128,.5+r()*2,.5+r()*2);}
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function ResonantWord({kind,zone,paused}:{kind:PhenomenonKind;zone:Zone;paused:boolean}) {
  const root=useRef<THREE.Sprite>(null), state=useRef({time:0,started:-100,next:7});
  const assets=useMemo(()=>{
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;
    const ctx=canvas.getContext('2d')!;
    ctx.font='italic 52px Georgia, serif';ctx.fillStyle='#384b58';ctx.textAlign='center';ctx.textBaseline='middle';
    const words=PHENOMENA[kind].words;ctx.fillText(words[zone.seed%words.length],512,64);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    const material=new THREE.SpriteMaterial({map,transparent:true,opacity:0,depthWrite:false});return {map,material};
  },[kind,zone.seed]);
  useEffect(()=>()=>{assets.map.dispose();assets.material.dispose();},[assets]);
  useFrame(({camera},raw)=>{
    if(paused)return;const s=state.current;s.time+=Math.min(raw,.05);
    const distance=root.current?.getWorldPosition(scratchWord).distanceTo(camera.position)??100;
    if(s.time>s.next&&distance<14){s.started=s.time;s.next=s.time+27+zone.seed%13;}
    const age=s.time-s.started;
    assets.material.opacity=age>=0&&age<7?Math.sin(Math.PI*age/7)*.7:0;
    if(root.current){root.current.position.y=2.9+Math.sin(age*.18)*.25;root.current.visible=assets.material.opacity>.005;}
  });
  return <sprite ref={root} material={assets.material} position={[0,2.9,1]} scale={[5.5,.69,1]}/>;
}
const scratchWord=new THREE.Vector3();
function Sunflower({zone,paused,target}:{zone:Zone;paused:boolean;target?:[number,number,number]}) {
  const petals=useRef<THREE.InstancedMesh>(null),seeds=useRef<THREE.InstancedMesh>(null),root=useRef<THREE.Group>(null),head=useRef<THREE.Group>(null);
  const state=useRef({time:0,next:4,birth:-100,events:0,near:0});
  const assets=useMemo(()=>{
    const r=random(zone.seed), dummy=new THREE.Object3D(), center=new THREE.Vector3();
    const grain=texture(zone.seed), petal=new THREE.SphereGeometry(1,12,7), seed=new THREE.IcosahedronGeometry(1,0);
    const petalMat=new THREE.MeshStandardMaterial({color:'#e5b958',roughness:.9,map:grain,side:THREE.DoubleSide});
    const seedMat=new THREE.MeshStandardMaterial({color:'#f0c36e',roughness:.8});
    const stem=new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(.2,-3,0),new THREE.Vector3(-.3,-1.6,.1),new THREE.Vector3(0,0,0)]),22,.055,5,false);
    const directions=Array.from({length:72},()=>{const a=r()*6.28,y=r()*1.7-.6,d=Math.sqrt(Math.max(0,1-y*y*.5));return [Math.cos(a)*d,y,Math.sin(a)*d];});
    return {grain,petal,seed,petalMat,seedMat,stem,directions,dummy,center,point:[0,0,0]};
  },[zone.seed]);
  useEffect(()=>()=>{assets.grain.dispose();assets.petal.dispose();assets.seed.dispose();assets.petalMat.dispose();assets.seedMat.dispose();assets.stem.dispose();},[assets]);
  useFrame(({camera,gl},raw)=>{
    const s=state.current;if(!paused)s.time+=Math.min(raw,.05);const t=s.time;
    if(root.current){root.current.rotation.z=Math.sin(t*.24)*.09;root.current.getWorldPosition(assets.center);}
    const distance=assets.center.distanceTo(camera.position);if(!paused)s.near=THREE.MathUtils.damp(s.near,distance<10?1:0,1.3,Math.min(raw,.05));
    if(!paused)advanceSurprise(s,distance);
    if(head.current)head.current.rotation.y=Math.sin(t*.13)*.24;
    if(petals.current)for(let i=0;i<36;i++){
      const a=i/18*Math.PI*2+(i>=18?.17:0), radius=.86+(i>=18?.15:0);
      const d=assets.dummy;d.position.set(Math.cos(a)*radius,Math.sin(a)*radius,Math.sin(a*3+t*.32)*.08);
      d.rotation.set(Math.sin(t*.18+a)*.14,.12*Math.cos(a),a-Math.PI/2);
      d.scale.set(.17,.62+s.near*.08,.065);d.updateMatrix();petals.current.setMatrixAt(i,d.matrix);
    }
    if(petals.current)petals.current.instanceMatrix.needsUpdate=true;
    const age=t-s.birth;
    if(seeds.current){
      seeds.current.visible=age>=0&&age<11;
      for(let i=0;i<72;i++){
        const p=seedFlight(age,assets.directions[i],i,target,assets.point),d=assets.dummy;
        d.position.set(p[0],p[1],p[2]);d.rotation.set(t*.5+i,i,t*.3);
        const fade=1-THREE.MathUtils.smoothstep(age,7,11);d.scale.setScalar((age<2.2?.04:.065)*fade);d.updateMatrix();seeds.current.setMatrixAt(i,d.matrix);
      }seeds.current.instanceMatrix.needsUpdate=true;
    }
    gl.domElement.dataset.sunflowerEvents=String(s.events);
  });
  return <group>
    <group ref={root}>
      <mesh geometry={assets.stem}><meshStandardMaterial color="#718b70" roughness={1}/></mesh>
      <group ref={head}>
        <instancedMesh ref={petals} args={[assets.petal,assets.petalMat,36]} frustumCulled={false}/>
        <mesh scale={[.57,.57,.19]}><sphereGeometry args={[1,24,12]}/><meshStandardMaterial color="#71543d" map={assets.grain} roughness={1}/></mesh>
        <mesh rotation={[0,0,-.6]} position={[.45,-1.7,0]} scale={[.6,.15,.08]}><sphereGeometry args={[1,12,6]}/><meshStandardMaterial color="#829574" roughness={1}/></mesh>
      </group>
    </group>
    <instancedMesh ref={seeds} args={[assets.seed,assets.seedMat,72]} frustumCulled={false}/>
  </group>;
}
function LiquidCurrent({zone,paused}:{zone:Zone;paused:boolean}) {
  const beads=useRef<THREE.InstancedMesh>(null),state=useRef({time:0,near:0}),root=useRef<THREE.Group>(null);
  const assets=useMemo(()=>{
    const palette=WEATHER.find(w=>w.id===zone.kind)!;
    const path=new THREE.CatmullRomCurve3(Array.from({length:35},(_,i)=>{const t=i/34*Math.PI*2;return new THREE.Vector3(Math.cos(t)*2.4,Math.sin(t*2)*.8,Math.sin(t)*1.7);}),true);
    const tube=new THREE.TubeGeometry(path,100,.09,6,true),grain=texture(zone.seed);
    const material=new THREE.MeshStandardMaterial({color:palette.color,map:grain,roughness:.5,transparent:true,opacity:.67});
    const bead=new THREE.SphereGeometry(1,8,6),beadMaterial=new THREE.MeshStandardMaterial({color:palette.secondary,roughness:.3,transparent:true,opacity:.85});
    return {path,tube,grain,material,bead,beadMaterial,dummy:new THREE.Object3D(),point:new THREE.Vector3(),center:new THREE.Vector3()};
  },[zone.kind,zone.seed]);
  useEffect(()=>()=>{assets.tube.dispose();assets.grain.dispose();assets.material.dispose();assets.bead.dispose();assets.beadMaterial.dispose();},[assets]);
  useFrame(({camera,gl},raw)=>{
    const s=state.current,dt=Math.min(raw,.05);if(!paused)s.time+=dt;
    root.current?.getWorldPosition(assets.center);
    if(!paused)s.near=THREE.MathUtils.damp(s.near,assets.center.distanceTo(camera.position)<10?1:0,1.5,dt);
    if(root.current){root.current.rotation.y=Math.sin(s.time*.11)*.25;root.current.scale.setScalar(1+s.near*.12);}
    if(beads.current){for(let i=0;i<48;i++){
      const u=((i/48-s.time*(.025+s.near*.012))%1+1)%1;
      assets.path.getPointAt(u,assets.point);const d=assets.dummy;
      d.position.copy(assets.point);d.position.y+=Math.sin(s.time*.3+i)*.08;
      const size=.06+(i%5)*.012;d.scale.set(size,size*(1.2+s.near*.8),size);d.rotation.z=u*6.28;d.updateMatrix();beads.current.setMatrixAt(i,d.matrix);
    }beads.current.instanceMatrix.needsUpdate=true;}
    gl.domElement.dataset.currentProximity=s.near.toFixed(3);
  });
  return <group ref={root}>
    <mesh geometry={assets.tube} material={assets.material}/>
    <mesh geometry={assets.tube} material={assets.material} scale={[.65,1.4,.65]} rotation={[.6,.4,.8]}/>
    <instancedMesh ref={beads} args={[assets.bead,assets.beadMaterial,48]} frustumCulled={false}/>
  </group>;
}
function StoneFeathers({zone,paused}:{zone:Zone;paused:boolean}) {
  const stones=useRef<THREE.InstancedMesh>(null),feathers=useRef<THREE.InstancedMesh>(null),root=useRef<THREE.Group>(null),state=useRef({time:0,near:0});
  const assets=useMemo(()=>{
    const grain=texture(zone.seed),r=random(zone.seed), stone=new THREE.IcosahedronGeometry(1,1),feather=new THREE.PlaneGeometry(.18,1,1,8);
    const p=feather.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);p.setX(i,p.getX(i)*Math.sin((y+.5)*Math.PI));p.setZ(i,Math.sin(y*4)*.1);}
    feather.computeVertexNormals();
    const a=new THREE.MeshStandardMaterial({color:'#a69aaa',map:grain,roughness:1});
    const b=new THREE.MeshStandardMaterial({color:WEATHER.find(w=>w.id===zone.kind)!.secondary,map:grain,side:THREE.DoubleSide,transparent:true,opacity:.8,roughness:1});
    const seeds=Array.from({length:64},()=>({a:r()*6.28,r:1+r()*2,y:(r()-.5)*3,p:r()*6.28}));
    return {grain,stone,feather,a,b,seeds,dummy:new THREE.Object3D(),center:new THREE.Vector3()};
  },[zone.seed,zone.kind]);
  useEffect(()=>()=>{assets.grain.dispose();assets.stone.dispose();assets.feather.dispose();assets.a.dispose();assets.b.dispose();},[assets]);
  useFrame(({camera,gl},raw)=>{
    const s=state.current,dt=Math.min(raw,.05);if(!paused)s.time+=dt;
    root.current?.getWorldPosition(assets.center);
    if(!paused)s.near=THREE.MathUtils.damp(s.near,assets.center.distanceTo(camera.position)<11?1:0,1,dt);
    const unfold=THREE.MathUtils.smoothstep(Math.sin(s.time*.2)*.5+.5+s.near*.2,.25,.9);
    if(stones.current)for(let i=0;i<7;i++){
      const o=assets.seeds[i],d=assets.dummy;d.position.set(Math.cos(o.a)*o.r, o.y+Math.sin(s.time*.2+o.p)*.2,Math.sin(o.a)*o.r);d.rotation.set(o.p,s.time*.05,o.a);d.scale.setScalar((.45+i*.035)*(1-unfold*.62));d.updateMatrix();stones.current.setMatrixAt(i,d.matrix);
    }
    if(feathers.current)for(let i=0;i<64;i++){
      const o=assets.seeds[i],d=assets.dummy,a=o.a+s.time*.07;
      d.position.set(Math.cos(a)*o.r*(1+unfold),o.y+unfold*(1+Math.sin(s.time*.24+o.p)),Math.sin(a)*o.r*(1+unfold));
      d.rotation.set(Math.sin(s.time*.3+o.p)*.5,a,Math.sin(s.time*.4+o.p));d.scale.setScalar((.35+i%3*.08)*unfold);d.updateMatrix();feathers.current.setMatrixAt(i,d.matrix);
    }
    if(stones.current)stones.current.instanceMatrix.needsUpdate=true;
    if(feathers.current)feathers.current.instanceMatrix.needsUpdate=true;
    gl.domElement.dataset.stoneUnfold=unfold.toFixed(3);
  });
  return <group ref={root}><instancedMesh ref={stones} args={[assets.stone,assets.a,7]} frustumCulled={false}/><instancedMesh ref={feathers} args={[assets.feather,assets.b,64]} frustumCulled={false}/></group>;
}
export function LivingPhenomena({zones,paused}:{zones:Zone[];paused:boolean}) {
  const choices=useMemo(()=>selectPhenomena(zones),[zones]);
  const {gl}=useThree();
  useEffect(()=>{gl.domElement.dataset.phenomena=choices.map(c=>c.kind).join(',');return()=>{delete gl.domElement.dataset.phenomena;};},[choices,gl]);
  const liquid=choices.find(c=>c.kind==='current');
  return <group name="Living_encounters">
    {choices.map(({kind,zone})=>{
      const position=phenomenonPosition(zone), destination=liquid?phenomenonPosition(liquid.zone):undefined;
      const target=destination?.map((v,i)=>(v-position[i])/(.9+zone.size)) as [number,number,number]|undefined;
      return <group key={kind} position={position} scale={.9+zone.size}>
        {kind==='sunflower'?<Sunflower zone={zone} paused={paused} target={target}/>:kind==='current'?<LiquidCurrent zone={zone} paused={paused}/>:<StoneFeathers zone={zone} paused={paused}/>}
        <ResonantWord kind={kind} zone={zone} paused={paused}/>
      </group>;
    })}
  </group>;
}
