import * as THREE from "three";
/** Translation follows a latched heading; looking around never steers the journey. */
export function createPanoramaJourney() {
  const position = new THREE.Vector3(0, 0, 20),
    direction = new THREE.Vector3(0, 0, -1);
  let moving = false,
    speed = 0;
  return {
    position,
    direction,
    get moving() {
      return moving;
    },
    travel(heading) {
      if (heading.lengthSq() < 0.001) return;
      direction.copy(heading).normalize();
      moving = true;
    },
    stop() {
      moving = false;
    },
    reset() {
      position.set(0, 0, 20);
      direction.set(0, 0, -1);
      moving = false;
      speed = 0;
    },
    steer(heading, dt) {
      if (!moving || heading.lengthSq() < 0.001) return;
      direction.lerp(heading, 1 - Math.exp(-Math.min(dt, 0.1) * 3)).normalize();
    },
    update(dt) {
      dt = THREE.MathUtils.clamp(dt, 0, 0.1);
      speed += ((moving ? 0.9 : 0) - speed) * (1 - Math.exp(-dt * 4));
      position.addScaledVector(direction, speed * dt);
    },
  };
}
