import * as THREE from "three";
/** Open the paper around the visitor; deposition order supplies gentle layer separation. */
export function paintingToWorld(point, layer, total, size) {
  const theta = (point.u - 0.5) * Math.PI * 2,
    phi = (point.v - 0.5) * Math.PI * 0.8;
  const radius =
    11 + (layer / Math.max(1, total - 1)) * 3 + Math.min(1, size * 8);
  return new THREE.Vector3(
    Math.sin(theta) * Math.cos(phi) * radius,
    -Math.sin(phi) * radius,
    20 - Math.cos(theta) * Math.cos(phi) * radius,
  );
}
