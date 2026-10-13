import * as THREE from "three";
import { ENCOUNTER_LIMITS } from "./traceConfig.js";

/** Exact closest distance between finite 3D segments, including degenerate ones. */
export function createTraceEncounter(memory, options = {}) {
  const limits = { ...ENCOUNTER_LIMITS, ...options };
  const previous = new THREE.Vector3(),
    d1 = new THREE.Vector3(),
    d2 = new THREE.Vector3(),
    r = new THREE.Vector3(),
    bird = new THREE.Vector3(),
    point = new THREE.Vector3();
  let initialized = false,
    lastEncounter = -Infinity,
    count = 0,
    candidates = 0;
  const clamp = (value) => THREE.MathUtils.clamp(value, 0, 1);
  function distance(a, b, c, d) {
    d1.subVectors(b, a);
    d2.subVectors(d, c);
    r.subVectors(a, c);
    const aa = d1.lengthSq(),
      ee = d2.lengthSq(),
      ff = d2.dot(r);
    let s = 0,
      t = 0;
    if (aa <= 1e-12) t = ee > 1e-12 ? clamp(ff / ee) : 0;
    else {
      const cc = d1.dot(r);
      if (ee <= 1e-12) s = clamp(-cc / aa);
      else {
        const bb = d1.dot(d2),
          denominator = aa * ee - bb * bb;
        s = denominator > 1e-12 ? clamp((bb * ff - cc * ee) / denominator) : 0;
        t = (bb * s + ff) / ee;
        if (t < 0) {
          t = 0;
          s = clamp(-cc / aa);
        } else if (t > 1) {
          t = 1;
          s = clamp((bb - cc) / aa);
        }
      }
    }
    bird.copy(a).addScaledVector(d1, s);
    point.copy(c).addScaledVector(d2, t);
    return bird.distanceToSquared(point);
  }
  return {
    update(position, time) {
      if (!initialized) {
        previous.copy(position);
        initialized = true;
        return null;
      }
      let hit = null,
        best = limits.radius ** 2;
      if (time - lastEncounter >= limits.cooldown) {
        const nearby = memory.query(previous, position, limits.radius);
        candidates = nearby.length;
        for (const segment of nearby) {
          if (
            time - segment.createdAt < limits.minAge ||
            time - segment.lastEncounter < limits.segmentCooldown
          )
            continue;
          const squared = distance(previous, position, segment.a, segment.b);
          if (squared <= best) {
            best = squared;
            hit = {
              traceId: segment.traceId,
              brushId: segment.brushId,
              segmentId: segment.id,
              position: point.clone(),
              distance: Math.sqrt(squared),
              time,
              segment,
            };
          }
        }
      } else candidates = 0;
      previous.copy(position);
      if (hit) {
        memory.registerEncounter(hit.segment, time);
        delete hit.segment;
        lastEncounter = time;
        count++;
      }
      return hit;
    },
    reset() {
      initialized = false;
      lastEncounter = -Infinity;
      count = 0;
      candidates = 0;
    },
    get stats() {
      return { count, candidates };
    },
  };
}
