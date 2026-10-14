import * as THREE from "three";

/** Soft pigment bodies; exact relative swept encounters, no screen-space picking. */
export function createCelestialBrushes(brushes, textures, onEncounter) {
  const group = new THREE.Group();
  const previousBird = new THREE.Vector3(),
    delta = new THREE.Vector3(),
    relative = new THREE.Vector3();
  const closest = new THREE.Vector3();
  let time = 0,
    initialized = false,
    lastHit = -Infinity,
    allowed = new Set();
  const bodies = brushes.map((brush, i) => {
    const material = new THREE.SpriteMaterial({
      map: textures.get(brush.id).texture,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.setScalar(5.8 + (i % 3) * 0.7);
    sprite.name = `celestial-${brush.id}`;
    group.add(sprite);
    return {
      brush,
      sprite,
      previous: new THREE.Vector3(),
      inside: false,
      cooldown: -Infinity,
      index: i,
    };
  });
  function place(body) {
    const i = body.index,
      phase = i * 2.399963 + time * (0.018 + (i % 4) * 0.002);
    const radius = 25 + 10 * Math.sin(time * 0.026 + i * 1.7);
    body.sprite.position.set(
      Math.cos(phase) * radius,
      Math.sin(phase * 1.7 + i) * 12,
      Math.sin(phase) * radius,
    );
  }
  return {
    group,
    setBrushes(ids) {
      allowed = new Set(ids);
      initialized = false;
      lastHit = -Infinity;
      bodies.forEach((body) => {
        body.sprite.visible = allowed.has(body.brush.id);
        body.inside = false;
        place(body);
        body.previous.copy(body.sprite.position);
      });
    },
    update(dt, bird) {
      time += dt;
      for (const body of bodies) {
        if (!body.sprite.visible) continue;
        place(body);
        if (initialized) {
          // Relative segment accounts for motion of both the bird and the body.
          relative.subVectors(previousBird, body.previous);
          delta.subVectors(bird, body.sprite.position).sub(relative);
          const t =
            delta.lengthSq() > 1e-10
              ? THREE.MathUtils.clamp(
                  -relative.dot(delta) / delta.lengthSq(),
                  0,
                  1,
                )
              : 0;
          closest.copy(relative).addScaledVector(delta, t);
          const touches = closest.lengthSq() < 2.6 * 2.6;
          if (
            touches &&
            !body.inside &&
            time - lastHit > 2.5 &&
            time - body.cooldown > 12
          ) {
            lastHit = body.cooldown = time;
            onEncounter(body.brush.id);
          }
          // Release only outside a larger radius to avoid boundary chatter.
          body.inside =
            bird.distanceToSquared(body.sprite.position) < 3.3 * 3.3;
        }
        body.previous.copy(body.sprite.position);
        body.sprite.material.rotation =
          Math.sin(time * 0.04 + body.index) * 0.12;
      }
      previousBird.copy(bird);
      initialized = true;
    },
    dispose() {
      bodies.forEach((body) => body.sprite.material.dispose());
      group.clear();
    },
  };
}
