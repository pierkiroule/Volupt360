import { TerrainGenerator } from "../landscape/TerrainGenerator";
import { composeObjects } from "../landscape/SceneComposer";
import { weatherScore } from "./weatherScore";
import type { Zone } from "./weatherModel";

/** One spatial grammar: the same deposits shape the land below and weather above. */
export class WeatherTerrain extends TerrainGenerator {
  constructor(readonly zones: Zone[]) { super(weatherScore(zones)); }
  height(x: number, z: number) {
    let h = super.height(x, z);
    for (const zone of this.zones) {
      const dx = x - zone.x * 28, dz = z - zone.y * 28;
      const width = 5 + zone.size * 30;
      const influence = Math.exp(-(dx * dx + dz * dz) / (width * width)) * zone.opacity;
      const relief = zone.kind === "storm" ? 3.5 : zone.kind === "snow" ? 2.5
        : zone.kind === "rain" ? -1.4 : zone.kind === "sun" ? .6
        : zone.kind === "wind" ? Math.sin(x * .2 + z * .1) * 1.2 : .3;
      h += influence * relief;
    }
    return h;
  }
}
export function composeWeatherWorld(zones: Zone[]) {
  const settings = weatherScore(zones), terrain = new WeatherTerrain(zones);
  const objects = composeObjects(settings, terrain);
  const x = terrain.river(13) + .6, z = 15;
  return { settings, terrain, objects,
    camera: [x, Math.max(terrain.height(x,z) + 5.5, 5), z] as [number,number,number],
    target: [terrain.river(0), Math.max(terrain.height(terrain.river(0),0) + 3, 3), 0] as [number,number,number] };
}
