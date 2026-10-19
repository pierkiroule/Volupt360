import * as THREE from "three";
/** Smooth travel; optional sculpture guidance keeps the flight near the artwork. */
export function createPanoramaJourney() {
  const position = new THREE.Vector3(0, 0, 20),
    direction = new THREE.Vector3(0, 0, -1);
  const focus = new THREE.Vector3(),
    desired = new THREE.Vector3(),
    delta = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  let guided = false,
    radius = 8,
    time = 0,
    phase = 0,
    returnWeight = 0;
  function path(angle, output) {
    return output
      .set(
        Math.cos(angle) * radius,
        Math.sin(angle * 2) * radius * 0.18,
        Math.sin(angle * 2) * radius * 0.5,
      )
      .add(focus);
  }
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
    get lookTarget() {
      return lookTarget;
    },
    get guided() {
      return guided;
    },
    get focus() {
      return focus;
    },
    setSculpture(center, extent) {
      guided = true;
      focus.copy(center);
      radius = Math.max(1.6, Math.min(18, extent * 0.72));
      phase = Math.atan2(position.z - focus.z, position.x - focus.x);
      path(phase + 0.45, lookTarget);
    },
    travel(heading) {
      if (heading.lengthSq() < 0.001) return;
      direction.copy(heading).normalize();
      moving = true;
    },
    stop() {
      moving = false;
    },
    reset(preserveSculpture = false) {
      position.set(0, 0, 20);
      direction.set(0, 0, -1);
      moving = false;
      speed = 0;
      guided = preserveSculpture && guided;
      time = 0;
      returnWeight = 0;
    },
    steer(heading, dt) {
      if (!moving || heading.lengthSq() < 0.001) return;
      if (!guided)
        direction
          .lerp(heading, 1 - Math.exp(-Math.min(dt, 0.1) * 3))
          .normalize();
    },
    update(dt) {
      dt = THREE.MathUtils.clamp(dt, 0, 0.1);
      time += dt;
      if (guided && moving) {
        // A closed figure-eight alternates orbital views with crossings of the work.
        // Gaze never becomes an unbounded translation command.
        phase +=
          (dt * (1.1 + Math.sin(time * 0.19) * 0.12)) / Math.max(1.6, radius);
        path(phase, desired);
        delta.subVectors(desired, position);
        const gap = delta.length();
        if (gap > 0.0001) direction.copy(delta).normalize();
        returnWeight = 1;
        path(phase + 0.5, lookTarget);
        const cruise = 1.2 + Math.sin(time * 0.19) * 0.12;
        speed +=
          (Math.min(cruise, gap * 1.7) - speed) * (1 - Math.exp(-dt * 3));
        // Never overshoot the moving target, including on a slow frame.
        position.addScaledVector(direction, Math.min(gap, speed * dt));
        return;
      }
      const cruise = guided ? 1.2 + Math.sin(time * 0.19) * 0.18 : 0.9;
      speed += ((moving ? cruise : 0) - speed) * (1 - Math.exp(-dt * 4));
      position.addScaledVector(direction, speed * dt);
    },
  };
}
