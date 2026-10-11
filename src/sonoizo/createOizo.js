import * as THREE from "three";

/** A tiny tapered V. Forward is +Z; the existing flight remains the nozzle. */
export function createOizo() {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({
    color: "#284c55",
    side: THREE.DoubleSide,
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [0, 0, 0.15, 0.48, 0, -0.19, 0.06, 0, 0.02],
      3,
    ),
  );
  const wings = [-1, 1].map((side) => {
    const wing = new THREE.Mesh(geometry, material);
    wing.scale.x = side;
    group.add(wing);
    return wing;
  });
  const previousDirection = new THREE.Vector3();
  const cross = new THREE.Vector3();
  const basis = new THREE.Matrix4();
  const orientation = new THREE.Quaternion();
  const right = new THREE.Vector3();
  let previousTime,
    turn = 0,
    bank = 0,
    burst = 0,
    cooldown = 0;
  return {
    group,
    update(pose) {
      const first = previousTime === undefined;
      const dt = first
        ? 0
        : Math.max(0, Math.min(0.1, pose.time - previousTime));
      if (!first && dt > 0) {
        cross.crossVectors(previousDirection, pose.direction);
        const curvature = cross.length() / dt;
        turn += (curvature - turn) * (1 - Math.exp(-dt * 5));
        const targetBank = THREE.MathUtils.clamp(
          (-cross.dot(pose.up) / dt) * 0.65,
          -0.4,
          0.4,
        );
        bank += (targetBank - bank) * (1 - Math.exp(-dt * 4));
        cooldown = Math.max(0, cooldown - dt);
        // A short, two-beat burst only during a turn, separated by long glides.
        if (turn > 0.18 && cooldown === 0 && burst === 0) {
          burst = 1.1;
          cooldown = 3.8;
        }
        burst = Math.max(0, burst - dt);
      }
      right.copy(pose.side).negate();
      basis.makeBasis(right, pose.up, pose.direction);
      orientation.setFromRotationMatrix(basis);
      group.position.copy(pose.position);
      group.quaternion.copy(orientation);
      const progress = burst > 0 ? (1.1 - burst) / 1.1 : 0;
      const flap =
        Math.sin(progress * Math.PI * 4) * Math.sin(progress * Math.PI) * 0.3;
      wings[0].rotation.z = bank - flap;
      wings[1].rotation.z = bank + flap;
      previousDirection.copy(pose.direction);
      previousTime = pose.time;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      group.removeFromParent();
    },
  };
}
