import * as THREE from "three";
import type { Artwork } from "./ArtCollection";
/** Three shared-geometry membranes; proximity uses world distances, never screen overlap. */
export class ArtBubbles {
  readonly group = new THREE.Group();
  private geometry = new THREE.SphereGeometry(1.25, 24, 16);
  private planes = new THREE.PlaneGeometry(1.75, 1.75);
  private entries: {
    shell: THREE.Mesh;
    image: THREE.Mesh;
    art: Artwork;
    visited: boolean;
    texture: THREE.Texture;
  }[] = [];
  private generation = 0;
  private previous = new THREE.Vector3();
  private nearest = new THREE.Vector3();
  private segment = new THREE.Line3();
  private hasPrevious = false;
  onEncounter: (art: Artwork) => void = () => {};
  setWorks(works: Artwork[]) {
    this.clear();
    const generation = this.generation;
    works.forEach((art, i) => {
      new THREE.TextureLoader().load(
        art.image,
        (texture) => {
          if (generation !== this.generation) {
            texture.dispose();
            return;
          }
          texture.colorSpace = THREE.SRGBColorSpace;
          const shell = new THREE.Mesh(
            this.geometry,
            new THREE.MeshBasicMaterial({
              color: "#e4efff",
              transparent: true,
              opacity: 0.13,
              depthWrite: false,
            }),
          );
          shell.position.set(
            Math.sin(i * 2.094) * 5.5,
            18 + (i - 1) * 0.8,
            -5 + Math.cos(i * 2.094) * 5.5,
          );
          const image = new THREE.Mesh(
            this.planes,
            new THREE.MeshBasicMaterial({
              map: texture,
              transparent: true,
              opacity: 0.82,
              side: THREE.DoubleSide,
              depthWrite: false,
            }),
          );
          image.position.copy(shell.position);
          this.entries.push({ shell, image, art, visited: false, texture });
          this.group.add(shell, image);
        },
        undefined,
        () => {
          /* A failed CORS image is never replaced with a fake artwork. */
        },
      );
    });
  }
  update(camera: THREE.Camera, active: boolean) {
    if (!active) {
      this.hasPrevious = false;
      return;
    }
    for (const entry of this.entries) {
      entry.image.quaternion.copy(camera.quaternion);
      if (this.hasPrevious && !entry.visited) {
        this.segment
          .set(this.previous, camera.position)
          .closestPointToPoint(entry.shell.position, true, this.nearest);
        if (this.nearest.distanceToSquared(entry.shell.position) < 2.25) {
          entry.visited = true;
          (entry.shell.material as THREE.MeshBasicMaterial).opacity = 0.045;
          this.onEncounter(entry.art);
        }
      }
    }
    this.previous.copy(camera.position);
    this.hasPrevious = true;
  }
  private clear() {
    this.generation++;
    this.hasPrevious = false;
    for (const e of this.entries) {
      e.texture.dispose();
      (e.shell.material as THREE.Material).dispose();
      (e.image.material as THREE.Material).dispose();
    }
    this.entries = [];
    this.group.clear();
  }
  dispose() {
    this.clear();
    this.geometry.dispose();
    this.planes.dispose();
  }
}
