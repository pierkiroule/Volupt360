import type { Zone, WeatherId } from "./weatherModel";
export type PhenomenonKind = "sunflower" | "current" | "stone-feathers";
export const PHENOMENA: Record<PhenomenonKind, { kinds: readonly WeatherId[]; words: string[] }> = {
  sunflower: { kinds: ["sun", "fire", "prism", "spark"], words: ["frémissement", "éclore", "une étincelle", "presque"] },
  current: { kinds: ["wave", "rain", "wind", "fog"], words: ["passage", "effleurer", "entre", "au fil de l’eau"] },
  "stone-feathers": { kinds: ["stone", "storm", "snow", "cloud", "dusk", "aurora", "dream", "space"], words: ["en suspens", "ailleurs", "une autre forme", "l’intervalle"] },
};
export function selectPhenomena(zones: Zone[]) {
  return (Object.keys(PHENOMENA) as PhenomenonKind[]).flatMap(kind => {
    const zone = [...zones].filter(z=>PHENOMENA[kind].kinds.includes(z.kind))
      .sort((a,b)=>b.size*b.size*b.opacity-a.size*a.size*a.opacity || a.seed-b.seed)[0];
    return zone ? [{kind,zone}] : [];
  });
}
/** Position in the shared world, close enough to discover on the first flight. */
export function phenomenonPosition(zone: Zone): [number,number,number] {
  const angle=zone.x*Math.PI, radius=5+Math.hypot(zone.x,zone.y)*6;
  return [Math.sin(angle)*radius,-zone.y*5,4-Math.cos(angle)*radius];
}
/** Smooth deterministic fountain: seeds drift into a nearby liquid current. */
export function seedFlight(age:number, direction:readonly number[], index:number, target?:readonly number[], out?:number[]) {
  const launch=Math.min(age,2.2), bloom=Math.max(0,age-2.2);
  let x=Math.sin(index*2.4)*.3+direction[0]*bloom*1.25,
    y=launch*1.2+direction[1]*bloom*.85-bloom*bloom*.055,
    z=direction[2]*bloom*1.25;
  const carry=Math.min(.85,Math.max(0,(age-5)/5));
  if(target){x+=(target[0]-x)*carry;y+=(target[1]-y)*carry;z+=(target[2]-z)*carry;}
  const result=out || [0,0,0];
  result[0]=x;result[1]=y;result[2]=z;return result;
}

export function advanceSurprise(state:{time:number;next:number;birth:number;events:number}, distance:number) {
  if(state.time>state.next&&(distance<10||state.time>state.next+8)) {
    state.birth=state.time;state.next=state.time+24;state.events++;return true;
  }
  return false;
}
