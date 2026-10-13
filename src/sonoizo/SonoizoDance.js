import * as THREE from "three";
import { createPainterFlight } from "../engine/createPainterFlight.js";

/** Continuous flight, including silence. Triggers shape a bounded musical impulse. */
export function createSonoizoDance({ seed = 37 } = {}) {
  const flight = createPainterFlight(),
    triggers = new Map();
  const wind = new THREE.Vector3(),
    offset = new THREE.Vector3();
  let pendingWind = null;
  let impulse = 0,
    bias = 0;
  const hash = (id) =>
    [...id].reduce(
      (n, char) => (Math.imul(n, 31) + char.charCodeAt(0)) >>> 0,
      seed,
    );
  return {
    blow(x, y) {
      pendingWind = { x, y };
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
      if (pendingWind) {
        wind
          .addScaledVector(pose.side, -pendingWind.x * 5)
          .addScaledVector(pose.up, pendingWind.y * 5)
          .addScaledVector(pose.direction, 2);
        wind.clampLength(0, 7);
        pendingWind = null;
      }
      wind.multiplyScalar(Math.exp(-dt * 0.9));
      offset.addScaledVector(wind, dt).multiplyScalar(Math.exp(-dt * 0.15));
      offset.clampLength(0, 8);
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
      pendingWind = null;
      flight.reset();
      triggers.clear();
      impulse = bias = 0;
    },
  };
}
