import * as THREE from "three";
import { createPointFlight } from "../engine/createPointFlight.js";
import { FLIGHT_FIGURES } from "../engine/createFlightAcrobatics.js";

// Adapt the existing bird pilot; pointer input never deposits paint.
export function createLearningFlight(
  canvas,
  camera,
  {
    seed = 811,
    reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches,
  } = {},
) {
  const flight = createPointFlight({
    seed,
    origin: new THREE.Vector3(),
    initialDirection: new THREE.Vector3(0, 0, -1),
    speedScale: 0.65,
  });
  const center = new THREE.Vector3();
  const right = new THREE.Vector3(),
    up = new THREE.Vector3(),
    target = new THREE.Vector3();
  const frame = { right, up };
  let pose = flight.update(0, {}),
    enabled = true,
    gesture = null,
    idle = 0,
    clock = 0,
    nextFigure = 24,
    figureIndex = 0,
    nearestId = null,
    requestedId = null;
  const listeners = [];
  function listen(name, handler) {
    canvas.addEventListener(name, handler);
    listeners.push(() => canvas.removeEventListener(name, handler));
  }
  function release(event) {
    if (event && event.pointerId !== gesture?.id) return;
    const id = gesture?.id;
    gesture = null;
    idle = 0;
    flight.releasePilot();
    if (id !== undefined && canvas.hasPointerCapture(id))
      canvas.releasePointerCapture(id);
  }
  listen("pointerdown", (event) => {
    if (!enabled || !event.isPrimary || event.button > 0) return;
    flight.beginPilot();
    requestedId = null;
    idle = 0;
    right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    gesture = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      inputX: 0,
      inputY: 0,
    };
    flight.setPilot(0, 0, frame);
    canvas.setPointerCapture(event.pointerId);
  });
  listen("pointermove", (event) => {
    if (!enabled || gesture?.id !== event.pointerId) return;
    const reach = Math.max(
      60,
      Math.min(120, Math.min(canvas.clientWidth, canvas.clientHeight) * 0.24),
    );
    const axis = (value) => {
      const n = Math.min(1, Math.abs(value) / reach);
      return Math.sign(value) * Math.max(0, (n - 0.035) / 0.965);
    };
    gesture.inputX = axis(event.clientX - gesture.x);
    gesture.inputY = axis(gesture.y - event.clientY);
    flight.setPilot(gesture.inputX, gesture.inputY, frame);
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((name) =>
    listen(name, release),
  );
  return {
    get pose() {
      return pose;
    },
    get state() {
      return {
        manual: Boolean(gesture),
        idle,
        nearestId,
        acrobatic: pose.acrobatics || null,
      };
    },
    setEnabled(value) {
      if (enabled === Boolean(value)) return;
      enabled = Boolean(value);
      if (!enabled) {
        release();
        flight.cancelAcrobatic();
      }
    },
    guide(id = null) {
      release();
      requestedId = id;
    },
    update(dt, audio, bubbles, visited, allowSurprise) {
      if (!enabled) return pose;
      clock += dt;
      idle = gesture ? 0 : idle + dt;
      let nearest = null,
        distance = Infinity;
      for (const bubble of bubbles) {
        if (visited.includes(bubble.id)) continue;
        const d = pose.position.distanceTo(bubble.mesh.position);
        if (bubble.id === requestedId) {
          nearest = bubble;
          distance = d;
          break;
        }
        if (d < distance - 0.001) {
          distance = d;
          nearest = bubble;
        }
      }
      nearestId = nearest?.id || null;
      if (nearest) target.copy(nearest.mesh.position);
      flight.setBubbleTarget(nearest ? target : null);
      flight.setOrbitTarget(center, 20);
      if (
        !reducedMotion &&
        allowSurprise &&
        !gesture &&
        idle > 4 &&
        clock >= nextFigure &&
        distance > 6 &&
        !pose.acrobatics
      ) {
        flight.beginAcrobatic(
          FLIGHT_FIGURES[figureIndex++ % FLIGHT_FIGURES.length].id,
        );
        nextFigure = clock + 28 + ((figureIndex * 7) % 17);
      }
      pose = flight.update(dt, audio);
      pose.pilotX = gesture?.inputX || 0;
      pose.pilotY = gesture?.inputY || 0;
      return pose;
    },
    dispose() {
      release();
      flight.cancelAcrobatic();
      listeners.forEach((remove) => remove());
    },
  };
}
