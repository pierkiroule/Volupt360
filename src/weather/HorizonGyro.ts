import { MathUtils, Quaternion, Vector3 } from "three";
export const LOOK_LIMIT = 1.15;
export function angleDelta(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}
/** Calibrate heading and elevation independently: a tilted phone must not tilt world-up. */
export class HorizonGyro {
  private forward = new Vector3();
  private ready = false;
  private lastHeading = 0;
  private initialPitch = 0;
  private basePitch = 0;
  yaw = 0;
  pitch = 0;
  reset() {
    this.ready = false;
  }
  update(orientation: Quaternion, viewYaw: number, viewPitch: number) {
    this.forward.set(0, 0, -1).applyQuaternion(orientation);
    const horizontal = Math.hypot(this.forward.x, this.forward.z);
    const sensorPitch = Math.asin(MathUtils.clamp(this.forward.y, -1, 1));
    const heading =
      horizontal > 0.08
        ? Math.atan2(-this.forward.x, -this.forward.z)
        : this.lastHeading;
    if (!this.ready) {
      this.ready = true;
      this.lastHeading = heading;
      this.initialPitch = sensorPitch;
      this.basePitch = viewPitch;
      this.yaw = viewYaw;
    } else if (horizontal > 0.08) {
      this.yaw += angleDelta(heading - this.lastHeading);
      this.lastHeading = heading;
    }
    this.pitch = MathUtils.clamp(
      this.basePitch + sensorPitch - this.initialPitch,
      -LOOK_LIMIT,
      LOOK_LIMIT,
    );
    return this;
  }
}
