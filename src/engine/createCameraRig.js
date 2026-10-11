import * as THREE from "three";

/** Three viewpoints share an extended sculpture and a moving painter.
 * Pointer input rotates only the landscape. Every rotation reanchors the FPV
 * route to the transformed focus; no gesture deposits or deforms pigment.
 */
export function createCameraRig(camera, canvas, landscape, getFlight, onHint) {
  let mode = "drone",
    phase = 0,
    dragging = null,
    revision = 0,
    disposed = false;
  let panoramaYaw = 0;
  let tracking = 0,
    calm = 0;
  const panoramaPosition = new THREE.Vector3();
  const painter = new THREE.Vector3(),
    direction = new THREE.Vector3(),
    velocity = new THREE.Vector3();
  const center = new THREE.Vector3(),
    lateral = new THREE.Vector3(),
    behind = new THREE.Vector3();
  const aim = new THREE.Vector3(),
    follow = new THREE.Vector3(),
    overview = new THREE.Vector3();
  const worldPivot = new THREE.Vector3(),
    localPivot = new THREE.Vector3();
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
  function reanchor(reset = false) {
    if (reset) {
      tracking = 0;
      calm = 0;
      landscape.updateMatrixWorld(true);
      panoramaPosition
        .copy(getFlight().bounds.center)
        .applyMatrix4(landscape.matrixWorld);
    }
    revision++;
    canvas.dataset.flightRevision = String(revision);
  }
  listen(canvas, "pointerdown", (event) => {
    if (!event.isPrimary || event.button > 0) return;
    dragging = { id: event.pointerId, x: event.clientX, y: event.clientY };
    localPivot.copy(getFlight().bounds.center);
    landscape.updateMatrixWorld(true);
    worldPivot.copy(localPivot).applyMatrix4(landscape.matrixWorld);
    canvas.setPointerCapture(event.pointerId);
  });
  listen(canvas, "pointermove", (event) => {
    if (!dragging || event.pointerId !== dragging.id) return;
    const dx = event.clientX - dragging.x;
    if (dx !== 0) {
      landscape.rotation.y += dx * 0.006;
      landscape.position
        .copy(worldPivot)
        .sub(localPivot.clone().applyQuaternion(landscape.quaternion));
      landscape.updateMatrixWorld(true);
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
          ? "Dans le sillage du pinceau · voyage en 3D"
          : "La sculpture dans son ensemble",
      );
      return;
    }
    const state = getFlight();
    landscape.updateMatrixWorld(true);
    panoramaPosition
      .copy(state.bounds.center)
      .applyMatrix4(landscape.matrixWorld);
    focus
      .copy(state.position)
      .applyMatrix4(landscape.matrixWorld)
      .sub(panoramaPosition);
    if (focus.lengthSq() < 1)
      focus.copy(state.direction).transformDirection(landscape.matrixWorld);
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
    const state = getFlight();
    const mix = (rate) => 1 - Math.exp(-dt * rate);
    landscape.updateMatrixWorld(true);
    painter.copy(state.position).applyMatrix4(landscape.matrixWorld);
    direction.copy(state.direction).transformDirection(landscape.matrixWorld);
    velocity.copy(state.velocity).applyQuaternion(landscape.quaternion);
    center.copy(state.bounds.center).applyMatrix4(landscape.matrixWorld);
    phase += dt * (state.active ? 0.11 : 0.055);
    tracking +=
      ((state.active ? 1 : 0) - tracking) * mix(state.active ? 1.4 : 0.38);
    calm = state.active ? 0 : Math.min(20, calm + dt);
    if (mode === "tpv") {
      // Fit the actual work in both portrait and landscape as it expands.
      const vertical = THREE.MathUtils.degToRad(56 / 2);
      const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
      const distance =
        (state.bounds.radius * 1.18) / Math.sin(Math.min(vertical, horizontal));
      desired
        .copy(center)
        .addScaledVector(behind.set(1, 0.62, 1.1).normalize(), distance);
      target.copy(center);
    } else if (mode === "gyro") {
      desired.copy(panoramaPosition);
      target
        .copy(panoramaPosition)
        .add(
          behind
            .set(Math.sin(panoramaYaw), 0, Math.cos(panoramaYaw))
            .multiplyScalar(18),
        );
    } else {
      // Film the bird-painter from behind and alongside its actual tangent.
      // Velocity supplies look-ahead; audio controls dolly distance and lift.
      lateral.crossVectors(direction, up);
      if (lateral.lengthSq() < 0.02) lateral.set(1, 0, 0);
      lateral.normalize();
      const near = 8.5 + (1 - state.energy) * 4;
      follow
        .copy(painter)
        .addScaledVector(direction, -near)
        .addScaledVector(lateral, 3.2 + Math.sin(phase) * 2)
        .addScaledVector(up, 2.2 + state.energy * 2);
      overview
        .copy(center)
        .lerp(painter, 0.45)
        .addScaledVector(
          direction,
          -(16 + Math.min(70, state.bounds.radius * 0.8)),
        )
        .addScaledVector(lateral, 5 + Math.sin(phase * 0.6) * 3)
        .addScaledVector(up, 8 + Math.min(25, state.bounds.radius * 0.25));
      desired.copy(overview).lerp(follow, tracking);
      focus.copy(painter).addScaledVector(velocity, 0.4);
      target.copy(center).lerp(focus, 0.4 + tracking * 0.6);
    }
    const positionBlend = mix(mode === "drone" ? 1.1 : 2.8);
    camera.position.lerp(desired, positionBlend);
    aim.lerp(target, mix(mode === "drone" ? 1.7 : 3.5));
    matrix.lookAt(camera.position, aim, up);
    desiredQuaternion.setFromRotationMatrix(matrix);
    if (mode === "gyro") desiredQuaternion.multiply(gyroRelative);
    camera.quaternion.slerp(desiredQuaternion, mix(mode === "drone" ? 2.1 : 5));
    const fov =
      mode === "tpv"
        ? 56
        : mode === "gyro"
          ? 92
          : 74 + tracking * 8 + state.motion * 3;
    camera.fov += (fov - camera.fov) * mix(1.4);
    camera.far = Math.max(
      400,
      (camera.position.distanceTo(center) + state.bounds.radius) * 2.5,
    );
    camera.updateProjectionMatrix();
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
