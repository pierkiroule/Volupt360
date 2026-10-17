import * as THREE from "three";

/** Three branching paths, packed into one bounded draw call per stroke. */
export function createNetworkStroke({
  material,
  color,
  seed,
  capacity,
  width = 1,
  dispersion = 1,
  opacity = 0.95,
}) {
  const node = new THREE.SphereGeometry(1, 5, 3).toNonIndexed();
  const tube = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true).toNonIndexed();
  const vertices =
    Math.ceil(capacity / 4) *
    (3 * node.attributes.position.count + 6 * tube.attributes.position.count);
  let geometry = new THREE.BufferGeometry();
  for (const [name, size] of [
    ["position", 3],
    ["normal", 3],
    ["color", 3],
    ["uv", 2],
  ])
    geometry.setAttribute(
      name,
      new THREE.BufferAttribute(
        new Float32Array(vertices * size),
        size,
      ).setUsage(THREE.DynamicDrawUsage),
    );
  geometry.setDrawRange(0, 0);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const matrix = new THREE.Matrix4(),
    normalMatrix = new THREE.Matrix3();
  const point = new THREE.Vector3(),
    normal = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0),
    quaternion = new THREE.Quaternion();
  let used = 0,
    previous = null,
    closed = false;
  function stamp(shape, center, scale, rotation, progress) {
    matrix.compose(center, rotation, scale);
    normalMatrix.getNormalMatrix(matrix);
    for (let i = 0; i < shape.attributes.position.count; i++) {
      point
        .fromBufferAttribute(shape.attributes.position, i)
        .applyMatrix4(matrix);
      normal
        .fromBufferAttribute(shape.attributes.normal, i)
        .applyNormalMatrix(normalMatrix);
      point.toArray(geometry.attributes.position.array, used * 3);
      normal.toArray(geometry.attributes.normal.array, used * 3);
      color.toArray(geometry.attributes.color.array, used * 3);
      geometry.attributes.uv.array[used * 2] = shape.attributes.uv.getX(i);
      geometry.attributes.uv.array[used * 2 + 1] = progress;
      used++;
    }
  }
  function link(a, b, progress, energy) {
    const direction = b.clone().sub(a),
      length = direction.length();
    if (length < 0.0001) return;
    quaternion.setFromUnitVectors(up, direction.divideScalar(length));
    stamp(
      tube,
      a.clone().add(b).multiplyScalar(0.5),
      new THREE.Vector3(
        (0.025 + energy * 0.018) * width,
        length,
        (0.025 + energy * 0.018) * width,
      ),
      quaternion,
      progress,
    );
  }
  return {
    mesh,
    append(sample, count) {
      if (closed || count % 4) return;
      const progress = count / (capacity - 1);
      const points = Array.from({ length: 3 }, (_, branch) => {
        const angle = (branch * Math.PI * 2) / 3 + sample.time * 0.35 + seed;
        return sample.position
          .clone()
          .addScaledVector(
            sample.side,
            Math.cos(angle) * (0.7 + sample.energy * 0.9) * dispersion,
          )
          .addScaledVector(
            sample.up,
            Math.sin(angle) * (0.7 + sample.energy * 0.9) * dispersion,
          );
      });
      points.forEach((p, branch) => {
        stamp(
          node,
          p,
          new THREE.Vector3().setScalar((0.09 + sample.energy * 0.09) * width),
          new THREE.Quaternion(),
          progress,
        );
        link(sample.position, p, progress, sample.energy);
        if (previous) link(previous[branch], p, progress, sample.energy);
      });
      previous = points;
      material.uniforms.uOpacity.value = opacity * (sample.density ?? 1);
      geometry.setDrawRange(0, used);
      for (const attr of Object.values(geometry.attributes))
        attr.needsUpdate = true;
    },
    finish() {
      if (closed) return;
      closed = true;
      const old = geometry;
      geometry = new THREE.BufferGeometry();
      for (const [name, attr] of Object.entries(old.attributes))
        geometry.setAttribute(
          name,
          new THREE.BufferAttribute(
            attr.array.slice(0, used * attr.itemSize),
            attr.itemSize,
          ),
        );
      geometry.setDrawRange(0, used);
      geometry.computeBoundingSphere();
      mesh.geometry = geometry;
      old.dispose();
      mesh.frustumCulled = true;
      previous = null;
      node.dispose();
      tube.dispose();
    },
  };
}
