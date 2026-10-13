import * as THREE from "three";

/** Fixed anchors, one vocal per string; only the string interiors vibrate. */
export function createVocalConstellation({
  fragments,
  collide,
  getFeatures = () => ({}),
}) {
  const group = new THREE.Group(),
    sphere = new THREE.SphereGeometry(0.23, 8, 6);
  const dotMaterial = new THREE.MeshBasicMaterial({ color: 0x151515 });
  const points = fragments.map((_, i) => {
    const angle = (i * Math.PI * 2) / fragments.length;
    const radius = 25 + 7 * Math.sin(i * 0.63);
    const position = new THREE.Vector3(
      Math.cos(angle) * radius,
      Math.sin(angle * 1.7) * 11,
      Math.sin(angle) * radius,
    );
    const dot = new THREE.Mesh(sphere, dotMaterial);
    dot.position.copy(position);
    group.add(dot);
    return position;
  });
  const wave = new THREE.Mesh(
    new THREE.RingGeometry(0.9, 1, 48),
    new THREE.MeshBasicMaterial({
      color: 0x44404c,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  group.add(wave);
  let waveAge = 2;
  const segments = 16;
  const strings = fragments.map((fragment, i) => {
    const a = points[i],
      b = points[(i + 1) % points.length];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array((segments + 1) * 3), 3),
    );
    const material = new THREE.LineBasicMaterial({
      color: 0x343239,
      transparent: true,
      opacity: 0.17,
      depthWrite: false,
    });
    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    group.add(line);
    const normal = new THREE.Vector3()
      .subVectors(b, a)
      .cross(new THREE.Vector3(0, 1, 0))
      .normalize();
    return {
      id: fragment.id,
      a,
      b,
      normal,
      line,
      segment: new THREE.Line3(a, b),
      cooldown: 0,
      pulse: 0,
      pending: false,
    };
  });
  const previous = new THREE.Vector3(),
    probe = new THREE.Vector3(),
    closest = new THREE.Vector3();
  let initialized = false,
    time = 0,
    emissions = 0,
    disposed = false;
  return {
    group,
    count: fragments.length,
    gust(position, camera) {
      wave.position.copy(position);
      wave.quaternion.copy(camera.quaternion);
      waveAge = 0;
    },
    get collisionCount() {
      return emissions;
    },
    update(dt, pose) {
      time += dt;
      waveAge += dt;
      wave.scale.setScalar(0.5 + waveAge * 7);
      wave.material.opacity = Math.max(0, 1 - waveAge / 1.2) * 0.45;
      if (!initialized) {
        previous.copy(pose.position);
        initialized = true;
      }
      const features = getFeatures() || {};
      for (const string of strings) {
        string.cooldown = Math.max(0, string.cooldown - dt);
        string.pulse *= Math.exp(-dt * 1.4);
        string.segment.closestPointToPoint(pose.position, true, closest);
        const distance = closest.distanceTo(pose.position);
        const nearby = Math.max(0, 1 - distance / 9);
        const amplitude =
          nearby * (0.08 + (features.energy || 0) * 0.5) +
          string.pulse * (0.3 + (features.rms || 0) * 2);
        const position = string.line.geometry.attributes.position;
        for (let j = 0; j <= segments; j++) {
          const t = j / segments;
          probe
            .lerpVectors(string.a, string.b, t)
            .addScaledVector(
              string.normal,
              Math.sin(t * Math.PI) *
                Math.sin(
                  time * (12 + (features.high || 0) * 12) - t * Math.PI * 4,
                ) *
                amplitude,
            );
          position.setXYZ(j, probe.x, probe.y, probe.z);
        }
        position.needsUpdate = true;
        string.line.material.opacity = Math.min(
          0.65,
          0.17 + nearby * 0.12 + string.pulse * 0.25,
        );
        let touched = false;
        // Sample the swept bird segment to avoid missing strings between frames.
        const steps = Math.max(
          1,
          Math.ceil(previous.distanceTo(pose.position) / 0.7),
        );
        for (let j = 0; j <= Math.min(steps, 32); j++) {
          probe.lerpVectors(previous, pose.position, j / Math.min(steps, 32));
          string.segment.closestPointToPoint(probe, true, closest);
          if (probe.distanceToSquared(closest) < 1.8 ** 2) {
            touched = true;
            break;
          }
        }
        if (touched && !string.cooldown && !string.pending) {
          string.cooldown = 12;
          string.pending = true;
          Promise.resolve(collide(string.id))
            .then((played) => {
              if (!disposed && played) {
                string.pulse = 1;
                emissions++;
              }
            })
            .finally(() => {
              string.pending = false;
            });
        }
      }
      previous.copy(pose.position);
    },
    dispose() {
      disposed = true;
      group.removeFromParent();
      sphere.dispose();
      dotMaterial.dispose();
      wave.geometry.dispose();
      wave.material.dispose();
      for (const string of strings) {
        string.line.geometry.dispose();
        string.line.material.dispose();
      }
    },
  };
}
