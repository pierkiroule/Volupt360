import { WEATHER, random, type Zone } from "./weatherModel";
import { cosmoAnchor } from "./cosmoPosition";
/** A bounded, merged field of curved ink contours, without triangulated wireframes. */
export function buildFilaments(zones: Zone[], mobile: boolean) {
  const selected=[...zones].sort((a,b)=>b.size*b.opacity-a.size*a.opacity||a.seed-b.seed).slice(0,mobile?6:8);
  const segments=128, curves=4;
  const positions=new Float32Array(selected.length*segments*curves*6);
  const colors=new Float32Array(positions.length), phases=new Float32Array(positions.length/3);
  let cursor=0;
  for(const zone of selected){
    const r=random(zone.seed), anchor=cosmoAnchor(zone),palette=WEATHER.find(w=>w.id===zone.kind)!;
    const hex=palette.color.slice(1), rgb=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255);
    const radius=1.5+zone.size*7, phase=r()*6.28;
    for(let strand=0;strand<curves;strand++){
      const offset=(strand-1.5)*.13;
      for(let n=0;n<segments;n++)for(let end=0;end<2;end++){
        const t=(n+end)/segments, a=t*Math.PI*2;
        let x=0,y=0,z=0;
        if(zone.kind==='sun'||zone.kind==='fire'||zone.kind==='spark'){
          const petal=1+.14*Math.cos(a*4+phase)+.1*Math.sin(a*7-phase)+offset*.12;
          x=Math.cos(a)*radius*petal;y=Math.sin(a)*radius*petal;z=Math.sin(a*3+phase)*.5+offset;
        }else if(zone.kind==='wave'||zone.kind==='rain'||zone.kind==='wind'){
          x=(t-.5)*radius*4;y=Math.sin(t*8+phase+offset)*radius*.5+offset;z=Math.cos(t*6+phase)*radius*.6+strand*.1;
        }else if(zone.kind==='stone'||zone.kind==='storm'||zone.kind==='snow'){
          x=Math.cos(a)*radius*(.7+.15*Math.sin(a*3+phase));y=Math.sin(a)*radius*.8;z=Math.sin(a*2+strand*.5)*radius*.7+offset;
        }else{
          const coil=a*1.5+strand*.17;
          x=Math.cos(coil)*radius*(.7+t*.6);y=(t-.5)*radius*2+Math.sin(a+phase)*.3;z=Math.sin(coil)*radius*.8;
        }
        positions[cursor*3]=anchor[0]+x;positions[cursor*3+1]=anchor[1]+y;positions[cursor*3+2]=anchor[2]+z;
        for(let k=0;k<3;k++)colors[cursor*3+k]=rgb[k]*.66;
        phases[cursor]=phase+strand*.2;cursor++;
      }
    }
  }
  return {positions,colors,phases,selected};
}
