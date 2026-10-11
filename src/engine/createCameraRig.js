import * as THREE from "three";

/** Three viewpoints share a fixed central clearing and a rotating landscape.
 * Pointer input rotates only the landscape. Every rotation reanchors the FPV
 * route to the transformed focus; no gesture deposits or deforms pigment.
 */
export function createCameraRig(camera, canvas, landscape, getFocus, onHint) {
  let mode = "drone",
    phase = 0,
    dragging = null,
    revision = 0,
    disposed = false;
  let panoramaYaw = 0,
    droneYaw = 0;
  let gyroReference = null,
    gyroRelative = new THREE.Quaternion();
  let gyroEnabled = false,
    sensorRequest = 0;
  const orientation = new THREE.Quaternion(),
    screenRotation = new THREE.Quaternion();
  const correction = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    -Math.PI / 2,
  );
  const desired = new THREE.Vector3(),
    target = new THREE.Vector3(),
    focus = new THREE.Vector3();
  const matrix = new THREE.Matrix4(),
    desiredQuaternion = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const listeners = [];
  const listen = (node, name, fn) => {
    node.addEventListener(name, fn);
    listeners.push(() => node.removeEventListener(name, fn));
  };
  function reanchor() {
    phase = 0;
    revision++;
    canvas.dataset.flightRevision = String(revision);
  }
  listen(canvas, "pointerdown", (event) => {
    if (!event.isPrimary || event.button > 0) return;
    dragging = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  });
  listen(canvas, "pointermove", (event) => {
    if (!dragging || event.pointerId !== dragging.id) return;
    const dx = event.clientX - dragging.x;
    if (dx !== 0) {
      landscape.rotation.y += dx * 0.006;
      reanchor();
    }
    dragging.x = event.clientX;
    dragging.y = event.clientY;
  });
  const release = (event) => {
    if (dragging?.id !== event.pointerId) return;
    if (canvas.hasPointerCapture(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
    dragging = null;
  };
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((name) =>
    listen(canvas, name, release),
  );
  listen(window, "deviceorientation", (event) => {
    if (
      mode !== "gyro" ||
      !gyroEnabled ||
      event.alpha == null ||
      event.beta == null ||
      event.gamma == null
    )
      return;
    const rad = THREE.MathUtils.degToRad;
    orientation.setFromEuler(
      new THREE.Euler(
        rad(event.beta),
        rad(event.alpha),
        -rad(event.gamma),
        "YXZ",
      ),
    );
    orientation.multiply(correction);
    const angle = window.screen.orientation?.angle ?? window.orientation ?? 0;
    screenRotation.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -rad(angle));
    orientation.multiply(screenRotation);
    if (!gyroReference) {
      gyroReference = orientation.clone().invert();
      onHint("Gyroscope actif · regardez autour de vous");
    }
    gyroRelative.copy(gyroReference).multiply(orientation);
  });
  async function setMode(next) {
    const request = ++sensorRequest;
    mode = next;
    reanchor();
    gyroReference = null;
    gyroRelative.identity();
    canvas.dataset.cameraMode = mode;
    if (next !== "gyro") {
      onHint(
        next === "drone"
          ? "Au cœur du paysage · vol doux"
          : "La sculpture dans son ensemble",
      );
      return;
    }
    getFocus(focus);
    focus.applyAxisAngle(up, landscape.rotation.y);
    panoramaYaw = Math.atan2(focus.x, focus.z);
    onHint("Bougez votre appareil · glissez pour tourner le paysage");
    if (!window.DeviceOrientationEvent) {
      gyroEnabled = false;
      onHint("Gyroscope indisponible · glissez pour explorer à 360°");
      return;
    }
    try {
      const result =
        typeof window.DeviceOrientationEvent.requestPermission === "function"
          ? await window.DeviceOrientationEvent.requestPermission()
          : "granted";
      if (disposed || request !== sensorRequest) return;
      gyroEnabled = result === "granted";
      if (!gyroEnabled)
        onHint("Gyroscope non autorisé · glissez pour explorer à 360°");
      else onHint("En attente du gyroscope · glissez aussi pour tourner");
    } catch {
      if (!disposed && request === sensorRequest) {
        gyroEnabled = false;
        onHint("Gyroscope indisponible · glissez pour explorer à 360°");
      }
    }
  }
  function update(dt) {
    if (!dragging && mode === "drone") phase += dt * 0.09;
    getFocus(focus);
    focus.applyAxisAngle(up, landscape.rotation.y);
    const wantedYaw = Math.atan2(focus.x, focus.z) + Math.sin(phase) * 0.45;
    const delta = Math.atan2(
      Math.sin(wantedYaw - droneYaw),
      Math.cos(wantedYaw - droneYaw),
    );
    // New paint must not whip the drone toward a different ring sector.
    // Gyro heading stays anchored: sensor motion owns the observer's gaze,
    // and rotating the sculpture must actually move it through that gaze.
    if (mode === "drone")
      droneYaw += THREE.MathUtils.clamp(delta, -0.5 * dt, 0.5 * dt);
    const azimuth = mode === "gyro" ? panoramaYaw : droneYaw;
    if (mode === "tpv") {
      desired.set(44, 30, 48);
      target.set(0, -1, 0);
    } else {
      desired.set(
        mode === "drone" ? Math.sin(phase * 0.6) * 1.2 : 0,
        1.1 + (mode === "drone" ? Math.sin(phase) * 0.3 : 0),
        mode === "drone" ? Math.cos(phase * 0.6) * 1.2 : 0,
      );
      target.set(
        Math.sin(azimuth) * 18,
        mode === "gyro" ? 1.1 : focus.y * 0.4 + 0.7,
        Math.cos(azimuth) * 18,
      );
    }
    const blend = 1 - Math.exp(-dt * 5);
    camera.position.lerp(desired, blend);
    matrix.lookAt(camera.position, target, up);
    desiredQuaternion.setFromRotationMatrix(matrix);
    if (mode === "gyro") desiredQuaternion.multiply(gyroRelative);
    camera.quaternion.slerp(desiredQuaternion, blend);
    const fov = mode === "tpv" ? 56 : mode === "gyro" ? 92 : 82;
    if (Math.abs(camera.fov - fov) > 0.02) {
      camera.fov += (fov - camera.fov) * blend;
      camera.updateProjectionMatrix();
    }
  }
  void setMode("drone");
  return {
    setMode,
    update,
    reanchor,
    dispose() {
      disposed = true;
      sensorRequest++;
      listeners.forEach((remove) => remove());
    },
  };
}
