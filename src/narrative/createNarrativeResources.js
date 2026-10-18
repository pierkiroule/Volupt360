import * as THREE from "three";
import { createWatercolorAlpha } from "../chill/createWatercolorAlpha.js";
export function createNarrativeResources() {
  const plane = new THREE.PlaneGeometry(1, 1, 6, 6);
  const alpha = new THREE.CanvasTexture(
    createWatercolorAlpha("wash", 1987, 128),
  );
  const ownedShared = new Set([plane]);
  return {
    alpha,
    plane,
    wash(color = "#8b99af", scale = 1) {
      const mesh = new THREE.Mesh(
        plane,
        new THREE.MeshBasicMaterial({
          color,
          map: alpha,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      mesh.scale.setScalar(scale);
      return mesh;
    },
    line(points, color = "#75899c", opacity = 0.5) {
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      return new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity,
          depthWrite: false,
        }),
      );
    },
    disposeObject(object) {
      object.traverse((node) => {
        if (node.geometry && !ownedShared.has(node.geometry))
          node.geometry.dispose();
        if (node.material) node.material.dispose();
      });
      object.removeFromParent();
    },
    dispose() {
      plane.dispose();
      alpha.dispose();
    },
  };
}
