import * as THREE from "three";

/** Continuous velocity field about one sanctuary. Inputs bend velocity, never teleport. */
export function createOrbitalFlight() {
  const position = new THREE.Vector3(28, 0, 0),
    velocity = new THREE.Vector3(0, 0.4, 4.8);
  const direction = new THREE.Vector3(0, 0, 1),
    side = new THREE.Vector3(-1, 0, 0),
    up = new THREE.Vector3(0, 1, 0);
  const radial = new THREE.Vector3(),
    tangent = new THREE.Vector3(),
    desired = new THREE.Vector3(),
    heading = new THREE.Vector3();
  const pose = {
    position,
    velocity,
    direction,
    side,
    up,
    time: 0,
    energy: 0,
    low: 0,
    high: 0,
    motion: 0,
    accent: 0,
    phrase: 0,
    progress: 0,
  };
  const worldUp = new THREE.Vector3(0, 1, 0);
  let angle = 0,
    previousAngle = 0;
  return {
    update(dt, audio, wind) {
      dt = THREE.MathUtils.clamp(dt, 0, 0.1);
      pose.time += dt;
      const radius = Math.max(1, Math.hypot(position.x, position.z));
      radial.set(position.x / radius, 0, position.z / radius);
      tangent.set(-radial.z, 0, radial.x);
      const orbitRadius = 24 + Math.sin(pose.time * 0.09) * 3;
      const shell =
        (orbitRadius - radius) * 0.7 -
        Math.max(0, radius - 32) * 2 +
        Math.max(0, 14 - radius) * 2.5;
      desired
        .copy(tangent)
        .multiplyScalar(4.8 + (audio.energy || 0) * 1.2)
        .addScaledVector(radial, shell)
        .add(wind);
      const circulation = desired.dot(tangent);
      if (circulation < 2.4)
        desired.addScaledVector(tangent, 2.4 - circulation);
      desired.y +=
        (Math.sin(angle * 1.5 + pose.time * 0.035) * 7 - position.y) * 0.65;
      desired.y = THREE.MathUtils.clamp(desired.y, -5, 5);
      desired.clampLength(0, 9);
      velocity.lerp(desired, 1 - Math.exp(-dt * 3.5));
      position.addScaledVector(velocity, dt);
      heading.copy(velocity).normalize();
      const bend = direction.angleTo(heading);
      direction.lerp(heading, 1 - Math.exp(-dt * 7)).normalize();
      side.crossVectors(direction, worldUp).normalize();
      up.crossVectors(side, direction).normalize();
      const nextAngle = Math.atan2(position.z, position.x);
      angle += Math.atan2(
        Math.sin(nextAngle - previousAngle),
        Math.cos(nextAngle - previousAngle),
      );
      previousAngle = nextAngle;
      pose.energy = audio.energy || 0;
      pose.low = audio.low || 0;
      pose.high = audio.high || 0;
      pose.motion = Math.min(1, bend * 8);
      pose.accent = audio.flux || 0;
      pose.phrase = Math.floor(Math.max(0, angle) / (Math.PI / 2));
      pose.progress = (((angle / (Math.PI / 2)) % 1) + 1) % 1;
      return pose;
    },
    reset() {
      position.set(28, 0, 0);
      velocity.set(0, 0.4, 4.8);
      direction.set(0, 0, 1);
      side.set(-1, 0, 0);
      up.set(0, 1, 0);
      pose.time = 0;
      angle = previousAngle = 0;
    },
  };
}
