export interface Steering {
  x: number;
  y: number;
  active: boolean;
  mode?: "drag" | "steer";
  lastGestureAt?: number;
}
/** A held, stationary finger is not a continuous turn command in contemplation. */
export function isManualSteering(input: Steering, now: number) {
  return input.active && (input.mode !== "drag" || input.x !== 0 || input.y !== 0 || now-(input.lastGestureAt ?? 0)<180);
}
