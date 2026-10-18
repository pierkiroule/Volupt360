import * as THREE from "three";
import { createBrushStroke, disposeMark } from "../engine/brushes.js";
function pigmentPath(points, color, resources) {
  const direction = new THREE.Vector3(),
    side = new THREE.Vector3(),
    up = new THREE.Vector3(),
    worldUp = new THREE.Vector3(0, 1, 0);
  const stroke = createBrushStroke("filaments", {
    seed: 17,
    color: new THREE.Color(color),
    texture: { texture: resources.alpha, aspect: 1, repeat: 3 },
    dynamics: { materialMode: 1, width: 0.23, opacity: 0.62 },
  });
  for (let i = 0; i < points.length; i++) {
    direction
      .copy(points[Math.min(points.length - 1, i + 1)])
      .sub(points[Math.max(0, i - 1)])
      .normalize();
    side.crossVectors(direction, worldUp).normalize();
    up.crossVectors(side, direction).normalize();
    stroke.append({
      position: points[i],
      direction,
      side,
      up,
      time: i * 0.1,
      energy: 0.2,
      low: 0.1,
      density: 0.7,
    });
  }
  stroke.finish();
  return stroke.group;
}
function curve(ctx, kind) {
  const origin = kind === "new-line" ? ctx.paintAnchor : ctx.position,
    points = [];
  for (let i = 0; i < 32; i++) {
    const p = i / 31;
    points.push(
      origin
        .clone()
        .addScaledVector(ctx.direction, p * (kind === "new-line" ? 4 : 12))
        .addScaledVector(
          ctx.side,
          Math.sin(p * Math.PI) * (kind === "new-line" ? 1.3 : 5),
        )
        .addScaledVector(
          ctx.up,
          Math.sin(p * Math.PI * 1.3) * (kind === "new-line" ? 0.6 : 2.2),
        ),
    );
  }
  return points;
}
export function createPainterlyEvent(config, ctx, resources) {
  const object = new THREE.Group(),
    materials = [],
    meshes = [];
  let painterly = false;
  if (config.variant === "new-line" || config.variant === "detour") {
    object.add(
      pigmentPath(
        curve(ctx, config.variant),
        config.variant === "detour" ? "#c1b18d" : "#927b9d",
        resources,
      ),
    );
    painterly = true;
  } else if (config.variant === "crossed") {
    if (ctx.memory.paths && ctx.memory.pathCount) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(
          ctx.memory.paths.slice(0, ctx.memory.pathCount * 6),
          3,
        ),
      );
      object.add(
        new THREE.LineSegments(
          geometry,
          new THREE.LineBasicMaterial({
            color: "#8b92b5",
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
          }),
        ),
      );
    } else {
      for (let i = 0; i < 3; i++) {
        const points = curve(ctx, "new-line");
        for (let j = 0; j < points.length; j++)
          points[j].addScaledVector(ctx.side, Math.sin(j * 0.15 + i) * 1.2);
        object.add(
          resources.line(points, ["#b19678", "#8e82aa", "#799eb0"][i], 0.45),
        );
      }
    }
  } else if (config.variant === "elastic" || config.variant === "call") {
    const count = config.variant === "elastic" ? 3 : 1;
    for (let i = 0; i < count; i++) {
      const points = [];
      for (let j = 0; j <= 48; j++) {
        const a = (j / 48) * Math.PI * 2;
        points.push(
          new THREE.Vector3(
            Math.cos(a) * (0.45 + i * 0.17),
            Math.sin(a) * (0.45 + i * 0.17),
            0,
          ),
        );
      }
      const ring = resources.line(
        points,
        config.variant === "call" ? "#9fa2bc" : "#9ba8b4",
        0.45,
      );
      ring.position
        .copy(ctx.position)
        .addScaledVector(ctx.direction, config.variant === "call" ? 0 : 4)
        .addScaledVector(ctx.side, (i - 1) * 1.7);
      ring.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        ctx.direction,
      );
      object.add(ring);
    }
  }
  object.traverse((node) => {
    if (node.material) {
      materials.push([
        node.material,
        node.material.uniforms?.uOpacity?.value ?? node.material.opacity,
      ]);
      if (node.geometry?.index) meshes.push(node);
    }
  });
  return {
    object,
    update(age, dt, current, opacity, effects) {
      if (config.variant === "spiral")
        effects.spiral = Math.max(effects.spiral, opacity);
      if (config.variant === "memory")
        effects.contrast = Math.max(effects.contrast, opacity);
      for (let i = 0; i < object.children.length; i++) {
        const child = object.children[i];
        if (config.variant === "elastic")
          child.scale.set(
            1 + Math.sin(age * 0.23 + i) * 0.24,
            1 + Math.cos(age * 0.17 + i) * 0.18,
            1,
          );
        if (config.variant === "call") child.scale.setScalar(1 + age * 0.45);
      }
      for (const [material, base] of materials) {
        if (material.uniforms) {
          material.uniforms.uOpacity.value = base * opacity;
          material.uniforms.uTime.value = age * 0.2;
          material.uniforms.uMoisture.value = Math.max(0, 0.4 - age * 0.018);
          material.uniforms.uWakeClock.value = 100000;
        } else material.opacity = base * opacity;
      }
      for (const mesh of meshes)
        mesh.geometry.setDrawRange(
          0,
          Math.floor((mesh.geometry.index.count * Math.min(1, age / 5)) / 6) *
            6,
        );
    },
    retain() {
      for (const [m, base] of materials) {
        if (m.uniforms) {
          m.uniforms.uOpacity.value = base * 0.7;
          m.uniforms.uMoisture.value = 0;
        } else m.opacity = base * 0.7;
      }
      return true;
    },
    dispose() {
      if (painterly) disposeMark(object);
      else resources.disposeObject(object);
    },
  };
}
