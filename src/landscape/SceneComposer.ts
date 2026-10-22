import { TerrainGenerator } from "./TerrainGenerator";
import { chooseKind, BIOME_RULES } from "./BiomeComposer";
import { rng, type LandscapeSettings, type Placement } from "./types";
export function composeObjects(
  settings: LandscapeSettings,
  terrain: TerrainGenerator,
): Placement[] {
  const r = rng(settings.seed ^ 81437),
    objects: Placement[] = [],
    grid = new Map<string, Placement[]>(),
    target = Math.round(35 + settings.density * 320),
    clusters = Array.from({ length: 16 }, (_, i) => {
      const a = r() * Math.PI * 2,
        d = 9 + r() * 31;
      return {
        x: Math.sin(a) * d,
        z: Math.cos(a) * d,
        spread: 2 + r() * 6,
        id: i,
      };
    });
  for (
    let attempt = 0;
    attempt < target * 35 && objects.length < target;
    attempt++
  ) {
    const c = clusters[Math.floor(r() * clusters.length)],
      a = r() * Math.PI * 2,
      d = Math.sqrt(r()) * c.spread,
      x = c.x + Math.cos(a) * d,
      z = c.z + Math.sin(a) * d;
    if (Math.hypot(x, z) > 46) continue;
    // A quiet corridor between the arrival viewpoint and the central valley.
    if (Math.abs(x - terrain.river(z)) < 2.2 && z > -4 && z < 20) continue;
    const sample = terrain.sample(x, z);
    if (sample.submerged) continue;
    let kind = chooseKind(settings.biome, r());
    if (sample.slope > 0.65) kind = "rock";
    if (
      kind === "tree" &&
      (sample.slope > BIOME_RULES[settings.biome].treeSlope ||
        sample.height > 4.5)
    )
      continue;
    if (kind === "plant" && !sample.valley && r() < 0.5) continue;
    const scale =
        (kind === "tree"
          ? 1.6 + r() * 1.8
          : kind === "rock"
            ? 0.45 + r() * 1.3
            : 0.25 + r() * 0.45) * (sample.height > 5 ? 0.7 : 1),
      radius =
        kind === "tree"
          ? scale * 0.52
          : kind === "rock"
            ? scale * 0.65
            : scale * 0.6;
    const gx = Math.floor(x / 4),
      gz = Math.floor(z / 4);
    let collision = false;
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++)
        for (const other of grid.get(`${gx + dx},${gz + dz}`) || []) {
          const otherRadius =
            other.kind === "tree"
              ? other.scale * 0.52
              : other.kind === "rock"
                ? other.scale * 0.65
                : other.scale * 0.6;
          if (
            Math.hypot(x - other.x, z - other.z) <
            radius + otherRadius + 0.18
          )
            collision = true;
        }
    if (collision) continue;
    const p: Placement = {
      kind,
      x,
      y: sample.height - 0.03,
      z,
      scale,
      yaw: r() * Math.PI * 2,
      slope: sample.slope,
      distance: Math.hypot(x, z),
      cluster: c.id,
    };
    objects.push(p);
    const key = `${gx},${gz}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key)!.push(p);
  }
  return objects;
}
