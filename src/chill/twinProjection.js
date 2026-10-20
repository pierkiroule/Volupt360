import { spatialBrushPoint } from "./spatialBrushFrame.js";
/** Inverse of the paper panorama. Depth is kept in the source stroke, never discarded. */
export function worldToPaper(point) {
  const x = point[0],
    y = point[1],
    z = point[2] - 20,
    r = Math.hypot(x, y, z) || 1;
  return {
    x: Math.atan2(x, -z) / (Math.PI * 2),
    y: -Math.asin(Math.max(-1, Math.min(1, y / r))) / Math.PI,
  };
}
export function pointToPaper(point, frame) {
  return frame ? worldToPaper(spatialBrushPoint(point, frame)) : point;
}
export function pointToWorld(point, layer, size) {
  const theta = point.x * Math.PI * 2,
    phi = point.y * Math.PI,
    radius = 11 + (layer / 79) * 3 + Math.min(1, size * 8);
  return [
    Math.sin(theta) * Math.cos(phi) * radius,
    -Math.sin(phi) * radius,
    20 - Math.cos(theta) * Math.cos(phi) * radius,
  ];
}
