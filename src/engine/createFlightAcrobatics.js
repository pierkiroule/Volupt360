import { Vector3 } from "three";
export const FLIGHT_FIGURES = [
  { id: "loop", name: "Boucle céleste", duration: 8 },
  { id: "spiral", name: "Spirale des ailes", duration: 8 },
  { id: "infinity", name: "Ruban infini", duration: 9 },
];
/** Direction fields integrated by the existing flight; never assigns position. */
export function createFlightAcrobatics() {
  const forward = new Vector3(),
    up = new Vector3(),
    right = new Vector3();
  const result = {
    active: false,
    id: null,
    progress: 0,
    completed: false,
    direction: new Vector3(),
    up: new Vector3(),
    roll: 0,
  };
  let figure = null,
    time = 0;
  return {
    get active() {
      return Boolean(figure);
    },
    begin(id, direction, flightUp) {
      if (figure) return false;
      const selected = FLIGHT_FIGURES.find((x) => x.id === id);
      if (!selected) return false;
      figure = selected;
      time = 0;
      forward.copy(direction).normalize();
      right.crossVectors(forward, flightUp).normalize();
      up.crossVectors(right, forward).normalize();
      result.active = true;
      result.id = id;
      result.progress = 0;
      result.completed = false;
      result.roll = 0;
      result.direction.copy(forward);
      result.up.copy(up);
      return true;
    },
    cancel() {
      figure = null;
      result.active = false;
      result.id = null;
      result.completed = false;
      result.roll = 0;
    },
    update(dt) {
      result.completed = false;
      if (!figure) {
        result.active = false;
        result.id = null;
        result.roll = 0;
        return result;
      }
      time = Math.min(figure.duration, time + Math.max(0, dt));
      const p = time / figure.duration,
        angle = Math.PI * 2 * p - Math.sin(Math.PI * 2 * p),
        envelope = Math.sin(Math.PI * p) ** 2;
      result.progress = p;
      result.active = true;
      result.id = figure.id;
      result.roll = 0;
      if (figure.id === "loop") {
        result.direction
          .copy(forward)
          .multiplyScalar(Math.cos(angle))
          .addScaledVector(up, Math.sin(angle));
        result.up
          .copy(up)
          .multiplyScalar(Math.cos(angle))
          .addScaledVector(forward, -Math.sin(angle));
      } else {
        result.direction.copy(forward);
        if (figure.id === "spiral") {
          result.direction
            .addScaledVector(right, Math.sin(angle * 2) * envelope * 0.8)
            .addScaledVector(up, Math.cos(angle * 2) * envelope * 0.8);
          result.roll = angle;
        } else {
          result.direction
            .addScaledVector(right, Math.sin(angle) * 1.25)
            .addScaledVector(up, Math.sin(angle * 2) * 0.7);
        }
        result.direction.normalize();
        result.up
          .copy(up)
          .addScaledVector(result.direction, -up.dot(result.direction))
          .normalize();
      }
      if (time === figure.duration) {
        result.completed = true;
        figure = null;
      }
      return result;
    },
  };
}
