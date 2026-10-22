import type { Zone } from "./weatherModel";
export function cosmoAnchor(zone: Zone): [number, number, number] {
  const angle=zone.x*Math.PI, radius=9+Math.hypot(zone.x,zone.y)*12;
  return [Math.sin(angle)*radius,-zone.y*9,-Math.cos(angle)*radius];
}
