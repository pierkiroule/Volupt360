import * as THREE from "three";

/** Only mounted with ?traceDebug=1. One bounded line buffer and one marker. */
export function createTraceDebug(memory) {
  const group = new THREE.Group(),
    geometry = new THREE.BufferGeometry();
  const capacity = 80 * 79 * 2;
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(capacity * 3), 3),
  );
  geometry.setDrawRange(0, 0);
  const lines = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({
      color: 0x197b9b,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    }),
  );
  lines.frustumCulled = false;
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xce532b, wireframe: true }),
  );
  marker.visible = false;
  group.add(lines, marker);
  let revision = -1,
    remaining = 0;
  return {
    group,
    update(dt, hit) {
      if (revision !== memory.revision) {
        let used = 0;
        for (const trace of memory.traces.values())
          for (const segment of trace.segments) {
            if (used + 2 > capacity) break;
            segment.a.toArray(geometry.attributes.position.array, used++ * 3);
            segment.b.toArray(geometry.attributes.position.array, used++ * 3);
          }
        geometry.setDrawRange(0, used);
        geometry.attributes.position.needsUpdate = true;
        revision = memory.revision;
      }
      remaining = Math.max(0, remaining - dt);
      if (hit) {
        marker.position.copy(hit.position);
        remaining = 1.5;
      }
      marker.visible = remaining > 0;
    },
    dispose() {
      group.removeFromParent();
      geometry.dispose();
      lines.material.dispose();
      marker.geometry.dispose();
      marker.material.dispose();
    },
  };
}
