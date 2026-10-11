import * as THREE from "three";

/** Connected, sound-shaped journeys. A phrase starts at the previous endpoint
 * with the previous tangent, weaving irregular orbits around a clear center.
 */
export function createPainterFlight() {
  const position = new THREE.Vector3(28, 0, 0);
  const direction = new THREE.Vector3(0, 0.4, 1).normalize();
  const side = new THREE.Vector3()
    .crossVectors(direction, new THREE.Vector3(0, 1, 0))
    .normalize();
  const up = new THREE.Vector3().crossVectors(side, direction).normalize();
  const velocity = new THREE.Vector3();
  const previous = new THREE.Vector3(),
    previousDirection = direction.clone();
  const quaternion = new THREE.Quaternion();
  let curve,
    progress = 0,
    duration = 5,
    phrase = 0,
    clock = 0,
    lastFrequency = 0;
  let smoothEnergy = 0,
    smoothLow = 0,
    smoothHigh = 0,
    smoothMotion = 0;

  function plan(features) {
    // Orbit a fixed sanctuary, with changing radius, altitude and inclination.
    // Bézier tangents keep the passage fluid rather than snapping to a ring.
    const angle = (phrase + 1) * 0.82;
    const radius = 25 + 11 * Math.sin(phrase * 0.63) + smoothLow * 13;
    const end = new THREE.Vector3(
      Math.cos(angle) * radius,
      Math.sin(angle * 1.7) * (9 + smoothHigh * 10),
      Math.sin(angle) * radius,
    );
    const endDirection = new THREE.Vector3(
      -Math.sin(angle),
      Math.cos(angle * 1.7) * 0.5,
      Math.cos(angle),
    ).normalize();
    const span = position.distanceTo(end);
    const first = position.clone().addScaledVector(direction, span * 0.4);
    const second = end.clone().addScaledVector(endDirection, -span * 0.4);
    second.addScaledVector(up, Math.sin(phrase * 1.3) * smoothHigh * 4);
    curve = new THREE.CubicBezierCurve3(position.clone(), first, second, end);
    duration = 4.6 + (1 - smoothEnergy) * 2.7;
    progress = 0;
    phrase++;
  }
  function update(dt, features) {
    const mix = 1 - Math.exp(-dt * 3);
    smoothEnergy += (features.energy - smoothEnergy) * mix;
    smoothLow += (features.low - smoothLow) * mix;
    smoothHigh += (features.high - smoothHigh) * mix;
    const novelty = Math.min(
      1,
      features.flux * 3 + Math.abs(features.freq - lastFrequency) / 1600,
    );
    smoothMotion += (novelty - smoothMotion) * (1 - Math.exp(-dt * 2));
    lastFrequency = features.freq;
    if (!curve) plan(features);
    previous.copy(position);
    previousDirection.copy(direction);
    let remaining = dt;
    while (remaining > 0) {
      const step = Math.min(remaining, (1 - progress) * duration);
      progress = Math.min(1, progress + step / duration);
      curve.getPoint(progress, position);
      curve.getTangent(progress, direction);
      remaining -= step;
      if (progress >= 1) plan(features);
    }
    // Parallel transport keeps the brush frame continuous even in vertical
    // passages, unlike an always-upright strip that flips at a steep climb.
    quaternion.setFromUnitVectors(previousDirection, direction);
    side
      .applyQuaternion(quaternion)
      .addScaledVector(direction, -side.dot(direction))
      .normalize();
    up.crossVectors(side, direction).normalize();
    velocity.copy(position).sub(previous).divideScalar(Math.max(0.001, dt));
    clock += dt;
    return {
      position,
      direction,
      side,
      up,
      velocity,
      energy: smoothEnergy,
      low: smoothLow,
      high: smoothHigh,
      motion: smoothMotion,
      time: clock,
    };
  }
  return {
    update,
    reset() {
      position.set(28, 0, 0);
      direction.set(0, 0.4, 1).normalize();
      side.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
      up.crossVectors(side, direction).normalize();
      velocity.set(0, 0, 0);
      curve = null;
      progress = 0;
      phrase = 0;
      clock = 0;
      lastFrequency = 0;
      smoothEnergy = smoothLow = smoothHigh = smoothMotion = 0;
    },
  };
}
