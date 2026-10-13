import * as THREE from "three";
import { createPainterFlight } from "../engine/createPainterFlight.js";

/** Continuous flight, including silence. Triggers shape a bounded musical impulse. */
export function createSonoizoDance({ seed = 37 } = {}) {
  const flight = createPainterFlight(),
    triggers = new Map();
  const wind = new THREE.Vector3(),
    offset = new THREE.Vector3();
  const steering = new THREE.Vector2();
  let impulse = 0,
    bias = 0;
  const hash = (id) =>
    [...id].reduce(
      (n, char) => (Math.imul(n, 31) + char.charCodeAt(0)) >>> 0,
      seed,
    );
  return {
    steer(x, y) {
      steering.x = THREE.MathUtils.clamp(steering.x + x * 4, -1, 1);
      steering.y = THREE.MathUtils.clamp(steering.y + y * 4, -1, 1);
    },
    update(dt, voices) {
      const features = {
        energy: 0.12,
        low: 0.15,
        high: 0.18,
        flux: 0,
        freq: 1200,
        rms: 0,
      };
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
      const pose = flight.update(dt, features);
      const desired = pose.side
        .clone()
        .multiplyScalar(steering.x * 10)
        .addScaledVector(pose.up, steering.y * 10);
      wind.lerp(desired, 1 - Math.exp(-dt * 4));
      steering.multiplyScalar(Math.exp(-dt * 0.7));
      offset.addScaledVector(wind, dt).multiplyScalar(Math.exp(-dt * 0.15));
      offset.clampLength(0, 16);
      const velocity = pose.velocity
        .clone()
        .add(wind)
        .addScaledVector(offset, -0.15);
      const direction =
        velocity.lengthSq() > 0.001
          ? velocity.clone().normalize()
          : pose.direction.clone();
      const rotation = new THREE.Quaternion().setFromUnitVectors(
        pose.direction,
        direction,
      );
      return {
        ...pose,
        position: pose.position.clone().add(offset),
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
      flight.reset();
      triggers.clear();
      impulse = bias = 0;
    },
  };
}
