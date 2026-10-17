import * as THREE from "three";

/** A restrained follow drone: framing responds to flight, never to scene size or loudness. */
export function createDroneChoreography() {
  const previous = new THREE.Vector3(),
    cross = new THREE.Vector3();
  const shot = {
    distance: 6.5,
    side: 0.5,
    height: 0.65,
    lookAhead: 0.35,
    frameSide: 0,
    frameUp: 0,
    bank: 0,
    fov: 86,
  };
  let initialized = false,
    turn = 0,
    climb = 0,
    speed = 0;
  function ease(key, target, dt, rate) {
    shot[key] += (target - shot[key]) * (1 - Math.exp(-dt * rate));
  }
  return {
    resetHeading() {
      initialized = false;
    },
    update(direction, velocity, dt) {
      dt = THREE.MathUtils.clamp(dt, 0, 0.1);
      const yaw =
        initialized && dt > 0
          ? cross.crossVectors(previous, direction).y / dt
          : 0;
      previous.copy(direction);
      initialized = true;
      turn +=
        (THREE.MathUtils.clamp(yaw, -0.9, 0.9) - turn) *
        (1 - Math.exp(-dt * 2.6));
      climb += (direction.y - climb) * (1 - Math.exp(-dt * 1.8));
      speed += (velocity.length() - speed) * (1 - Math.exp(-dt * 1.4));
      const curve = Math.min(1, Math.abs(turn) * 1.5);
      ease(
        "distance",
        6.2 +
          curve * 1.25 +
          Math.abs(climb) * 0.65 +
          THREE.MathUtils.clamp((speed - 4) / 6, 0, 1) * 0.55,
        dt,
        1.1,
      );
      ease("side", 0.5 + turn * 0.85, dt, 1.6);
      ease("height", 0.65 + Math.max(0, climb) * 0.6 + curve * 0.18, dt, 1.3);
      ease("lookAhead", 0.35 + curve * 0.35, dt, 1.6);
      ease("frameSide", turn * 0.4, dt, 1.6);
      ease("frameUp", 0.06 + climb * 0.16, dt, 1.4);
      ease("bank", THREE.MathUtils.clamp(-turn * 0.09, -0.075, 0.075), dt, 1.7);
      ease("fov", 86 + curve * 2, dt, 0.8);
      return shot;
    },
  };
}
