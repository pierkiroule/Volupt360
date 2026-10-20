import * as THREE from "three";
import { seededRandom } from "../transduction/engine.ts";
/** Fixed, seeded spatial sculpture: tangible lobes, continuous pigment streams and fine ink. */
export function createSensoryWorld(seed: number) {
  const random = seededRandom(seed),
    matrices: THREE.Matrix4[] = [],
    dummy = new THREE.Object3D();
  for (let i = 0; i < 44; i++) {
    const angle = i * 2.399963,
      radius = 3.5 + random() * 15,
      height = (random() - 0.5) * 19;
    dummy.position.set(
      Math.cos(angle) * radius,
      height,
      Math.sin(angle) * radius,
    );
    dummy.rotation.set(random() * 3, random() * 3, random() * 3);
    const size = 0.6 + random() * 1.45;
    dummy.scale.set(
      size * (1.5 + random()),
      size * (0.35 + random() * 0.6),
      size * (0.9 + random()),
    );
    dummy.updateMatrix();
    matrices.push(dummy.matrix.clone());
  }
  function ribbons(ink: boolean) {
    const positions: number[] = [],
      uvs: number[] = [],
      seeds: number[] = [],
      indices: number[] = [];
    const count = ink ? 28 : 22,
      steps = 100;
    for (let j = 0; j < count; j++) {
      const angle = random() * Math.PI * 2,
        radius = 3 + random() * 14,
        y = (random() - 0.5) * 15,
        phase = random() * 6,
        unique = random();
      const center = (t: number) =>
        new THREE.Vector3(
          Math.cos(angle + t * 2.5) * radius + Math.sin(t * 7 + phase) * 1.2,
          y + Math.sin(t * 6 + phase) * (1.3 + unique * 2),
          Math.sin(angle + t * 2.5) * radius,
        );
      const base = positions.length / 3;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps,
          p = center(t),
          tangent = center(t + 0.001)
            .sub(p)
            .normalize();
        const normal = new THREE.Vector3(
          Math.sin(phase + t),
          Math.cos(phase + t * 0.6),
          0.4,
        )
          .cross(tangent)
          .normalize();
        const width =
          (ink ? 0.014 + unique * 0.025 : 0.28 + unique * 0.8) *
          Math.pow(Math.sin(Math.PI * t), 0.5) *
          (1 + Math.sin(t * 18 + phase) * 0.17);
        for (const side of [-1, 1]) {
          positions.push(
            p.x + normal.x * width * side,
            p.y + normal.y * width * side,
            p.z + normal.z * width * side,
          );
          uvs.push(t, (side + 1) * 0.5);
          seeds.push(unique);
        }
        if (i < steps) {
          const a = base + i * 2;
          indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute("aSeed", new THREE.Float32BufferAttribute(seeds, 1));
    geometry.setIndex(indices);
    return geometry;
  }
  const points = new Float32Array(2400 * 3),
    seeds = new Float32Array(2400);
  for (let i = 0; i < 2400; i++) {
    const a = random() * Math.PI * 2,
      r = 2 + random() * 20;
    points.set(
      [Math.cos(a) * r, (random() - 0.5) * 22, Math.sin(a) * r],
      i * 3,
    );
    seeds[i] = random();
  }
  const particles = new THREE.BufferGeometry();
  particles.setAttribute("position", new THREE.BufferAttribute(points, 3));
  particles.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  return { matrices, ribbons: ribbons(false), ink: ribbons(true), particles };
}
