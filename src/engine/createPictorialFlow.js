import * as THREE from "three";

// Finished deposits become bounded, inertial clouds. Geometry and texture stay shared.
export function createPictorialFlow() {
  const states = new WeakMap();
  const target = new THREE.Vector3(),
    force = new THREE.Vector3();
  const rotation = new THREE.Euler();
  return {
    update(mark, dt, audio, time, active) {
      if (active || dt <= 0) return 0;
      let state = states.get(mark);
      if (!state) {
        let seed = 0;
        for (const c of mark.traceId)
          seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
        state = {
          phase: (seed % 6283) / 1000,
          center: mark.bounds.getCenter(new THREE.Vector3()),
          bounds: mark.bounds.clone(),
          offset: new THREE.Vector3(),
          velocity: new THREE.Vector3(),
          emergence: 0,
        };
        states.set(mark, state);
      }
      const p = state.phase,
        t = time * 0.085;
      const energy = THREE.MathUtils.clamp(audio.energy || 0, 0, 1);
      const low = THREE.MathUtils.clamp(audio.low || 0, 0, 1);
      // A slow, moving attractor and a curl-like field; no beat-driven jumps.
      target.set(
        Math.sin(t + p) * (1.3 + low * 0.8),
        Math.sin(t * 0.71 + p * 1.7) * (0.7 + energy * 0.6),
        Math.cos(t * 0.83 + p) * (1.2 + low * 0.8),
      );
      force
        .copy(target)
        .sub(state.offset)
        .multiplyScalar(0.12 + energy * 0.06);
      state.velocity
        .addScaledVector(force, dt)
        .multiplyScalar(Math.exp(-dt * 0.85));
      state.offset.addScaledVector(state.velocity, dt).clampLength(0, 3.5);
      state.emergence += (1 - state.emergence) * (1 - Math.exp(-dt * 0.35));
      const turn = (0.04 + energy * 0.055) * state.emergence;
      rotation.set(
        Math.sin(t * 0.8 + p) * turn,
        Math.sin(t * 0.6 + p * 1.4) * turn,
        Math.cos(t * 0.7 + p) * turn,
      );
      mark.object.quaternion.setFromEuler(rotation);
      // Rotate about this deposit's own centre, never the scene origin.
      mark.object.position
        .copy(state.center)
        .applyQuaternion(mark.object.quaternion)
        .negate()
        .add(state.center)
        .add(state.offset);
      mark.object.updateMatrix();
      mark.bounds.copy(state.bounds).applyMatrix4(mark.object.matrix);
      return state.offset.length();
    },
  };
}
