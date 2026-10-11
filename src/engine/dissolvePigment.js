import { MathUtils } from "three";

/** Density reduces the lifespan of old pigment; gradual, irreversible fading
 * prevents flicker when neighboring traces disappear. Fresh strokes survive. */
export function dissolvePigment({
  age,
  count,
  neighbors,
  fade,
  dt,
  significance = 0,
  opening = 0,
}) {
  const pressure =
    Math.max(0, count - 24) / 18 + Math.max(0, neighbors - 4) / 6;
  const lifetime =
    (150 * (1 + significance * 0.8)) / (1 + pressure + opening * 1.5);
  const target = 1 - MathUtils.smoothstep(age, lifetime, lifetime + 35);
  return Math.min(fade, fade + (target - fade) * (1 - Math.exp(-dt * 0.8)));
}
