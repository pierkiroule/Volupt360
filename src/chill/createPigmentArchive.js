import * as THREE from "three";
const layout = {
  position: 3,
  normal: 3,
  color: 3,
  uv: 2,
  aPigmentSeed: 1,
  aStrokeExtent: 1,
};
const attributes = Object.entries(layout);
/** Dry original brush geometries, batched by material. Growing buffers, no generic replacement lines. */
export function createPigmentArchive() {
  const group = new THREE.Group(),
    bounds = new THREE.Box3(),
    buckets = new Map();
  let traces = 0;
  const matrix = new THREE.Matrix4(),
    point = new THREE.Vector3(),
    normal = new THREE.Vector3();
  function allocate(bucket, vertices, indices) {
    const vertexCapacity = Math.max(
      2048,
      2 ** Math.ceil(Math.log2(Math.max(1, vertices))),
    );
    const indexCapacity = Math.max(
      4096,
      2 ** Math.ceil(Math.log2(Math.max(1, indices))),
    );
    const geometry = new THREE.BufferGeometry();
    for (const [name, size] of attributes) {
      const values =
        name === "color"
          ? new Uint8Array(vertexCapacity * size)
          : name === "normal"
            ? new Int16Array(vertexCapacity * size)
            : new Float32Array(vertexCapacity * size);
      if (bucket.geometry)
        values.set(
          bucket.geometry.attributes[name].array.subarray(
            0,
            bucket.vertices * size,
          ),
        );
      geometry.setAttribute(
        name,
        new THREE.BufferAttribute(
          values,
          size,
          name === "color" || name === "normal",
        ),
      );
    }
    const index = new Uint32Array(indexCapacity);
    if (bucket.geometry)
      index.set(bucket.geometry.index.array.subarray(0, bucket.indices));
    geometry.setIndex(new THREE.BufferAttribute(index, 1));
    bucket.geometry?.dispose();
    bucket.geometry = geometry;
    bucket.mesh.geometry = geometry;
  }
  return {
    group,
    bounds,
    get stats() {
      return {
        traces,
        batches: buckets.size,
        vertices: [...buckets.values()].reduce((s, b) => s + b.vertices, 0),
      };
    },
    add(mark) {
      mark.stroke.finish();
      mark.object.updateMatrixWorld(true);
      group.updateMatrixWorld(true);
      const inverse = new THREE.Matrix4().copy(group.matrixWorld).invert();
      mark.object.traverse((mesh) => {
        if (
          !mesh.isMesh ||
          !mesh.geometry?.attributes.position ||
          !mesh.material.uniforms
        )
          return;
        const u = mesh.material.uniforms,
          opacity = Math.max(
            0.25,
            Math.round((u.uOpacity?.value || 1) * 4) / 4,
          ),
          key = `${mark.brush}:${u.uStyle?.value}:${u.uLayer?.value}:${opacity}`;
        let bucket = buckets.get(key);
        if (!bucket) {
          const material = mesh.material.clone();
          material.defaultAttributeValues = {
            ...mesh.material.defaultAttributeValues,
          };
          material.uniforms.uBrushMask.value = u.uBrushMask.value;
          material.uniforms.uOpacity.value = opacity;
          material.uniforms.uFade.value = 1;
          material.uniforms.uAge.value = 360;
          material.uniforms.uMoisture.value = 0.08;
          material.uniforms.uWakeClock.value = 100000;
          material.uniforms.uWakeOffset.value.set(0, 0, 0);
          for (const name of ["uAudioEnergy", "uAudioLow", "uAudioPulse"])
            material.uniforms[name].value = 0;
          const dryMesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
          dryMesh.frustumCulled = false;
          group.add(dryMesh);
          bucket = { mesh: dryMesh, geometry: null, vertices: 0, indices: 0 };
          dryMesh.geometry.dispose();
          buckets.set(key, bucket);
        }
        const g = mesh.geometry,
          n = g.attributes.position.count,
          indexCount = g.index?.count || n,
          start = bucket.vertices;
        if (
          !bucket.geometry ||
          bucket.geometry.attributes.position.count < start + n ||
          bucket.geometry.index.count < bucket.indices + indexCount
        )
          allocate(bucket, start + n, bucket.indices + indexCount);
        matrix.multiplyMatrices(inverse, mesh.matrixWorld);
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
        for (let i = 0; i < n; i++)
          for (const [name, size] of attributes) {
            const dst = bucket.geometry.attributes[name].array,
              k = (start + i) * size,
              src = g.attributes[name];
            if (name === "aPigmentSeed") dst[k] = u.uSeed.value;
            else if (name === "aStrokeExtent") dst[k] = u.uStrokeExtent.value;
            else if (name === "aBirth") dst[k] = -10000;
            else if (name === "position" || name === "aTrailCenter") {
              point.fromBufferAttribute(g.attributes.position, i);
              if (name === "position") point.add(u.uWakeOffset.value);
              point.applyMatrix4(matrix);
              point.toArray(dst, k);
            } else if (name === "normal") {
              normal
                .fromBufferAttribute(g.attributes.normal, i)
                .applyMatrix3(normalMatrix)
                .normalize()
                .multiplyScalar(32767)
                .toArray(dst, k);
            } else
              for (let j = 0; j < size; j++)
                dst[k + j] =
                  name === "color"
                    ? Math.round((src ? src.array[i * size + j] : 1) * 255)
                    : src
                      ? src.array[i * size + j]
                      : 0;
          }
        for (let i = 0; i < indexCount; i++)
          bucket.geometry.index.array[bucket.indices + i] =
            start + (g.index ? g.index.array[i] : i);
        for (const attr of Object.values(bucket.geometry.attributes)) {
          attr.clearUpdateRanges();
          attr.addUpdateRange(0, (start + n) * attr.itemSize);
          attr.needsUpdate = true;
        }
        bucket.geometry.index.clearUpdateRanges();
        bucket.geometry.index.addUpdateRange(0, bucket.indices + indexCount);
        bucket.geometry.index.needsUpdate = true;
        bucket.vertices += n;
        bucket.indices += indexCount;
        bucket.geometry.setDrawRange(0, bucket.indices);
      });
      bounds.union(mark.bounds);
      traces++;
    },
    settle() {
      for (const bucket of buckets.values()) {
        const uniforms = bucket.mesh.material.uniforms;
        uniforms.uMoisture.value = 0;
        uniforms.uTime.value = 0;
        uniforms.uAge.value = 10000;
        for (const name of ["uAudioEnergy", "uAudioLow", "uAudioPulse"])
          uniforms[name].value = 0;
      }
    },
    clear() {
      for (const b of buckets.values()) {
        b.geometry.dispose();
        b.mesh.material.dispose();
      }
      buckets.clear();
      group.clear();
      bounds.makeEmpty();
      traces = 0;
    },
    dispose() {
      this.clear();
      group.removeFromParent();
    },
  };
}
