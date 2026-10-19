import * as THREE from "three";
import { haikuForPainting } from "./haikuGarden.js";
import { paintingToWorld } from "./paintingToWorld.js";

/** One quiet, world-anchored gift; the DOM hit target also supports keyboard access. */
export function createHaikuSeed(container, onReveal) {
  const group = new THREE.Group();
  const geometry = new THREE.SphereGeometry(0.34, 20, 14);
  const material = new THREE.MeshBasicMaterial({
    color: "#b7c8be",
    transparent: true,
    opacity: 0.23,
    depthWrite: false,
  });
  const shell = new THREE.Mesh(geometry, material);
  const grainGeometry = new THREE.SphereGeometry(0.075, 10, 8);
  const grainMaterial = new THREE.MeshBasicMaterial({
    color: "#776c51",
    transparent: true,
    opacity: 0.85,
  });
  const grain = new THREE.Mesh(grainGeometry, grainMaterial);
  grain.scale.set(0.65, 1.5, 0.65);
  group.add(shell, grain);
  const button = document.createElement("button");
  button.className = "haiku-seed-target";
  button.setAttribute("aria-label", "Ouvrir la graine de haïku");
  button.title = "Une graine de haïku";
  button.hidden = true;
  container.append(button);
  const projected = new THREE.Vector3(),
    world = new THREE.Vector3(),
    origin = new THREE.Vector3();
  let gift = null,
    age = 0,
    visited = false;
  const reveal = () => {
    if (!gift || button.hidden || button.disabled) return;
    visited = true;
    button.dataset.discovered = "true";
    onReveal?.(gift.poem);
  };
  button.addEventListener("click", reveal);
  return {
    group,
    setPainting(document) {
      gift = haikuForPainting(document);
      age = 0;
      visited = false;
      button.dataset.discovered = "false";
      if (gift) {
        origin.copy(
          paintingToWorld(
            gift.point,
            gift.layer,
            document.strokes.length,
            gift.size,
          ),
        );
        origin.y += 0.24;
        group.position.copy(origin);
      }
      group.visible = false;
      button.hidden = true;
    },
    update(camera, dt, width, height, visible = true) {
      age += dt;
      group.visible = Boolean(gift && visible);
      if (!group.visible) {
        button.hidden = true;
        return;
      }
      group.position.copy(origin);
      group.position.y += Math.sin(age * 0.55) * 0.08;
      const emerge = 1 - Math.exp(-age * 1.5);
      group.scale.setScalar(0.8 + emerge * 0.2);
      material.opacity = emerge * (visited ? 0.13 : 0.26);
      grain.rotation.z = Math.sin(age * 0.27) * 0.2;
      group.getWorldPosition(world);
      projected.copy(world).project(camera);
      const shown =
        age > 0.5 &&
        projected.z > -1 &&
        projected.z < 1 &&
        Math.abs(projected.x) < 0.96 &&
        Math.abs(projected.y) < 0.95;
      button.hidden = !shown;
      button.disabled = !shown;
      if (shown) {
        // Keep the touch target steady while the tiny painted shell drifts.
        const x = Math.round((((projected.x + 1) * width) / 2 - 22) / 3) * 3;
        const y = Math.round((((1 - projected.y) * height) / 2 - 22) / 3) * 3;
        button.style.transform = `translate(${x}px, ${y}px)`;
      }
    },
    clear() {
      gift = null;
      group.visible = false;
      button.hidden = true;
    },
    dispose() {
      button.removeEventListener("click", reveal);
      button.remove();
      geometry.dispose();
      material.dispose();
      grainGeometry.dispose();
      grainMaterial.dispose();
    },
  };
}
