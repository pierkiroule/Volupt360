import { createPointFlight } from "../engine/createPointFlight.js";
import * as THREE from "three";
import { createOrbitalFlight } from "../engine/createOrbitalFlight.js";

/** Continuous flight, including silence. Triggers shape a bounded musical impulse. */
export function createSonoizoDance({ seed = 37, firstPerson = false } = {}) {
  const flight = firstPerson
      ? createPointFlight({ seed })
      : createOrbitalFlight(),
    triggers = new Map();
  const wind = new THREE.Vector3(),
    desired = new THREE.Vector3(),
    frameRight = new THREE.Vector3(-1, 0, 0),
    frameUp = new THREE.Vector3(0, 1, 0);
  const steering = new THREE.Vector2();
  let steeringFrame = null,
    holding = false,
    releaseTime = 0,
    visitMix = 0;
  const visitTarget = new THREE.Vector3();
  let hasVisitTarget = false;
  let impulse = 0,
    bias = 0;
  const hash = (id) =>
    [...id].reduce(
      (n, char) => (Math.imul(n, 31) + char.charCodeAt(0)) >>> 0,
      seed,
    );
  return {
    beginPilot() {
      if (firstPerson) flight.beginPilot();
      holding = true;
      releaseTime = 0;
      steering.set(0, 0);
    },
    setPilot(x, y, frame) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      if (firstPerson && frame) flight.setPilot(x, y, frame);
      holding = true;
      steering.set(x, y).clampLength(0, 1);
      if (frame) {
        steeringFrame ??= {
          right: new THREE.Vector3(),
          up: new THREE.Vector3(),
        };
        steeringFrame.right.copy(frame.right);
        steeringFrame.up.copy(frame.up);
      }
    },
    releasePilot() {
      if (firstPerson) flight.releasePilot();
      holding = false;
      releaseTime = 0;
    },
    setOrbitTarget(center, radius) {
      if (firstPerson) flight.setOrbitTarget(center, radius);
    },
    setVisitTarget(position) {
      hasVisitTarget = Boolean(position);
      if (position) visitTarget.copy(position);
    },
    steer(x, y, frame = null) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      steeringFrame = frame
        ? { right: frame.right.clone(), up: frame.up.clone() }
        : null;
      steering.x = THREE.MathUtils.clamp(steering.x + x * 4, -1, 1);
      steering.y = THREE.MathUtils.clamp(steering.y + y * 4, -1, 1);
      steering.clampLength(0, 0.95);
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
      desired
        .copy(steeringFrame?.right || frameRight)
        .multiplyScalar(steering.x * 7)
        .addScaledVector(steeringFrame?.up || frameUp, steering.y * 7);
      wind.lerp(desired, 1 - Math.exp(-dt * 7));
      if (!holding) steering.multiplyScalar(Math.exp(-dt * 3.5));
      releaseTime = holding ? 0 : releaseTime + dt;
      const visit =
        !firstPerson && hasVisitTarget && !holding && releaseTime > 0.7 ? 1 : 0;
      visitMix +=
        (visit - visitMix) * (1 - Math.exp(-dt * (holding ? 5 : 1.1)));
      const pose = flight.update(
        dt,
        features,
        wind,
        hasVisitTarget ? visitTarget : null,
        visitMix,
      );
      pose.pilotX = steering.x;
      pose.pilotY = steering.y;
      pose.visiting = visitMix;
      frameRight.copy(pose.side).negate();
      frameUp.copy(pose.up);
      return { ...pose, acoustic: features };
    },
    reset() {
      wind.set(0, 0, 0);
      steering.set(0, 0);
      steeringFrame = null;
      holding = false;
      releaseTime = visitMix = 0;
      hasVisitTarget = false;
      flight.reset();
      triggers.clear();
      impulse = bias = 0;
    },
  };
}
