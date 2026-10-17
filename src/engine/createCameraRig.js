import * as THREE from "three";

/** Three viewpoints share an extended sculpture and a moving painter.
 * Pointer input rotates only the landscape. Every rotation reanchors the FPV
 * route to the transformed focus; no gesture deposits or deforms pigment.
 */
export function createCameraRig(camera, canvas, landscape, getFlight, onHint) {
  let mode = "drone",
    dragging = null,
    revision = 0,
    disposed = false;
  let panoramaPitch = 0;
  let panoramaYaw = 0,
    distanceSetting = 0;
  let photoZoom = 1;
  const photoPointers = new Map();
  let pinchDistance = 0;
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
  const horizonUp = new THREE.Vector3(),
    previousHeading = new THREE.Vector3();
  let cameraBank = 0;
  const listeners = [];
  const listen = (node, name, fn) => {
    node.addEventListener(name, fn);
    listeners.push(() => node.removeEventListener(name, fn));
  };
  function reanchor(reset = false) {
    if (reset) {
      landscape.updateMatrixWorld(true);
      panoramaPosition.set(0, 0, 0).applyMatrix4(landscape.matrixWorld);
    }
    revision++;
    canvas.dataset.flightRevision = String(revision);
  }
  listen(canvas, "pointerdown", (event) => {
    if (mode === "drone" && getFlight().windEnabled) return;
    if (mode === "photo") {
      photoPointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
      canvas.setPointerCapture(event.pointerId);
      if (photoPointers.size === 2) {
        const [a, b] = [...photoPointers.values()];
        pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
      }
    }
    if (!event.isPrimary || event.button > 0) return;
    dragging = { id: event.pointerId, x: event.clientX, y: event.clientY };
    if (mode === "photo") localPivot.copy(getFlight().bounds.center);
    else localPivot.set(0, 0, 0);
    landscape.updateMatrixWorld(true);
    worldPivot.copy(localPivot).applyMatrix4(landscape.matrixWorld);
    canvas.setPointerCapture(event.pointerId);
  });
  listen(canvas, "pointermove", (event) => {
    if (mode === "photo" && photoPointers.has(event.pointerId)) {
      photoPointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
      if (photoPointers.size === 2) {
        const [a, b] = [...photoPointers.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDistance > 0 && distance > 0)
          setPhotoZoom((photoZoom * pinchDistance) / distance);
        pinchDistance = distance;
        if (dragging?.id === event.pointerId) {
          dragging.x = event.clientX;
          dragging.y = event.clientY;
        }
        return;
      }
    }
    if (!dragging || event.pointerId !== dragging.id) return;
    const dx = event.clientX - dragging.x;
    const dy = event.clientY - dragging.y;
    if (dx !== 0 || (mode === "photo" && dy !== 0)) {
      landscape.rotation.y += dx * 0.006;
      if (mode === "photo") landscape.rotation.x += dy * 0.006;
      landscape.position
        .copy(worldPivot)
        .sub(localPivot.clone().applyQuaternion(landscape.quaternion));
      landscape.updateMatrixWorld(true);
      reanchor();
    }
    dragging.x = event.clientX;
    dragging.y = event.clientY;
  });
  function setPhotoZoom(value) {
    photoZoom = THREE.MathUtils.clamp(Number(value), 0.25, 3);
    canvas.dataset.photoZoom = String(photoZoom);
  }
  listen(canvas, "wheel", (event) => {
    if (mode !== "photo") return;
    event.preventDefault();
    setPhotoZoom(photoZoom * Math.exp(event.deltaY * 0.001));
  });
  const release = (event) => {
    photoPointers.delete(event.pointerId);
    pinchDistance = 0;
    if (dragging && mode === "photo" && photoPointers.has(dragging.id)) {
      const position = photoPointers.get(dragging.id);
      dragging.x = position.x;
      dragging.y = position.y;
    }
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
    if (next === "photo") setPhotoZoom(1);
    photoPointers.clear();
    dragging = null;
    reanchor();
    gyroReference = null;
    gyroRelative.identity();
    canvas.dataset.cameraMode = mode;
    if (next !== "gyro") {
      onHint(
        next === "drone"
          ? getFlight().windEnabled
            ? "Glisser pour guider · maintenir pour tracer"
            : "Dans le sillage du pinceau · voyage en 3D"
          : "La sculpture dans son ensemble",
      );
      return;
    }
    const state = getFlight();
    landscape.updateMatrixWorld(true);
    panoramaPosition.set(0, 0, 0).applyMatrix4(landscape.matrixWorld);
    focus
      .copy(
        Number(canvas.dataset.markCount) > 0
          ? state.bounds.center
          : state.position,
      )
      .applyMatrix4(landscape.matrixWorld)
      .sub(panoramaPosition);
    if (focus.lengthSq() < 1)
      focus.copy(state.direction).transformDirection(landscape.matrixWorld);
    panoramaYaw = Math.atan2(focus.x, focus.z);
    panoramaPitch = Math.atan2(focus.y, Math.hypot(focus.x, focus.z));
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
    if (mode === "photo") {
      const halfFov = Math.atan(
        Math.tan(THREE.MathUtils.degToRad(37)) * Math.min(1, camera.aspect),
      );
      const radius = Math.max(3, state.bounds.radius);
      desired
        .copy(center)
        .addScaledVector(
          behind.set(0, 0.25, 1).normalize(),
          ((radius * 1.2) / Math.sin(halfFov)) * photoZoom,
        );
      camera.position.copy(desired);
      camera.lookAt(center);
      camera.fov = 74;
      camera.far = Math.max(400, camera.position.distanceTo(center) * 3);
      camera.updateProjectionMatrix();
      return;
    }
    if (mode === "gyro") {
      desired.copy(panoramaPosition);
      target
        .copy(panoramaPosition)
        .add(
          behind
            .set(
              Math.sin(panoramaYaw) * Math.cos(panoramaPitch),
              Math.sin(panoramaPitch),
              Math.cos(panoramaYaw) * Math.cos(panoramaPitch),
            )
            .multiplyScalar(18),
        );
    } else {
      canvas.dataset.droneIntent = "close-flight";
      lateral.crossVectors(direction, up);
      if (lateral.lengthSq() < 0.02) lateral.set(1, 0, 0);
      lateral.normalize();
      // Fixed close framing. Only the visitor's zoom can move toward an overview.
      follow
        .copy(painter)
        .addScaledVector(direction, -3)
        .addScaledVector(lateral, 0.5)
        .addScaledVector(up, 0.42);
      const halfFov = Math.atan(
        Math.tan(THREE.MathUtils.degToRad(39)) * Math.min(1, camera.aspect),
      );
      overview
        .copy(center)
        .addScaledVector(
          behind.copy(direction).negate().addScaledVector(up, 0.45).normalize(),
          Math.max(15, (state.bounds.radius * 1.2) / Math.sin(halfFov)),
        );
      desired.copy(follow).lerp(overview, distanceSetting);
      focus.copy(painter).addScaledVector(direction, 4.5);
      target.copy(focus).lerp(center, distanceSetting);
      const turn =
        previousHeading.lengthSq() > 0
          ? previousHeading.dot(lateral) / Math.max(0.001, dt)
          : 0;
      cameraBank +=
        (THREE.MathUtils.clamp(turn * 0.12, -0.16, 0.16) - cameraBank) *
        mix(2.2);
      previousHeading.copy(direction);
      canvas.dataset.fpvFollowDistance = "3";
    }
    const positionBlend = mix(mode === "drone" ? 4.2 : 2.8);
    camera.position.lerp(desired, positionBlend);
    aim.lerp(target, mix(mode === "drone" ? 4 : 3.5));
    horizonUp.copy(up);
    if (mode === "drone")
      horizonUp
        .addScaledVector(lateral, cameraBank * (1 - distanceSetting))
        .normalize();
    matrix.lookAt(camera.position, aim, horizonUp);
    desiredQuaternion.setFromRotationMatrix(matrix);
    if (mode === "gyro") desiredQuaternion.multiply(gyroRelative);
    camera.quaternion.slerp(desiredQuaternion, mix(mode === "drone" ? 4 : 5));
    const fov = mode === "gyro" ? 92 + distanceSetting * 20 : 78;
    camera.fov += (fov - camera.fov) * mix(1.4);
    camera.far = Math.max(
      400,
      (camera.position.distanceTo(center) + state.bounds.radius) * 2.5,
    );
    camera.updateProjectionMatrix();
  }
  void setMode("drone");
  canvas.dataset.droneDistance = String(distanceSetting);
  return {
    setMode,
    setPhotoZoom,
    setDistance(value) {
      distanceSetting = THREE.MathUtils.clamp(Number(value), 0, 1);
      canvas.dataset.droneDistance = String(distanceSetting);
    },
    update,
    reanchor,
    dispose() {
      disposed = true;
      sensorRequest++;
      listeners.forEach((remove) => remove());
    },
  };
}
