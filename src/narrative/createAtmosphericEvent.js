import * as THREE from "three";
const TAU = Math.PI * 2;
function cloud(resources, color, radius) {
  const group = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const mesh = resources.wash(color, radius * (1 + i * 0.16));
    mesh.position.set(
      Math.sin(i * 2.4) * 0.35,
      Math.cos(i * 1.7) * 0.16,
      Math.sin(i) * 0.3,
    );
    mesh.rotation.set(i * 0.42, i * 0.9, i * 0.3);
    mesh.material.userData.baseOpacity = 0.27;
    group.add(mesh);
  }
  return group;
}
function field(config, ctx, r, follow = false) {
  const object = new THREE.Group(),
    nodes = [],
    origin = ctx.position.clone(),
    side = ctx.side.clone(),
    up = ctx.up.clone(),
    forward = ctx.direction.clone();
  const target = new THREE.Vector3(),
    delta = new THREE.Vector3(),
    velocity = new THREE.Vector3();
  const count = follow ? 1 : config.variant === "opening" ? 2 : 3;
  for (let i = 0; i < count; i++) {
    const item = cloud(
      r,
      follow ? "#8c96a8" : ["#8e8ba9", "#8699ad", "#6a8096"][i],
      follow ? 2.8 : 2.3,
    );
    item.position
      .copy(origin)
      .addScaledVector(forward, 5 + i)
      .addScaledVector(side, follow ? 4 : (i - (count - 1) / 2) * 2.2)
      .addScaledVector(up, 1.5 + i * 0.4);
    object.add(item);
    nodes.push(item);
  }
  if (follow && ctx.memory?.cloud) nodes[0].position.copy(ctx.memory.cloud);
  return {
    object,
    animate(age, dt, current) {
      for (let i = 0; i < nodes.length; i++) {
        const item = nodes[i];
        if (follow) {
          target
            .copy(current.position)
            .addScaledVector(
              current.side,
              config.variant === "silent-cloud" ? -3.8 : 3.8,
            )
            .addScaledVector(current.direction, -0.6)
            .addScaledVector(current.up, 1.2);
          delta.copy(target).sub(item.position);
          const length = delta.length();
          if (length > 0.001)
            delta.multiplyScalar(Math.min(3.6, length * 0.55) / length);
          velocity.lerp(delta, 1 - Math.exp(-dt * 0.8));
          item.position.addScaledVector(velocity, dt);
        } else {
          const gap =
            config.variant === "opening"
              ? THREE.MathUtils.smoothstep(age, 0, 9) * 2.8
              : 0;
          item.position
            .copy(origin)
            .addScaledVector(forward, 5 + i)
            .addScaledVector(
              side,
              (i - (count - 1) / 2) * (2.2 + gap) +
                Math.sin(age * 0.13 + i) * 0.55,
            )
            .addScaledVector(
              up,
              1.5 + i * 0.4 + Math.cos(age * 0.09 + i) * 0.25,
            );
        }
        const morph = config.variant === "changing" ? 0.16 : 0.035;
        item.scale.set(
          1 + Math.sin(age * 0.17 + i) * morph,
          1 + Math.cos(age * 0.13 + i) * morph,
          1,
        );
        item.rotation.z = Math.sin(age * 0.06 + i) * 0.07;
      }
    },
    onDispose() {
      if (follow && ctx.memory) ctx.memory.cloud = nodes[0].position.clone();
    },
  };
}
function wind(config, ctx, r) {
  const object = new THREE.Group(),
    axis = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < 6; i++) {
    const points = [];
    for (let j = 0; j < 24; j++) {
      const p = j / 23;
      points.push(
        new THREE.Vector3(
          (i % 2 ? 1 : -1) * (0.5 + p * 0.8),
          Math.sin(p * 4 + i) * 0.12,
          -p * 3,
        ),
      );
    }
    const line = r.line(points, "#93b1b8", 0.32);
    line.position.y = (i - 2.5) * 0.13;
    object.add(line);
  }
  return {
    object,
    animate(age, dt, current) {
      object.position.copy(current.position);
      object.quaternion.setFromUnitVectors(axis, current.direction);
      object.scale.setScalar(0.9 + Math.sin(age * 0.8) * 0.08);
    },
  };
}
function rain(config, ctx, r) {
  const object = new THREE.Group(),
    array = new Float32Array(16 * 6),
    seeds = [];
  for (let i = 0; i < 16; i++)
    seeds.push([Math.sin(i * 2.4) * 4, Math.cos(i * 3.7) * 3, (i / 16) * 7]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(array, 3).setUsage(THREE.DynamicDrawUsage),
  );
  const lines = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({
      color: "#7d9eb2",
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
  );
  object.add(lines);
  object.position.copy(ctx.position).addScaledVector(ctx.direction, 6);
  let fall = 0;
  return {
    object,
    animate(age, dt) {
      const pace =
        1 -
        THREE.MathUtils.smoothstep(age, 2, 5) +
        THREE.MathUtils.smoothstep(age, 9, 12);
      fall += dt * pace * 0.65;
      for (let i = 0; i < 16; i++) {
        const [x, z, seed] = seeds[i],
          y = 4 - ((seed + fall) % 7);
        array.set([x, y, z, x, y - 0.18, z], i * 6);
      }
      geometry.attributes.position.needsUpdate = true;
    },
  };
}
function feather(config, ctx, r) {
  const object = new THREE.Group(),
    points = [];
  points.push(new THREE.Vector3(0, -0.7, 0), new THREE.Vector3(0, 0.9, 0));
  for (let i = 0; i < 9; i++) {
    const y = -0.45 + i * 0.14,
      w = Math.sin(((i + 1) / 10) * Math.PI) * 0.24;
    points.push(
      new THREE.Vector3(0, y - 0.1, 0),
      new THREE.Vector3(w, y + 0.1, 0),
      new THREE.Vector3(0, y - 0.1, 0),
      new THREE.Vector3(-w, y + 0.1, 0),
    );
  }
  const shape = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({
      color: "#8e8d9b",
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    }),
  );
  object.add(shape);
  const wash = r.wash("#c2a0b9", 1);
  wash.scale.set(0.52, 1.65, 1);
  object.add(wash);
  const origin = ctx.position
    .clone()
    .addScaledVector(ctx.direction, 6)
    .addScaledVector(ctx.up, 1.2);
  return {
    object,
    animate(age) {
      object.position.copy(origin);
      object.position.x += Math.sin(age * 0.17) * 0.8;
      object.position.y += Math.sin(age * 0.1) * 0.4;
      object.position.z += age * 0.035;
      object.rotation.set(
        Math.sin(age * 0.11) * 0.2,
        age * 0.07,
        Math.sin(age * 0.23) * 0.3,
      );
    },
  };
}
function landmarks(config, ctx, r) {
  const object = new THREE.Group();
  object.position.copy(ctx.position).addScaledVector(ctx.direction, 7);
  const leafPoints = [];
  for (let i = 0; i <= 24; i++) {
    const t = (i / 24) * TAU;
    leafPoints.push(
      new THREE.Vector3(
        Math.sin(t) * 0.23,
        Math.cos(t) * 0.45,
        Math.sin(t * 2) * 0.02,
      ),
    );
  }
  const leaf = r.line(leafPoints, "#8aab92", 0.6);
  leaf.position.set(-2, 1, 0);
  object.add(leaf);
  const dropPoints = [];
  for (let i = 0; i <= 24; i++) {
    const t = (i / 24) * TAU;
    dropPoints.push(
      new THREE.Vector3(
        Math.sin(t) * (0.15 + 0.05 * Math.cos(t)),
        Math.cos(t) * 0.3,
        0,
      ),
    );
  }
  const drop = r.line(dropPoints, "#82a6bd", 0.65);
  drop.position.set(0, 0.3, 0.7);
  object.add(drop);
  const starPoints = [];
  for (let i = 0; i <= 10; i++) {
    const t = (i / 10) * TAU,
      rad = i % 2 ? 0.11 : 0.28;
    starPoints.push(new THREE.Vector3(Math.sin(t) * rad, Math.cos(t) * rad, 0));
  }
  const star = r.line(starPoints, "#bea177", 0.65);
  star.position.set(2, 1.4, -0.2);
  object.add(star);
  return {
    object,
    animate(age) {
      object.rotation.y = Math.sin(age * 0.08) * 0.12;
      object.position.y += 0;
    },
  };
}
const builders = {
  chatter: field,
  "old-cloud": (c, x, r) => field(c, x, r, true),
  "silent-cloud": (c, x, r) => field(c, x, r, true),
  changing: field,
  opening: field,
  wind,
  rain,
  feather,
  landmarks,
};
export function createAtmosphericEvent(config, ctx, resources) {
  const data = builders[config.variant](config, ctx, resources),
    materials = [];
  data.object.traverse((node) => {
    if (node.material)
      materials.push([
        node.material,
        node.material.userData.baseOpacity ?? (node.material.opacity || 0.35),
      ]);
  });
  return {
    object: data.object,
    update(age, dt, current, opacity, effects) {
      data.animate(age, dt, current);
      for (const [material, base] of materials)
        material.opacity = base * opacity;
      if (config.variant === "opening")
        effects.opening = Math.max(effects.opening, opacity * 0.7);
    },
    dispose() {
      data.onDispose?.();
      resources.disposeObject(data.object);
    },
  };
}
