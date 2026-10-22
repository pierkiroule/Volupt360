import { TerrainGenerator } from "./TerrainGenerator";
import { composeObjects } from "./SceneComposer";
import type { LandscapeSettings } from "./types";
export function composeLandscape(settings: LandscapeSettings) {
  const terrain = new TerrainGenerator(settings),
    objects = composeObjects(settings, terrain);
  const x = terrain.river(13) + 0.6,
    z = 15;
  return {
    settings,
    terrain,
    objects,
    camera: [x, Math.max(terrain.height(x, z) + 5.5, 5), z] as [
      number,
      number,
      number,
    ],
    target: [terrain.river(0), terrain.height(terrain.river(0), 0) + 1, 0] as [
      number,
      number,
      number,
    ],
  };
}
export type ComposedLandscape = ReturnType<typeof composeLandscape>;
