import * as THREE from "three";

/** Bounded, reproducible orbital bodies. Collisions use swept relative motion. */
export function createVocalFireflies({
  fragments,
  collide,
  seed = 73,
  proximityPull = 1.8,
}) {
  const group = new THREE.Group();
  const sphere = new THREE.SphereGeometry(0.25, 8, 6);
  const ringGeometry = new THREE.RingGeometry(0.9, 1, 40);
  let randomState = seed >>> 0,
    time = 0,
    disposed = false;
  const random = () => {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return randomState / 4294967296;
  };
  const previousBird = new THREE.Vector3(),
    relative = new THREE.Vector3(),
    delta = new THREE.Vector3(),
    attraction = new THREE.Vector3();
  let initialized = false,
    collisions = 0;
  const bodies = fragments.map((fragment, i) => {
    const color = new THREE.Color("#111111");
    const material = new THREE.MeshBasicMaterial({
      color,
      depthWrite: true,
    });
    const mesh = new THREE.Mesh(sphere, material);
    const ring = new THREE.Mesh(
      ringGeometry,
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    group.add(mesh, ring);
    return {
      id: fragment.id,
      mesh,
      ring,
      radius: 20 + random() * 15,
      phase: (i * Math.PI * 2) / fragments.length,
      speed: 0.07 + random() * 0.1,
      tilt: random() * Math.PI * 2,
      height: 6 + random() * 10,
      offset: new THREE.Vector3(),
      kick: new THREE.Vector3(),
      previous: new THREE.Vector3(),
      cooldown: 0,
      pulse: 2,
      pending: false,
    };
  });
  function orbit(body) {
    const angle = body.phase + time * body.speed;
    body.mesh.position
      .set(
        Math.cos(angle) * body.radius,
        Math.sin(angle * 1.7 + body.tilt) * body.height,
        Math.sin(angle) * body.radius,
      )
      .add(body.offset);
  }
  bodies.forEach(orbit);
  return {
    group,
    get collisionCount() {
      return collisions;
    },
    update(dt, pose, camera) {
      time += dt;
      if (!initialized) {
        previousBird.copy(pose.position);
        initialized = true;
      }
      for (const body of bodies) {
        body.previous.copy(body.mesh.position);
        // Only nearby, available bodies gently bend toward the bird.
        // Damped velocity and restoring offsets preserve their independent orbits.
        attraction.copy(pose.position).sub(body.mesh.position);
        const distance = attraction.length();
        if (!body.cooldown && distance > 0.001 && distance < 14) {
          body.kick.addScaledVector(
            attraction,
            (dt * proximityPull * (1 - distance / 14)) / distance,
          );
        }
        body.kick.multiplyScalar(Math.exp(-dt * 1.2));
        body.offset
          .addScaledVector(body.kick, dt)
          .multiplyScalar(Math.exp(-dt * 0.15));
        orbit(body);
        body.cooldown = Math.max(0, body.cooldown - dt);
        body.pulse += dt;
        if (body.pulse < 1.5) {
          body.ring.scale.setScalar(0.5 + body.pulse * 4);
          body.ring.material.opacity = (1 - body.pulse / 1.5) * 0.65;
          body.ring.quaternion.copy(camera.quaternion);
        } else body.ring.material.opacity = 0;
        relative.copy(body.previous).sub(previousBird);
        delta.copy(body.mesh.position).sub(pose.position).sub(relative);
        const closest = THREE.MathUtils.clamp(
          -relative.dot(delta) / Math.max(1e-9, delta.lengthSq()),
          0,
          1,
        );
        relative.addScaledVector(delta, closest);
        if (!body.pending && !body.cooldown && relative.lengthSq() < 2.3 ** 2) {
          // Deflection happens at every contact; the wave denotes an actual emission.
          body.kick
            .copy(pose.direction)
            .multiplyScalar(5)
            .add(new THREE.Vector3(0, 2, 0));
          body.cooldown = 12;
          body.pending = true;
          Promise.resolve(collide(body.id))
            .then((played) => {
              if (!disposed && played) {
                body.pulse = 0;
                body.ring.position.copy(body.mesh.position);
                collisions++;
              }
            })
            .finally(() => {
              body.pending = false;
            });
        }
      }
      previousBird.copy(pose.position);
    },
    dispose() {
      disposed = true;
      group.removeFromParent();
      sphere.dispose();
      ringGeometry.dispose();
      for (const body of bodies) {
        body.mesh.material.dispose();
        body.ring.material.dispose();
      }
    },
  };
}
