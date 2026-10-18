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
  let povLocked = false,
    povArrival = 0,
    returnBlend = 1;
  const povPoint = new THREE.Vector3(),
    povStart = new THREE.Vector3(),
    returnStart = new THREE.Vector3();
  const returnRotation = new THREE.Quaternion();
  let returnFov = 88,
    returnDuration = 0.85;
  let acrobaticView = false;
  const acrobaticEye = new THREE.Vector3();
  let gyroPermission = false,
    orientationSource = null;
  canvas.dataset.gyroscopeStatus = "disabled";
  let panoramaPitch = 0;
  let panoramaYaw = 0,
    distanceSetting = 0;
  let photoZoom = 1,
    chillDistance = 7.7;
  const photoPointers = new Map();
  let pinchDistance = 0;
  const panoramaPosition = new THREE.Vector3();
  const painter = new THREE.Vector3(),
    direction = new THREE.Vector3();
  const center = new THREE.Vector3(),
    behind = new THREE.Vector3();
  const aim = new THREE.Vector3();
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
      landscape.updateMatrixWorld(true);
      panoramaPosition
        .copy(getFlight().bounds.center)
        .applyMatrix4(landscape.matrixWorld);
    }
    revision++;
    canvas.dataset.flightRevision = String(revision);
  }
  listen(canvas, "pointerdown", (event) => {
    if (mode === "sculpt" || (mode === "drone" && getFlight().windEnabled))
      return;
    if (mode === "photo" || mode === "global") {
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
    if (mode === "photo" || mode === "global")
      localPivot.copy(getFlight().bounds.center);
    else localPivot.set(0, 0, 0);
    landscape.updateMatrixWorld(true);
    worldPivot.copy(localPivot).applyMatrix4(landscape.matrixWorld);
    canvas.setPointerCapture(event.pointerId);
  });
  listen(canvas, "pointermove", (event) => {
    if (
      (mode === "photo" || mode === "global") &&
      photoPointers.has(event.pointerId)
    ) {
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
    if (mode === "gyro") {
      panoramaYaw -= dx * 0.0035;
      panoramaPitch = THREE.MathUtils.clamp(
        panoramaPitch + dy * 0.0035,
        -1.2,
        1.2,
      );
      dragging.x = event.clientX;
      dragging.y = event.clientY;
      return;
    }
    if (dx !== 0 || ((mode === "photo" || mode === "global") && dy !== 0)) {
      landscape.rotation.y += dx * 0.006;
      if (mode === "photo" || mode === "global")
        landscape.rotation.x += dy * 0.006;
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
    if (
      dragging &&
      (mode === "photo" || mode === "global") &&
      photoPointers.has(dragging.id)
    ) {
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
  const onOrientation = (event) => {
    if (
      mode !== "gyro" ||
      !gyroEnabled ||
      !Number.isFinite(event.beta) ||
      !Number.isFinite(event.gamma) ||
      (orientationSource && orientationSource !== event.type)
    )
      return;
    orientationSource = event.type;
    canvas.dataset.gyroscopeStatus = "active";
    const rad = THREE.MathUtils.degToRad;
    orientation.setFromEuler(
      new THREE.Euler(
        rad(event.beta),
        rad(Number.isFinite(event.alpha) ? event.alpha : 0),
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
  };
  listen(window, "deviceorientation", onOrientation);
  listen(window, "deviceorientationabsolute", onOrientation);
  async function setMode(next) {
    const request = ++sensorRequest;
    mode = next;
    if (next === "photo" || next === "global") setPhotoZoom(1);
    photoPointers.clear();
    dragging = null;
    reanchor();
    gyroReference = null;
    orientationSource = null;
    gyroRelative.identity();
    canvas.dataset.cameraMode = mode;
    if (next !== "gyro") {
      onHint(
        next === "drone"
          ? getFlight().windEnabled
            ? "Glisser pour guider · maintenir pour tracer"
            : "Dans le sillage du pinceau · voyage en 3D"
          : next === "global"
            ? "Vue globale · glisser pour faire pivoter l’œuvre à 360°"
            : "La sculpture dans son ensemble",
      );
      return;
    }
    const state = getFlight();
    landscape.updateMatrixWorld(true);
    if (povLocked) panoramaPosition.copy(povPoint);
    else
      panoramaPosition
        .copy(state.bounds.center)
        .applyMatrix4(landscape.matrixWorld);
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
    if (povLocked) camera.getWorldDirection(focus);
    panoramaYaw = Math.atan2(focus.x, focus.z);
    panoramaPitch = Math.atan2(focus.y, Math.hypot(focus.x, focus.z));
    if (povLocked) {
      gyroEnabled = gyroPermission;
      if (gyroEnabled) canvas.dataset.gyroscopeStatus = "waiting";
      aim.copy(panoramaPosition).addScaledVector(focus, 18);
      onHint(
        gyroEnabled ? "Regard 360°" : "Glissez pour regarder autour de vous",
      );
      return;
    }
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
    center.copy(state.bounds.center).applyMatrix4(landscape.matrixWorld);
    if (mode === "sculpt") {
      camera.position.set(0, 4, 30);
      camera.lookAt(0, 0, 0);
      camera.fov = 70;
      camera.far = 1000;
      camera.updateProjectionMatrix();
      return;
    }
    if (mode === "photo" || mode === "global") {
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
      if (state.chill && mode === "global")
        camera.position.lerp(desired, mix(0.8));
      else camera.position.copy(desired);
      if (state.chill && mode === "global") {
        matrix.lookAt(camera.position, center, up);
        desiredQuaternion.setFromRotationMatrix(matrix);
        camera.quaternion.slerp(desiredQuaternion, mix(0.8));
        camera.fov += (74 - camera.fov) * mix(0.8);
      } else {
        camera.lookAt(center);
        camera.fov = 74;
      }
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
      if (state.acrobatics) {
        if (!acrobaticView)
          acrobaticEye
            .copy(camera.position)
            .addScaledVector(direction, -5)
            .addScaledVector(up, 2);
        acrobaticView = true;
        camera.position.lerp(acrobaticEye, mix(1.3));
        matrix.lookAt(camera.position, painter, up);
        desiredQuaternion.setFromRotationMatrix(matrix);
        camera.quaternion.slerp(desiredQuaternion, mix(4));
        camera.fov += (88 - camera.fov) * mix(1.2);
        camera.updateProjectionMatrix();
        return;
      }
      if (acrobaticView) {
        acrobaticView = false;
        returnStart.copy(camera.position);
        returnRotation.copy(camera.quaternion);
        returnFov = camera.fov;
        returnDuration = 1.2;
        returnBlend = 0;
      }
      canvas.dataset.droneIntent = "point-guided-follow";
      // A stable, centered view follows the bird while the aim-point keeps control.
      const breathingDistance = state.chill
        ? 6.3 +
          Math.sin((state.time || 0) * 0.17) * 0.5 +
          (state.departure || 0) * 22 +
          (1 + Math.sin((state.time || 0) * 0.037)) * 1.4
        : 5.5;
      chillDistance +=
        (breathingDistance +
          Math.min(1, state.motion || 0) * 0.6 -
          chillDistance) *
        mix(0.8);
      const distance = state.chill ? chillDistance : 5.5;
      camera.position.copy(painter).addScaledVector(direction, -distance);
      camera.position.addScaledVector(
        up,
        state.chill
          ? (state.opening || 0) * 0.7 + (state.departure || 0) * 3
          : 0,
      );
      target.copy(painter).add(direction);
      matrix.lookAt(camera.position, target, up);
      desiredQuaternion.setFromRotationMatrix(matrix);
      camera.quaternion.copy(desiredQuaternion);
      camera.fov = 88 + (state.opening || 0) * 3;
      if (returnBlend < 1) {
        returnBlend = Math.min(1, returnBlend + dt / returnDuration);
        const blend = returnBlend * returnBlend * (3 - 2 * returnBlend);
        camera.position.lerpVectors(returnStart, camera.position, blend);
        camera.quaternion.slerpQuaternions(
          returnRotation,
          desiredQuaternion,
          blend,
        );
        camera.fov = THREE.MathUtils.lerp(returnFov, camera.fov, blend);
      }
      camera.far = Math.max(400, state.bounds.radius * 3);
      camera.updateProjectionMatrix();
      canvas.dataset.fpvFollowDistance = state.chill
        ? distance.toFixed(3)
        : "5.5";
      return;
    }
    if (povLocked) {
      povArrival = Math.min(1, povArrival + dt / 1.2);
      const blend = povArrival * povArrival * (3 - 2 * povArrival);
      camera.position.lerpVectors(povStart, povPoint, blend);
      aim.copy(target);
    } else {
      camera.position.lerp(desired, mix(2.8));
      aim.lerp(target, mix(3.5));
    }
    matrix.lookAt(povLocked ? povPoint : camera.position, aim, up);
    desiredQuaternion.setFromRotationMatrix(matrix);
    desiredQuaternion.multiply(gyroRelative);
    camera.quaternion.slerp(desiredQuaternion, mix(5));
    const fov = 92 + distanceSetting * 20;
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
    async requestGyroscope(enabled = true) {
      gyroEnabled = false;
      gyroPermission = false;
      if (!enabled) {
        canvas.dataset.gyroscopeStatus = "disabled";
        return false;
      }
      if (!window.isSecureContext) {
        canvas.dataset.gyroscopeStatus = "insecure";
        return false;
      }
      try {
        const Sensor = window.DeviceOrientationEvent;
        const supported =
          Boolean(Sensor) ||
          "ondeviceorientation" in window ||
          "ondeviceorientationabsolute" in window;
        if (!supported) {
          canvas.dataset.gyroscopeStatus = "unavailable";
          return false;
        }
        const granted =
          typeof Sensor?.requestPermission !== "function" ||
          (await Sensor.requestPermission()) === "granted";
        if (disposed) return false;
        gyroPermission = granted;
        canvas.dataset.gyroscopeStatus = granted ? "ready" : "denied";
      } catch {
        if (!disposed) canvas.dataset.gyroscopeStatus = "denied";
      }
      return gyroPermission;
    },
    enterContemplation(point) {
      povLocked = true;
      povArrival = 0;
      povPoint.copy(point);
      povStart.copy(camera.position);
      return setMode("gyro");
    },
    leaveContemplation() {
      povLocked = false;
      returnBlend = 0;
      returnStart.copy(camera.position);
      returnRotation.copy(camera.quaternion);
      landscape.updateMatrixWorld(true);
      const state = getFlight();
      painter.copy(state.position).applyMatrix4(landscape.matrixWorld);
      direction.copy(state.direction).transformDirection(landscape.matrixWorld);
      desired.copy(painter).addScaledVector(direction, -chillDistance);
      target.copy(painter).add(direction);
      matrix.lookAt(desired, target, up);
      desiredQuaternion.setFromRotationMatrix(matrix);
      returnDuration = Math.max(
        0.85,
        returnRotation.angleTo(desiredQuaternion) / 1.6,
      );
      returnFov = camera.fov;
      return setMode("drone");
    },
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
