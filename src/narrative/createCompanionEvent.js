import * as THREE from "three";
import { createOizo } from "../sonoizo/createOizo.js";
/** Reuse OIZO's skeleton, with two restrained ink/watercolor identities. */
export function createCompanionEvent(config, context, resources) {
  const object = new THREE.Group(),
    birds = [];
  const pair = ["pair", "shared", "departure"].includes(config.variant);
  const species = pair
    ? ["tit", "owl"]
    : [
        config.variant === "owl" ||
        (config.variant === "return" && config.index % 2 === 0)
          ? "owl"
          : "tit",
      ];
  const trailPositions = new Float32Array(96 * 3 * 2),
    trailColors = new Float32Array(96 * 3 * 2);
  let trailCount = 0,
    trailClock = 0;
  const trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(trailPositions, 3).setUsage(
      THREE.DynamicDrawUsage,
    ),
  );
  trailGeometry.setAttribute(
    "color",
    new THREE.BufferAttribute(trailColors, 3),
  );
  const trail = new THREE.LineSegments(
    trailGeometry,
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  trailGeometry.setDrawRange(0, 0);
  if (config.variant === "shared") object.add(trail);
  for (let i = 0; i < species.length; i++) {
    const kind = species[i],
      bird = createOizo();
    bird.group.scale.setScalar(kind === "owl" ? 0.95 : 0.72);
    bird.setColor(kind === "owl" ? "#66728a" : "#526d80");
    const wash = resources.wash(kind === "owl" ? "#b8a4b2" : "#d3ab6a", 0.23);
    wash.position.set(0, -0.01, 0.025);
    wash.scale.y *= kind === "owl" ? 1.3 : 0.85;
    bird.group.add(wash);
    const sideSign = i === 0 ? -1 : 1;
    const position = context.position
      .clone()
      .addScaledVector(context.direction, 10 + i * 2)
      .addScaledVector(context.side, sideSign * 6)
      .addScaledVector(context.up, 2 + i);
    const previousPose = context.memory?.companionPoses?.[kind];
    if (previousPose && previousPose.position.distanceTo(context.position) < 40)
      position.copy(previousPose.position);
    const direction =
      previousPose?.direction.clone() || context.direction.clone();
    const velocity = new THREE.Vector3(),
      target = new THREE.Vector3(),
      delta = new THREE.Vector3(),
      side = new THREE.Vector3(),
      up = new THREE.Vector3();
    const previous = position.clone(),
      color = new THREE.Color(kind === "owl" ? "#a18eb7" : "#b99c66");
    const materials = [];
    bird.group.traverse((node) => {
      if (node.material) {
        node.material.transparent = true;
        node.material.depthWrite = false;
        materials.push(node.material);
      }
    });
    birds.push({
      kind,
      bird,
      wash,
      materials,
      position,
      direction,
      velocity,
      target,
      delta,
      side,
      up,
      previous,
      color,
      sideSign,
    });
    object.add(bird.group);
  }
  function remember() {
    if (!context.memory?.companionPoses) return;
    for (const b of birds)
      context.memory.companionPoses[b.kind] = {
        position: b.position.clone(),
        direction: b.direction.clone(),
      };
  }
  return {
    object,
    companionCount: birds.length,
    update(age, dt, ctx, opacity, effects) {
      const depart = THREE.MathUtils.smoothstep(
        age,
        config.variant === "departure" ? 2 : config.duration - 8,
        config.variant === "departure" ? 14 : config.duration - 2,
      );
      if (config.variant === "departure" && effects)
        effects.opening = Math.max(effects.opening, opacity * 0.65);
      trailClock += dt;
      for (let i = 0; i < birds.length; i++) {
        const b = birds[i],
          phase = age * 0.39 + i * 2.3 + config.index;
        b.target
          .copy(ctx.position)
          .addScaledVector(ctx.direction, 1.8 + Math.sin(phase * 0.6) * 0.7)
          .addScaledVector(
            ctx.side,
            b.sideSign * (2.8 + i * 0.9 + Math.sin(phase) * 0.45),
          )
          .addScaledVector(
            ctx.up,
            0.8 + i * 0.6 + Math.cos(phase * 0.73) * 0.35,
          );
        b.target
          .addScaledVector(ctx.direction, depart * 15)
          .addScaledVector(ctx.side, depart * b.sideSign * 10)
          .addScaledVector(ctx.up, depart * (3 + i));
        b.delta.copy(b.target).sub(b.position);
        const distance = b.delta.length();
        if (distance > 0.01)
          b.delta.multiplyScalar(
            Math.min(b.kind === "owl" ? 3.4 : 4.2, distance * 0.8) / distance,
          );
        else b.delta.set(0, 0, 0);
        b.velocity.lerp(
          b.delta,
          1 - Math.exp(-dt * (b.kind === "owl" ? 0.9 : 1.4)),
        );
        b.position.addScaledVector(b.velocity, dt);
        if (b.velocity.lengthSq() > 0.01)
          b.direction
            .lerp(b.delta.normalize(), 1 - Math.exp(-dt * 2.3))
            .normalize();
        b.side.crossVectors(b.direction, newUp);
        if (b.side.lengthSq() < 0.001) b.side.copy(ctx.side);
        b.side.normalize();
        b.up.crossVectors(b.side, b.direction).normalize();
        b.bird.update({
          time: age * (b.kind === "owl" ? 0.78 : 1.07),
          position: b.position,
          direction: b.direction,
          side: b.side,
          up: b.up,
          pilotY: 0.2 + Math.sin(phase * 0.9) * 0.12,
          acoustic: { low: 0.15 },
        });
        for (const material of b.materials)
          material.opacity =
            opacity *
            0.8 *
            (1 -
              THREE.MathUtils.smoothstep(
                age,
                config.duration - 4,
                config.duration,
              ));
        if (
          config.variant === "shared" &&
          trailClock > 0.35 &&
          trailCount < 96
        ) {
          b.previous.toArray(trailPositions, trailCount * 6);
          b.position.toArray(trailPositions, trailCount * 6 + 3);
          b.color.toArray(trailColors, trailCount * 6);
          b.color.toArray(trailColors, trailCount * 6 + 3);
          trailCount++;
        }
        b.previous.copy(b.position);
      }
      if (trailClock > 0.35) trailClock = 0;
      trailGeometry.setDrawRange(0, trailCount * 2);
      trailGeometry.attributes.position.needsUpdate = true;
      trailGeometry.attributes.color.needsUpdate = true;
      trail.material.opacity = opacity * 0.38;
      if (config.variant === "shared") {
        ctx.memory.paths = trailPositions;
        ctx.memory.pathCount = trailCount;
      }
    },
    retain() {
      remember();
      for (const b of birds) {
        b.wash.material.dispose();
        b.bird.dispose();
      }
      birds.length = 0;
      trail.material.opacity = 0.3;
      return trailCount > 0;
    },
    dispose() {
      remember();
      for (const b of birds) {
        b.wash.material.dispose();
        b.bird.dispose();
      }
      birds.length = 0;
      trailGeometry.dispose();
      trail.material.dispose();
      object.removeFromParent();
    },
  };
}
const newUp = new THREE.Vector3(0, 1, 0);
