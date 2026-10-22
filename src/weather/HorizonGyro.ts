import { MathUtils, Quaternion, Vector3 } from "three";
export const LOOK_LIMIT = 1.15;
export function angleDelta(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}
/** Incremental gaze azimuth, independent of phone roll, with pole-safe continuity. */
export class HorizonGyro {
  private forward = new Vector3();
  private previous = new Quaternion();
  private delta = new Quaternion();
  private ready = false;
  private initialPitch = 0;
  private lastHeading = 0;
  private headingReady = false;
  private basePitch = 0;
  private lastTime: number | undefined;
  yaw = 0;
  pitch = 0;
  get calibrated() { return this.ready; }
  reset() {
    this.ready = false;
    this.lastTime = undefined;
    this.headingReady = false;
  }
  update(orientation: Quaternion, viewYaw: number, viewPitch: number, time?: number) {
    if (!Number.isFinite(orientation.x) || !Number.isFinite(orientation.y) || !Number.isFinite(orientation.z) || !Number.isFinite(orientation.w) || orientation.lengthSq()<.5) return this;
    this.forward.set(0, 0, -1).applyQuaternion(orientation);
    const sensorPitch = Math.asin(MathUtils.clamp(this.forward.y, -1, 1));
    const horizontal = Math.hypot(this.forward.x,this.forward.z);
    const heading = Math.atan2(-this.forward.x,-this.forward.z);
    const elapsed = time !== undefined && this.lastTime !== undefined ? (time-this.lastTime)/1000 : undefined;
    this.delta.copy(this.previous).invert().premultiply(orientation).normalize();
    // A long interruption or a compass discontinuity establishes a new reference.
    const angle = 2*Math.acos(MathUtils.clamp(Math.abs(this.delta.w),0,1));
    const discontinuity = elapsed !== undefined && (elapsed>.8 || elapsed<0 || angle>Math.max(.6,elapsed*8));
    if (!this.ready || discontinuity) {
      this.ready = true;
      this.initialPitch = sensorPitch;
      this.basePitch = viewPitch;
      this.yaw = viewYaw;
      this.lastHeading = heading;
      this.headingReady = horizontal>.18;
    } else if (horizontal<.18) {
      this.headingReady=false;
    } else if (!this.headingReady) {
      if(horizontal>.28) { this.lastHeading=heading;this.headingReady=true; }
    } else {
      let change=angleDelta(heading-this.lastHeading);
      // The forward projection reverses when pitching through a pole. Choose its
      // continuous branch; roll never enters this calculation.
      if(change>Math.PI/2)change-=Math.PI;
      if(change<-Math.PI/2)change+=Math.PI;
      this.yaw+=change;
      this.lastHeading=heading;
    }
    this.previous.copy(orientation);
    this.lastTime=time;
    this.pitch = MathUtils.clamp(this.basePitch+sensorPitch-this.initialPitch,-LOOK_LIMIT,LOOK_LIMIT);
    return this;
  }
}
export function smoothGyroHeading(current: number, target: number, dt: number) {
  const seconds=Math.min(.05,Math.max(0,dt));
  const change=angleDelta(target-current)*(1-Math.exp(-seconds*6));
  return current+MathUtils.clamp(change,-2.2*seconds,2.2*seconds);
}
