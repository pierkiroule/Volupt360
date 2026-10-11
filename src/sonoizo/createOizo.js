import * as THREE from "three";

/** A lightweight, winged nozzle. Forward is +Z, aligned with the brush tangent. */
export function createOizo() {
  const group = new THREE.Group();
  const feather = new THREE.MeshBasicMaterial({
    color: "#476b70",
    side: THREE.DoubleSide,
  });
  const warm = new THREE.MeshBasicMaterial({ color: "#d2a772" });
  const eye = new THREE.MeshBasicMaterial({ color: "#171f27" });
  function sphere(material, size, position) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), material);
    mesh.scale.set(...size);
    mesh.position.set(...position);
    group.add(mesh);
    return mesh;
  }
  sphere(feather, [0.3, 0.25, 0.65], [0, 0, 0]);
  sphere(warm, [0.23, 0.23, 0.25], [0, 0.16, 0.52]);
  for (const x of [-0.2, 0.2])
    sphere(eye, [0.032, 0.032, 0.032], [x, 0.22, 0.65]);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.26, 6), warm);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.14, 0.83);
  group.add(beak);
  const wingGeometry = new THREE.BufferGeometry();
  wingGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [0, 0, 0, 1.3, 0.08, -0.42, 0.48, 0.02, 0.38],
      3,
    ),
  );
  const wings = [-1, 1].map((side) => {
    const wing = new THREE.Mesh(wingGeometry, feather);
    wing.scale.x = side;
    wing.position.set(side * 0.16, 0.05, -0.05);
    group.add(wing);
    return wing;
  });
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.6, 3), feather);
  tail.rotation.x = -Math.PI / 2;
  tail.position.z = -0.68;
  group.add(tail);
  const forward = new THREE.Vector3(0, 0, 1);
  return {
    group,
    update(pose) {
      group.position.copy(pose.position);
      group.quaternion.setFromUnitVectors(forward, pose.direction);
      const flap =
        Math.sin(pose.time * (4 + pose.energy * 3)) *
        (0.18 + pose.energy * 0.2);
      wings[0].rotation.z = -flap;
      wings[1].rotation.z = flap;
    },
    dispose() {
      const geometries = new Set();
      group.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
      });
      geometries.forEach((geometry) => geometry.dispose());
      feather.dispose();
      warm.dispose();
      eye.dispose();
      group.removeFromParent();
    },
  };
}
