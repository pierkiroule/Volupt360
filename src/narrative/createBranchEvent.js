import * as THREE from "three";
export function createBranchEvent(config, ctx, resources) {
  const object = new THREE.Group(),
    existing = ctx.memory.branch;
  const point =
    existing?.point ||
    ctx.position
      .clone()
      .addScaledVector(ctx.direction, 6)
      .addScaledVector(ctx.up, -0.35)
      .addScaledVector(ctx.side, 1.4);
  let owns = false,
    perched = false,
    used = false,
    rest = 0;
  if (!existing) {
    const vertices = [];
    const local = (x, y, z) =>
      point
        .clone()
        .addScaledVector(ctx.side, x)
        .addScaledVector(ctx.up, y)
        .addScaledVector(ctx.direction, z);
    for (let i = 0; i < 12; i++) {
      const x = -2 + i * 0.34;
      vertices.push(
        local(x, Math.sin(x) * 0.09, 0),
        local(x + 0.34, Math.sin(x + 0.34) * 0.09, 0),
      );
      if (i % 3 === 1)
        vertices.push(
          local(x, 0.02, 0),
          local(x + 0.38, 0.4 + (i % 2) * 0.18, 0.16),
        );
    }
    const line = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(vertices),
      new THREE.LineBasicMaterial({
        color: "#727c8e",
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    object.add(line);
    owns = true;
    ctx.memory.branch = { point, owner: object };
  }
  const materials = [];
  object.traverse((node) => {
    if (node.material) materials.push(node.material);
  });
  return {
    object,
    get perched() {
      return perched;
    },
    releasePerch() {
      perched = false;
      used = true;
    },
    update(age, dt, current, opacity) {
      for (const m of materials) m.opacity = opacity * 0.65;
      if (
        config.variant === "refuge" &&
        !used &&
        age > 2 &&
        !current.manual &&
        !current.acrobatic &&
        current.position.distanceTo(point) < 0.85
      ) {
        perched = true;
        used = true;
      }
      if (perched) {
        rest += dt;
        if (rest > 3.5 || current.manual || current.acrobatic) perched = false;
      }
    },
    retain() {
      for (const m of materials) m.opacity = 0.55;
      return owns;
    },
    dispose() {
      if (ctx.memory.branch?.owner === object) ctx.memory.branch = null;
      resources.disposeObject(object);
    },
  };
}
