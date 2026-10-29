import * as THREE from "three";
import { universeIdentity } from "./UniverseIdentity";

/** Six overlapping fields, three loose clusters. Contact uses 3D envelopes,
 * never screen overlap. It is an artistic influence, not a fluid collision solver. */
export class ProjectiveComposition {
  readonly centers = Array.from({ length: 6 }, () => new THREE.Vector3());
  readonly neighbors = Array.from({ length: 6 }, () => new THREE.Vector3());
  readonly colors = Array.from({ length: 6 }, () => new THREE.Color());
  readonly contact = new Float32Array(6);
  readonly seed = { u: 0.5, v: 0.5, strength: 0 };
  private base = Array.from({ length: 6 }, () => new THREE.Vector3());
  private palette = Array.from({ length: 6 }, () => new THREE.Color());
  private layers = 1;
  private phase = 0;
  private initialized = false;
  setPalette(ids: string[]) {
    const identity = universeIdentity(ids);
    this.layers = identity.sequence.length;
    this.phase = (identity.seed % 6283) / 1000;
    for (let i = 0; i < 6; i++) {
      const cluster = Math.floor(i / 2),
        angle = cluster * 2.39996 + this.phase * 0.18;
      const radius = cluster === 0 ? 1.35 : 3.4;
      this.base[i].set(
        Math.sin(angle) * radius + ((i % 2) - 0.5) * 1.8,
        18 + Math.cos(angle) * 1.1 + ((i % 2) - 0.5) * 0.6,
        -5 + Math.cos(angle) * radius,
      );
      this.palette[i].set(identity.colors[i % this.layers]);
      this.colors[i].copy(this.palette[i]);
      this.contact[i] = 0;
    }
    this.initialized = false;
    this.update(0, 0);
    this.initialized = true;
  }
  update(time: number, dt: number) {
    if (this.initialized && dt <= 0) return;
    for (let i = 0; i < 6; i++) {
      const phase = this.phase + i * 2.17;
      this.centers[i].copy(this.base[i]);
      this.centers[i].x += Math.sin(time * 0.027 + phase) * 0.7;
      this.centers[i].y += Math.sin(time * 0.019 + phase * 0.7) * 0.45;
      this.centers[i].z += Math.cos(time * 0.023 + phase) * 0.7;
    }
    let strongest = 0;
    this.seed.strength = 0;
    for (let i = 0; i < 6; i++) {
      let nearest = Infinity,
        index = (i + 1) % 6;
      for (let j = 0; j < 6; j++) {
        if (i === j || (this.layers > 1 && i % this.layers === j % this.layers))
          continue;
        const distance = this.centers[i].distanceToSquared(this.centers[j]);
        if (distance < nearest) {
          nearest = distance;
          index = j;
        }
      }
      const influence =
        1 - THREE.MathUtils.smoothstep(Math.sqrt(nearest), 1.2, 5.5);
      this.contact[i] = THREE.MathUtils.damp(
        this.contact[i],
        influence,
        1.1,
        dt,
      );
      this.neighbors[i].copy(this.centers[i]).lerp(this.centers[index], 0.5);
      this.colors[i].lerp(this.palette[index], 1 - Math.exp(-dt * 0.7));
      if (this.contact[i] > strongest) {
        strongest = this.contact[i];
        const deltaX = this.neighbors[i].x - this.centers[i].x,
          deltaZ = this.neighbors[i].z - this.centers[i].z,
          az = i * 2.39996 * 0.75;
        const u = 0.5 + (deltaX * Math.cos(az) - deltaZ * Math.sin(az)) / 8;
        const v = 0.5 + (this.neighbors[i].y - this.centers[i].y) / 5;
        // Same stable field projection as the corresponding membrane.
        this.seed.u = THREE.MathUtils.clamp(
          (i % 2 ? 1 - v : u) * 0.82 + 0.06 + (i % 3) * 0.035,
          0.06,
          0.94,
        );
        this.seed.v = THREE.MathUtils.clamp(
          (i % 2 ? u : v) * 0.82 + 0.07 + (i % 2) * 0.04,
          0.06,
          0.94,
        );
        this.seed.strength = strongest;
      }
    }
  }
}
