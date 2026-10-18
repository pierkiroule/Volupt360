import * as THREE from "three";

/** A stable point ahead, captured relative to the view at gesture start. */
export function createPointFlight() {
  const position = new THREE.Vector3(28, 0, 0),
    direction = new THREE.Vector3(0, 0, 1),
    velocity = new THREE.Vector3();
  const target = direction.clone(),
    right = new THREE.Vector3(-1, 0, 0),
    up = new THREE.Vector3(0, 1, 0),
    forward = direction.clone();
  const worldUp = new THREE.Vector3(0, 1, 0),
    side = new THREE.Vector3(),
    flightUp = new THREE.Vector3(),
    aimPoint = new THREE.Vector3();
  const a = new THREE.Quaternion(),
    b = new THREE.Quaternion(),
    z = new THREE.Vector3(0, 0, 1);
  let captured = false,
    time = 0;
  const pose = {
    position,
    direction,
    velocity,
    side,
    up: flightUp,
    aimPoint,
    time: 0,
    energy: 0,
    motion: 0,
    phrase: 0,
    progress: 0,
  };
  return {
    beginPilot() {
      captured = false;
    },
    setPilot(x, y, frame) {
      if (!captured) {
        right.copy(frame.right).normalize();
        up.copy(frame.up).normalize();
        forward.crossVectors(up, right).normalize();
        captured = true;
      }
      target
        .copy(forward)
        .addScaledVector(right, x * 0.85)
        .addScaledVector(up, y * 0.65)
        .normalize();
      target.y = THREE.MathUtils.clamp(target.y, -0.85, 0.85);
      target.normalize();
    },
    releasePilot() {
      target.copy(direction);
      captured = false;
    },
    update(dt, audio) {
      dt = THREE.MathUtils.clamp(dt, 0, 0.1);
      time += dt;
      a.setFromUnitVectors(z, direction);
      b.setFromUnitVectors(z, target);
      a.slerp(b, 1 - Math.exp(-dt * 3));
      direction.set(0, 0, 1).applyQuaternion(a).normalize();
      velocity.copy(direction).multiplyScalar(2.6);
      position.addScaledVector(velocity, dt);
      side.crossVectors(direction, worldUp).normalize();
      flightUp.crossVectors(side, direction).normalize();
      aimPoint.copy(position).addScaledVector(target, 12);
      pose.time = time;
      pose.energy = audio.energy || 0;
      pose.motion = direction.angleTo(target);
      return pose;
    },
    reset() {
      position.set(28, 0, 0);
      direction.set(0, 0, 1);
      target.copy(direction);
      velocity.set(0, 0, 0);
      captured = false;
      time = 0;
    },
  };
}
