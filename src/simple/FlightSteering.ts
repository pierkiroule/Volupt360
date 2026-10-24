import * as THREE from "three";
/** A bounded, inertial detour from the composed flight; release rejoins it slowly. */
export class FlightSteering {
  readonly offset = new THREE.Vector3();
  private velocity = new THREE.Vector3();
  private desired = new THREE.Vector3();
  reset() {
    this.offset.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
  }
  update(dt: number, forward: THREE.Vector3, manual: boolean, speed: number) {
    if (dt <= 0 || speed < 0.001) return this.offset;
    this.desired
      .copy(manual ? forward : this.offset)
      .multiplyScalar(manual ? 0.95 : -0.18);
    this.velocity.lerp(this.desired, 1 - Math.exp(-dt * 3));
    this.offset.addScaledVector(this.velocity, dt * speed);
    // Ellipsoidal safety envelope: the visitor stays among the pigments.
    const radius = Math.hypot(
      this.offset.x / 5,
      this.offset.y / 2.8,
      this.offset.z / 5,
    );
    if (radius > 1) this.offset.multiplyScalar(1 / radius);
    return this.offset;
  }
}
