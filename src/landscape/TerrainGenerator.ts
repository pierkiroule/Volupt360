import * as THREE from "three";
import type { LandscapeSettings } from "./types";
function hash(x: number, z: number, seed: number) {
  let n = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ seed;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
function noise(x: number, z: number, seed: number) {
  const ix = Math.floor(x),
    iz = Math.floor(z),
    u = x - ix,
    v = z - iz,
    a = u * u * (3 - 2 * u),
    b = v * v * (3 - 2 * v);
  return (
    THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(hash(ix, iz, seed), hash(ix + 1, iz, seed), a),
      THREE.MathUtils.lerp(
        hash(ix, iz + 1, seed),
        hash(ix + 1, iz + 1, seed),
        a,
      ),
      b,
    ) *
      2 -
    1
  );
}
export class TerrainGenerator {
  readonly waterLevel: number;
  readonly size = 112;
  constructor(readonly settings: LandscapeSettings) {
    this.waterLevel =
      settings.biome === "coast"
        ? -1.2
        : settings.biome === "dream"
          ? -3.3
          : -3.6;
  }
  fractal(x: number, z: number) {
    let value = 0,
      amplitude = 0.55;
    for (let i = 0; i < 4; i++) {
      value += noise(x, z, this.settings.seed + i * 71) * amplitude;
      x *= 2.03;
      z *= 2.03;
      amplitude *= 0.48;
    }
    return value;
  }
  river(z: number) {
    return (
      Math.sin(z * 0.075 + (this.settings.seed % 100) * 0.02) * 4 +
      Math.sin(z * 0.18) * 1.3
    );
  }
  height(x: number, z: number) {
    const s = this.settings,
      amplitude = 1.4 + s.relief * 7;
    const warp = this.fractal(x * 0.025 + 8, z * 0.025 - 3) * 2.7;
    const n = this.fractal((x + warp) * 0.055, (z - warp) * 0.055);
    const valley = 1 - Math.exp(-Math.pow((x - this.river(z)) / 4, 2));
    let h = -1;
    if (s.biome === "mountain")
      h =
        -1 +
        Math.pow(Math.max(0, 1 - Math.abs(n)), 2.7) * amplitude * 1.6 +
        this.fractal(x * 0.13, z * 0.13) * s.relief * 0.8;
    else if (s.biome === "desert")
      h =
        -1 +
        Math.sin(x * 0.12 + Math.sin(z * 0.045) * 2.7 + n) * amplitude * 0.38 +
        n * amplitude * 0.26;
    else if (s.biome === "coast")
      h =
        -1.1 +
        Math.tanh((x + Math.sin(z * 0.085) * 4) / 9) * amplitude * 0.4 +
        n * amplitude * 0.5;
    else if (s.biome === "dream")
      h =
        -1 +
        n * amplitude * 0.85 +
        Math.sin(x * 0.1) * Math.cos(z * 0.1) * amplitude * 0.3;
    else
      h =
        -1 +
        n * amplitude * 0.55 +
        valley * amplitude * 0.22 -
        (1 - valley) * 2.6;
    const edge = THREE.MathUtils.smoothstep(Math.hypot(x, z), 22, 55);
    return h + edge * (s.biome === "mountain" ? 3 : 1.2);
  }
  sample(x: number, z: number) {
    const h = this.height(x, z),
      e = 0.35,
      dx = (this.height(x + e, z) - this.height(x - e, z)) / (2 * e),
      dz = (this.height(x, z + e) - this.height(x, z - e)) / (2 * e);
    return {
      height: h,
      slope: Math.hypot(dx, dz),
      normal: new THREE.Vector3(-dx, 1, -dz).normalize(),
      valley: Math.abs(x - this.river(z)) < 4,
      submerged: h < this.waterLevel + 0.12,
    };
  }
  geometry(mobile: boolean) {
    const g = new THREE.PlaneGeometry(
      this.size,
      this.size,
      mobile ? 112 : 160,
      mobile ? 112 : 160,
    );
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    const colors = new Float32Array(p.count * 3);
    const base = new THREE.Color(
        this.settings.biome === "desert"
          ? "#d6b47d"
          : this.settings.biome === "mountain"
            ? "#919b8d"
            : this.settings.biome === "coast"
              ? "#bcbb91"
              : this.settings.biome === "dream"
                ? "#aaa5b7"
                : "#81956e",
      ),
      light = new THREE.Color("#d8d3b2"),
      rock = new THREE.Color("#777b78"),
      color = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i),
        h = this.height(x, z);
      p.setY(i, h);
      const shade = 0.5 + this.fractal(x * 0.11 + 2, z * 0.11) * 0.28;
      color
        .copy(base)
        .lerp(light, shade * 0.36)
        .lerp(rock, THREE.MathUtils.smoothstep(h, 3, 9) * 0.5);
      if (h < this.waterLevel + 0.4) color.lerp(light, 0.4);
      color.toArray(colors, i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
}
