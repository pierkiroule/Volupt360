import * as THREE from "three";
import { createPainterFlight } from "../engine/createPainterFlight.js";

/** Continuous flight, including silence. Triggers shape a bounded musical impulse. */
export function createSonoizoDance({ seed = 37 } = {}) {
  const flight = createPainterFlight(),
    triggers = new Map();
  const wind = new THREE.Vector3(),
    offset = new THREE.Vector3();
  const steering = new THREE.Vector2();
  let steeringFrame = null,
    hasPrevious = false;
  const previousPosition = new THREE.Vector3(),
    smoothDirection = new THREE.Vector3();
  let impulse = 0,
    bias = 0;
  const hash = (id) =>
    [...id].reduce(
      (n, char) => (Math.imul(n, 31) + char.charCodeAt(0)) >>> 0,
      seed,
    );
  return {
    steer(x, y, frame = null) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      steeringFrame = frame
        ? { right: frame.right.clone(), up: frame.up.clone() }
        : null;
      steering.x = THREE.MathUtils.clamp(steering.x + x * 2.2, -1, 1);
      steering.y = THREE.MathUtils.clamp(steering.y + y * 2.2, -1, 1);
      steering.clampLength(0, 0.65);
    },
    update(dt, voices, ambience = {}) {
      dt = THREE.MathUtils.clamp(dt, 0, 0.1);
      const features = {
        energy: 0.12,
        low: 0.15,
        high: 0.18,
        flux: 0,
        freq: 1200,
        rms: 0,
      };
      for (const key of ["energy", "low", "high", "flux", "rms"])
        features[key] = Math.max(features[key], ambience[key] || 0);
      if (ambience.freq) features.freq = ambience.freq;
      for (const voice of voices) {
        if (triggers.get(voice.id) !== voice.trigger) {
          triggers.set(voice.id, voice.trigger);
          impulse = Math.min(1, impulse + 0.35);
          bias = (hash(voice.id) % 1000) / 1000;
        }
        for (const key of ["energy", "low", "high", "flux", "rms"])
          features[key] = Math.max(features[key], voice.features[key] || 0);
        if (voice.features.freq) features.freq = voice.features.freq;
      }
      impulse *= Math.exp(-dt * 1.5);
      features.energy = Math.min(1, features.energy + impulse * 0.35);
      features.low = Math.min(1, features.low + impulse * bias * 0.3);
      features.high = Math.min(1, features.high + impulse * (1 - bias) * 0.4);
      features.flux = Math.min(1, features.flux + impulse * 0.2);
      const pose = flight.update(dt * 0.72, {
        ...features,
        energy: features.energy * 0.6,
        flux: features.flux * 0.35,
      });
      const desired = (steeringFrame?.right || pose.side)
        .clone()
        .multiplyScalar(steering.x * 5)
        .addScaledVector(steeringFrame?.up || pose.up, steering.y * 5);
      desired.addScaledVector(pose.up, (features.low - features.high) * 0.9);
      wind.lerp(desired, 1 - Math.exp(-dt * 2));
      steering.multiplyScalar(Math.exp(-dt * 1.15));
      offset.addScaledVector(wind, dt).multiplyScalar(Math.exp(-dt * 0.22));
      offset.clampLength(0, 8);
      const position = pose.position.clone().add(offset);
      const velocity =
        hasPrevious && dt > 0
          ? position.clone().sub(previousPosition).divideScalar(dt)
          : pose.velocity.clone().add(wind);
      const targetDirection =
        velocity.lengthSq() > 0.001
          ? velocity.clone().normalize()
          : pose.direction.clone();
      if (!hasPrevious) smoothDirection.copy(targetDirection);
      else
        smoothDirection
          .lerp(targetDirection, 1 - Math.exp(-dt * 4))
          .normalize();
      previousPosition.copy(position);
      hasPrevious = true;
      const direction = smoothDirection.clone();
      const rotation = new THREE.Quaternion().setFromUnitVectors(
        pose.direction,
        direction,
      );
      return {
        ...pose,
        position,
        direction,
        velocity,
        side: pose.side.clone().applyQuaternion(rotation),
        up: pose.up.clone().applyQuaternion(rotation),
        acoustic: features,
      };
    },
    reset() {
      wind.set(0, 0, 0);
      offset.set(0, 0, 0);
      steering.set(0, 0);
      steeringFrame = null;
      hasPrevious = false;
      flight.reset();
      triggers.clear();
      impulse = bias = 0;
    },
  };
}
