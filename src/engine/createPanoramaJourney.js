import * as THREE from "three";
/** Smooth travel; optional sculpture guidance keeps the flight near the artwork. */
export function createPanoramaJourney() {
  const position = new THREE.Vector3(0, 0, 20),
    direction = new THREE.Vector3(0, 0, -1);
  const focus = new THREE.Vector3(),
    desired = new THREE.Vector3(),
    delta = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const turnRotation = new THREE.Quaternion(),
    identityRotation = new THREE.Quaternion();
  const touchHeading = new THREE.Vector3(0, 0, -1),
    inward = new THREE.Vector3(),
    turnTarget = new THREE.Vector3();
  let touchActive = false,
    holdTime = 0,
    resumeMoving = false,
    recovery = 0;
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
    get touching() {
      return touchActive;
    },
    get speed() {
      return speed;
    },
    get throttle() {
      return touchActive ? THREE.MathUtils.smoothstep(holdTime, 0.28, 3.2) : 0;
    },
    setTouchControl(active, heading) {
      if (active && !touchActive) {
        resumeMoving = moving;
        holdTime = 0;
        returnWeight = 0;
        if (speed < 0.05 && heading?.lengthSq() > 0.001)
          direction.copy(heading).normalize();
      }
      if (!active && touchActive) {
        moving = resumeMoving;
        recovery = moving ? 1 : 0;
        phase = Math.atan2(position.z - focus.z, position.x - focus.x);
        holdTime = 0;
      }
      touchActive = active;
      if (heading?.lengthSq() > 0.001) touchHeading.copy(heading).normalize();
    },
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
      touchActive = false;
      holdTime = 0;
      resumeMoving = false;
      recovery = 0;
      moving = false;
    },
    reset(preserveSculpture = false) {
      position.set(0, 0, 20);
      direction.set(0, 0, -1);
      moving = false;
      touchActive = false;
      holdTime = 0;
      recovery = 0;
      resumeMoving = false;
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
      if (touchActive) {
        holdTime += dt;
        const throttle = THREE.MathUtils.smoothstep(holdTime, 0.28, 3.2);
        const manualCruise = resumeMoving ? 1.2 + throttle * 3 : throttle * 4.2;
        turnTarget.copy(touchHeading);
        if (guided) {
          inward.subVectors(focus, position);
          const distance = inward.length();
          if (distance > 0.01) {
            inward.divideScalar(distance);
            // A continuous inward bias grows only outside the sculpture's neighbourhood.
            const boundary = radius * 1.6;
            const attraction = THREE.MathUtils.smoothstep(
              distance,
              radius * 0.9,
              boundary,
            );
            turnTarget.lerp(inward, attraction * 0.92).normalize();
          }
        }
        turnRotation
          .setFromUnitVectors(direction, turnTarget)
          .slerp(identityRotation, Math.exp(-dt * 3.8));
        direction.applyQuaternion(turnRotation).normalize();
        speed +=
          (manualCruise - speed) *
          (1 - Math.exp(-dt * (manualCruise > speed ? 1.5 : 3.5)));
        position.addScaledVector(direction, speed * dt);
        lookTarget.copy(position).addScaledVector(direction, 3);
        returnWeight = 0;
        return;
      }

      if (guided && moving) {
        // A closed figure-eight alternates orbital views with crossings of the work.
        // Gaze never becomes an unbounded translation command.
        phase +=
          (dt * (1.1 + Math.sin(time * 0.19) * 0.12)) / Math.max(1.6, radius);
        path(phase, desired);
        delta.subVectors(desired, position);
        const gap = delta.length();
        if (gap > 0.0001) {
          turnTarget.copy(delta).normalize();
          if (recovery > 0.001) {
            turnRotation
              .setFromUnitVectors(direction, turnTarget)
              .slerp(identityRotation, Math.exp(-dt * 3));
            direction.applyQuaternion(turnRotation).normalize();
          } else direction.copy(turnTarget);
        }
        recovery *= Math.exp(-dt * 1.8);
        returnWeight = 1 - recovery;
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
