import * as THREE from "three";
type IslandMesh = THREE.InstancedMesh<
  THREE.PlaneGeometry,
  THREE.ShaderMaterial
>;
/** Twelve reusable islands; contact is measured in 3D, never from screen overlap. */
export class PigmentDynamics {
  private islands: {
    mesh: IslandMesh;
    slot: number;
    origin: THREE.Vector3;
    position: THREE.Vector3;
    phase: number;
    strength: number;
    kind: string;
  }[] = [];
  private matrix = new THREE.Matrix4();
  private offset = new THREE.Vector3();
  configure(meshes: IslandMesh[], ids: string[]) {
    this.islands.length = 0;
    for (let group = 0; group < meshes.length; group++) {
      const mesh = meshes[group];
      mesh.updateWorldMatrix(true, false);
      mesh.material.uniforms.reaction.value.set(0, 0, 0);
      for (let slot = 0; slot < 3; slot++) {
        mesh.getMatrixAt(slot, this.matrix);
        this.islands.push({
          mesh,
          slot,
          origin: new THREE.Vector3().setFromMatrixPosition(this.matrix),
          position: new THREE.Vector3(),
          phase: mesh.material.uniforms.phase.value + slot * 1.37,
          strength: 0,
          kind: ids[group % ids.length],
        });
      }
    }
  }
  update(time: number, dt: number) {
    let total = 0;
    for (const island of this.islands) {
      const p = island.phase;
      this.offset
        .set(
          Math.sin(time * 0.031 + p),
          Math.cos(time * 0.023 + p * 0.8),
          Math.sin(time * 0.019 + p * 1.1),
        )
        .multiplyScalar(0.65);
      island.position
        .copy(island.origin)
        .add(this.offset)
        .applyMatrix4(island.mesh.matrixWorld);
    }
    for (const island of this.islands) {
      let nearest = Infinity,
        neighbor: typeof island | undefined;
      for (const other of this.islands) {
        if (other === island || other.kind === island.kind) continue;
        const distance = island.position.distanceToSquared(other.position);
        if (distance < nearest) {
          nearest = distance;
          neighbor = other;
        }
      }
      const target = neighbor
        ? 1 - THREE.MathUtils.smoothstep(Math.sqrt(nearest), 1.5, 5)
        : 0;
      island.strength = THREE.MathUtils.damp(island.strength, target, 1.2, dt);
      const material = island.mesh.material;
      material.uniforms.reaction.value.setComponent(
        island.slot,
        island.strength,
      );
      if (neighbor)
        material.uniforms["neighbor" + island.slot].value.lerp(
          neighbor.mesh.material.uniforms.tint.value,
          1 - Math.exp(-dt * 0.8),
        );
      total += island.strength;
    }
    return total / Math.max(1, this.islands.length);
  }
}
