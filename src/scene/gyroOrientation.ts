import { Euler, MathUtils, Quaternion, Vector3 } from "three";
const rotation = new Euler(),
  screenRotation = new Quaternion();
const correction = new Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)),
  z = new Vector3(0, 0, 1);
/** W3C device orientation -> Three camera coordinates, including screen rotation. */
export function deviceQuaternion(
  alpha: number,
  beta: number,
  gamma: number,
  screenAngle: number,
  out = new Quaternion(),
) {
  return out
    .setFromEuler(
      rotation.set(
        MathUtils.degToRad(beta),
        MathUtils.degToRad(alpha),
        -MathUtils.degToRad(gamma),
        "YXZ",
      ),
    )
    .multiply(correction)
    .multiply(
      screenRotation.setFromAxisAngle(z, -MathUtils.degToRad(screenAngle)),
    );
}
export async function requestGyroscope() {
  if (!window.isSecureContext)
    throw Error(
      "Le gyroscope nécessite une connexion HTTPS. Le glissement tactile reste disponible.",
    );
  if (typeof DeviceOrientationEvent === "undefined")
    throw Error("Gyroscope indisponible : utilise le glissement tactile.");
  const EventClass = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
    requestPermission?: () => Promise<string>;
  };
  if (
    EventClass.requestPermission &&
    (await EventClass.requestPermission()) !== "granted"
  )
    throw Error(
      "Autorisation gyroscope refusée. Le glissement tactile reste disponible.",
    );
}
