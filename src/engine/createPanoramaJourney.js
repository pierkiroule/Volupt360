import * as THREE from "three";
/** Smooth travel; optional sculpture guidance keeps the flight near the artwork. */
export function createPanoramaJourney() {
  const position = new THREE.Vector3(0, 0, 20),
    direction = new THREE.Vector3(0, 0, -1);
  const focus = new THREE.Vector3(),
    inward = new THREE.Vector3(),
    tangent = new THREE.Vector3(),
    up = new THREE.Vector3(0, 1, 0),
    requested = direction.clone(),
    desired = new THREE.Vector3();
  let guided = false,
    radius = 12,
    time = 0,
    returnWeight = 0;
  let moving = false,
    speed = 0;
  return {
    position,
    direction,
    get moving() {
      return moving;
    },
    get returnWeight() {
      return returnWeight;
    },
    get focus() {
      return focus;
    },
    setSculpture(center, extent) {
      guided = true;
      focus.copy(center);
      radius = Math.max(6, Math.min(22, extent));
    },
    travel(heading) {
      if (heading.lengthSq() < 0.001) return;
      direction.copy(heading).normalize();
      requested.copy(direction);
      moving = true;
    },
    stop() {
      moving = false;
    },
    reset() {
      position.set(0, 0, 20);
      direction.set(0, 0, -1);
      moving = false;
      speed = 0;
      guided = false;
      time = 0;
      returnWeight = 0;
    },
    steer(heading, dt) {
      if (!moving || heading.lengthSq() < 0.001) return;
      requested.copy(heading).normalize();
      if (!guided)
        direction
          .lerp(heading, 1 - Math.exp(-Math.min(dt, 0.1) * 3))
          .normalize();
    },
    update(dt) {
      dt = THREE.MathUtils.clamp(dt, 0, 0.1);
      time += dt;
      if (guided && moving) {
        inward.subVectors(focus, position);
        const distance = inward.length();
        inward.normalize();
        returnWeight = THREE.MathUtils.smoothstep(
          distance,
          radius * 0.65,
          radius * 1.25,
        );
        tangent.crossVectors(inward, up);
        if (tangent.lengthSq() < 0.01) tangent.set(1, 0, 0);
        tangent.normalize();
        desired
          .copy(requested)
          .multiplyScalar(1 - returnWeight)
          .addScaledVector(inward, returnWeight * 1.8)
          .addScaledVector(tangent, 0.22 + returnWeight * 0.35);
        desired.y += Math.sin(time * 0.23) * 0.09 * (1 - returnWeight);
        desired.normalize();
        direction.lerp(desired, 1 - Math.exp(-dt * 1.4)).normalize();
      }
      const cruise = guided ? 1.2 + Math.sin(time * 0.19) * 0.18 : 0.9;
      speed += ((moving ? cruise : 0) - speed) * (1 - Math.exp(-dt * 4));
      position.addScaledVector(direction, speed * dt);
    },
  };
}
