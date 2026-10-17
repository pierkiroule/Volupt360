import * as THREE from "three";

/** A voice is a passage, not a proximity trigger. Geometry is shared by 24 portals. */
export function createVocalRings({ fragments, collide }) {
  const group = new THREE.Group();
  const geometry = new THREE.TorusGeometry(2.1, 0.045, 5, 56);
  const previous = new THREE.Vector3(),
    relative = new THREE.Vector3(),
    crossing = new THREE.Vector3(),
    normal = new THREE.Vector3();
  let time = 0,
    initialized = false,
    collisions = 0,
    silence = 0,
    pending = false,
    disposed = false;
  const rings = fragments.map((fragment, i) => {
    const angle = i * 2.3999632297;
    const radius = 12 + (i % 4) * 5;
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL((i * 0.061 + 0.55) % 1, 0.24, 0.38),
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
      }),
    );
    mesh.position.set(
      Math.cos(angle) * radius,
      Math.sin(i * 1.7) * 10,
      Math.sin(angle) * radius,
    );
    mesh.lookAt(0, mesh.position.y * 0.3, 0);
    group.add(mesh);
    return { id: fragment.id, mesh, cooldown: 0, resonance: 0 };
  });
  return {
    group,
    get count() {
      return rings.length;
    },
    get collisionCount() {
      return collisions;
    },
    update(dt, pose, enabled = true) {
      time += dt;
      silence = Math.max(0, silence - dt);
      if (!initialized || !enabled) {
        previous.copy(pose.position);
        initialized = true;
      }
      for (let i = 0; i < rings.length; i++) {
        const ring = rings[i],
          mesh = ring.mesh;
        ring.cooldown = Math.max(0, ring.cooldown - dt);
        ring.resonance *= Math.exp(-dt * 0.65);
        mesh.scale.setScalar(
          1 + Math.sin(time * 0.21 + i) * 0.025 + ring.resonance * 0.12,
        );
        mesh.material.opacity = 0.38 + ring.resonance * 0.35;
        normal.set(0, 0, 1).applyQuaternion(mesh.quaternion);
        const a = relative.copy(previous).sub(mesh.position).dot(normal);
        const b = relative.copy(pose.position).sub(mesh.position).dot(normal);
        if (!enabled || pending || silence || ring.cooldown || a * b >= 0)
          continue;
        crossing
          .copy(previous)
          .lerp(pose.position, a / (a - b))
          .sub(mesh.position);
        if (crossing.lengthSq() > (2.1 * mesh.scale.x) ** 2) continue;
        pending = true;
        ring.cooldown = 24;
        Promise.resolve()
          .then(() => (disposed ? false : collide(ring.id)))
          .then((played) => {
            if (!disposed && played) {
              collisions++;
              ring.resonance = 1;
              silence = 10;
            }
          })
          .catch(() => {})
          .finally(() => {
            pending = false;
          });
      }
      previous.copy(pose.position);
    },
    dispose() {
      disposed = true;
      group.removeFromParent();
      geometry.dispose();
      rings.forEach((ring) => ring.mesh.material.dispose());
    },
  };
}
