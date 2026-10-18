import { createFlightAcrobatics } from "./createFlightAcrobatics.js";
import * as THREE from "three";

/** A stable point ahead, captured relative to the view at gesture start. */
export function createPointFlight({ seed = 37 } = {}) {
  const position = new THREE.Vector3(28, 0, 0),
    direction = new THREE.Vector3(0, 0, 1),
    velocity = new THREE.Vector3();
  const target = direction.clone(),
    right = new THREE.Vector3(-1, 0, 0),
    up = new THREE.Vector3(0, 1, 0),
    forward = direction.clone(),
    bubbleTarget = new THREE.Vector3(),
    orbitCenter = new THREE.Vector3(),
    orbitGoal = new THREE.Vector3(),
    radial = new THREE.Vector3(),
    tangent = new THREE.Vector3();
  const worldUp = new THREE.Vector3(0, 1, 0),
    side = new THREE.Vector3(),
    flightUp = new THREE.Vector3(),
    aimPoint = new THREE.Vector3();
  const a = new THREE.Quaternion(),
    b = new THREE.Quaternion(),
    z = new THREE.Vector3(0, 0, 1);
  const phase = ((Math.imul(seed, 1664525) >>> 0) / 4294967296) * Math.PI * 2;
  const acrobatics = createFlightAcrobatics();
  const candidateSide = new THREE.Vector3();
  let hasBubbleTarget = false;
  let captured = false,
    time = 0,
    holding = false,
    idleTime = 0,
    orbitRadius = 18,
    speed = 2.6,
    inputStrength = 0;
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
    beginAcrobatic(id) {
      holding = false;
      return acrobatics.begin(
        id,
        direction,
        flightUp.lengthSq() > 0.1 ? flightUp : worldUp,
      );
    },
    cancelAcrobatic() {
      acrobatics.cancel();
    },
    setBubbleTarget(position) {
      hasBubbleTarget = Boolean(position);
      if (position) bubbleTarget.copy(position);
    },
    setOrbitTarget(center, radius) {
      orbitGoal.copy(center);
      orbitRadius = THREE.MathUtils.clamp(radius * 0.85 + 5, 8, 28);
    },
    beginPilot() {
      acrobatics.cancel();
      holding = true;
      inputStrength = 0;
      idleTime = 0;
      target.copy(direction);
      captured = false;
    },
    setPilot(x, y, frame) {
      holding = true;
      inputStrength = Math.min(1, Math.hypot(x, y));
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
      holding = false;
      idleTime = 0;
      target.copy(direction);
      captured = false;
    },
    update(dt, audio) {
      dt = THREE.MathUtils.clamp(dt, 0, 0.1);
      time += dt;
      idleTime = holding ? 0 : idleTime + dt;
      orbitCenter.lerp(orbitGoal, 1 - Math.exp(-dt * 0.45));
      const figure = acrobatics.update(dt);
      pose.acrobatics = figure.id;
      pose.acrobaticsProgress = figure.progress;
      pose.acroRoll = figure.roll;
      if (figure.active) {
        speed += (3.1 - speed) * (1 - Math.exp(-dt * 1.3));
        direction.copy(figure.direction);
        velocity.copy(direction).multiplyScalar(speed);
        position.addScaledVector(velocity, dt);
        side.crossVectors(direction, figure.up).normalize();
        flightUp.crossVectors(side, direction).normalize();
        target.copy(direction);
        aimPoint.copy(position).addScaledVector(direction, 12);
        pose.time = time;
        pose.energy = audio.energy || 0;
        pose.motion = 0.5;
        pose.autonomous = false;
        idleTime = 0;
        return pose;
      }
      const autonomous = !holding && idleTime > 0.3;
      if (autonomous && hasBubbleTarget) {
        target.copy(bubbleTarget).sub(position);
        if (target.lengthSq() < 0.0001) target.copy(direction);
        else target.normalize();
      } else if (autonomous) {
        radial.copy(position).sub(orbitCenter);
        const distance = Math.max(0.001, Math.hypot(radial.x, radial.z));
        radial.set(radial.x / distance, 0, radial.z / distance);
        tangent.set(-radial.z, 0, radial.x);
        const radius =
          orbitRadius *
          (1 +
            Math.sin(time * 0.073 + phase) * 0.12 +
            Math.sin(time * 0.031 + 2 + phase * 1.7) * 0.07);
        target
          .copy(tangent)
          .multiplyScalar(2.6)
          .addScaledVector(
            radial,
            THREE.MathUtils.clamp((radius - distance) * 0.65, -5, 5),
          );
        target.y = THREE.MathUtils.clamp(
          (orbitCenter.y +
            Math.sin(time * 0.13 + phase) * 3 +
            Math.sin(time * 0.047 + phase * 2.3) * 2 -
            position.y) *
            0.5,
          -2,
          2,
        );
        target.normalize();
      }
      pose.autonomous = autonomous;
      a.setFromUnitVectors(z, direction);
      b.setFromUnitVectors(z, target);
      a.rotateTowards(
        b,
        Math.min(
          dt * (holding ? 1 : 0.55),
          a.angleTo(b) * (1 - Math.exp(-dt * (holding ? 8 : 2.2))),
        ),
      );
      direction.set(0, 0, 1).applyQuaternion(a).normalize();
      speed +=
        ((holding
          ? 2.1 + inputStrength * 1.5
          : hasBubbleTarget
            ? Math.max(
                0.6,
                Math.min(2.45, 0.5 + position.distanceTo(bubbleTarget) * 0.13),
              )
            : 2.45) -
          speed) *
        (1 - Math.exp(-dt * 2));
      velocity.copy(direction).multiplyScalar(speed);
      position.addScaledVector(velocity, dt);
      candidateSide.crossVectors(direction, worldUp);
      if (candidateSide.lengthSq() > 0.0001)
        side.copy(candidateSide).normalize();
      flightUp.crossVectors(side, direction).normalize();
      aimPoint.copy(position).addScaledVector(target, 12);
      pose.time = time;
      pose.energy = audio.energy || 0;
      pose.motion = direction.angleTo(target);
      return pose;
    },
    reset() {
      acrobatics.cancel();
      position.set(28, 0, 0);
      direction.set(0, 0, 1);
      target.copy(direction);
      velocity.set(0, 0, 0);
      captured = false;
      hasBubbleTarget = false;
      time = 0;
      holding = false;
      idleTime = 0;
      orbitCenter.set(0, 0, 0);
      orbitGoal.set(0, 0, 0);
      orbitRadius = 18;
      speed = 2.6;
      inputStrength = 0;
    },
  };
}
