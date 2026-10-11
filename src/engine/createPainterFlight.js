import * as THREE from "three";

/** Connected, sound-shaped journeys. A phrase starts at the previous endpoint
 * with the previous tangent: no radial placement, teleport or fixed orbit.
 */
export function createPainterFlight() {
  const position = new THREE.Vector3();
  const direction = new THREE.Vector3(0.8, 0.18, -1).normalize();
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
    const seed = phrase * 2.399963 + features.freq / 1500;
    const endDirection = direction.clone();
    const yaw =
      phrase === 0 ? 0 : Math.sin(seed * 1.13) * (0.55 + smoothEnergy * 0.65);
    endDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    endDirection.y =
      Math.sin(phrase * 1.71 + features.freq / 850) * 0.58 +
      (smoothHigh - smoothLow) * 0.35;
    endDirection.normalize();
    const span = 18 + smoothEnergy * 19 + smoothMotion * 8;
    const end = position.clone().addScaledVector(endDirection, span);
    const first = position.clone().addScaledVector(direction, span * 0.38);
    const second = end.clone().addScaledVector(endDirection, -span * 0.32);
    // Audio changes bend the passage, lift it or make it dive; phase seeds
    // continue advancing when an audio loop repeats, so space keeps unfolding.
    second.addScaledVector(up, Math.sin(seed * 0.73) * (2 + smoothHigh * 6));
    second.addScaledVector(side, Math.cos(seed * 0.91) * (3 + smoothLow * 5));
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
      position.set(0, 0, 0);
      direction.set(0.8, 0.18, -1).normalize();
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
