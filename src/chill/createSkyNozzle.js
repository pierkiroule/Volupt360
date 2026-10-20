import * as THREE from "three";
/** A gliding nozzle: damped pursuit, finite speed, no jumps toward the finger. */
export function createSkyNozzle() {
  const position = new THREE.Vector3(),
    velocity = new THREE.Vector3(),
    desired = new THREE.Vector3();
  return {
    position,
    reset(point) {
      position.copy(point);
      velocity.set(0, 0, 0);
    },
    update(target, dt) {
      dt = THREE.MathUtils.clamp(dt, 0, 1 / 30);
      desired.subVectors(target, position).multiplyScalar(5);
      desired.clampLength(0, 6);
      velocity.lerp(desired, 1 - Math.exp(-dt * 7));
      position.addScaledVector(velocity, dt);
      return position;
    },
  };
}
