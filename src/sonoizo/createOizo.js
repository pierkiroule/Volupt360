import * as THREE from "three";

/** A tiny V with a three-joint, continuously weighted wing rig. Forward is +Z. */
export function createOizo() {
  const group = new THREE.Group();
  group.scale.setScalar(1.6);
  const body = new THREE.Group();
  group.add(body);
  const material = new THREE.MeshBasicMaterial({
    color: "#284c55",
    side: THREE.DoubleSide,
  });
  const keel = new THREE.BufferGeometry();
  keel.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        0, 0.012, 0.23, -0.024, 0, -0.1, 0.024, 0, -0.1, 0, 0, -0.08, -0.05,
        -0.008, -0.23, 0.05, -0.008, -0.23,
      ],
      3,
    ),
  );
  const silhouette = new THREE.Mesh(keel, material);
  body.add(silhouette);
  const wings = [-1, 1].map((side) => {
    const positions = [],
      indices = [],
      weights = [],
      joints = [],
      triangles = [];
    const spans = [0, 0.2, 0.37];
    for (let i = 0; i <= 16; i++) {
      const x = (i / 16) * 0.52;
      const center = 0.12 - x * 0.64 + Math.sin((i / 16) * Math.PI) * 0.045;
      const width = 0.018 + 0.12 * Math.pow(Math.sin((i / 16) * Math.PI), 0.7);
      const joint = x < spans[1] ? 0 : 1;
      const blend = THREE.MathUtils.smoothstep(
        x,
        spans[joint],
        spans[joint + 1],
      );
      for (let edge = 0; edge < 2; edge++) {
        positions.push(
          side * x,
          Math.sin((i / 16) * Math.PI) * 0.035,
          center + (edge ? -1 : 1) * width * 0.5,
        );
        indices.push(joint, joint + 1, 0, 0);
        weights.push(1 - blend, blend, 0, 0);
        if (i < 16 && edge === 0) {
          const k = i * 2;
          triangles.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute(
      "skinIndex",
      new THREE.Uint16BufferAttribute(indices, 4),
    );
    geometry.setAttribute(
      "skinWeight",
      new THREE.Float32BufferAttribute(weights, 4),
    );
    geometry.setIndex(triangles);
    const bones = spans.map((span, i) => {
      const bone = new THREE.Bone();
      bone.name = `${side < 0 ? "left" : "right"}-${["shoulder", "elbow", "wrist"][i]}`;
      bone.position.x = side * (span - (spans[i - 1] || 0));
      return bone;
    });
    bones[0].add(bones[1]);
    bones[1].add(bones[2]);
    const mesh = new THREE.SkinnedMesh(geometry, material);
    mesh.name = side < 0 ? "left-wing" : "right-wing";
    mesh.add(bones[0]);
    const skeleton = new THREE.Skeleton(bones);
    mesh.bind(skeleton);
    // Tiny fixed meshes: avoid per-frame skinned bounding-box allocations/culling pops.
    mesh.frustumCulled = false;
    body.add(mesh);
    return { mesh, bones, side, skeleton };
  });
  const previousDirection = new THREE.Vector3(),
    cross = new THREE.Vector3();
  const basis = new THREE.Matrix4(),
    orientation = new THREE.Quaternion();
  const right = new THREE.Vector3(),
    flightUp = new THREE.Vector3(),
    worldUp = new THREE.Vector3(0, 1, 0);
  let previousTime,
    turn = 0,
    bank = 0,
    burst = 0,
    cooldown = 0,
    phase = 0,
    climb = 0,
    dive = 0,
    figureRoll = 0;
  return {
    group,
    setColor(color) {
      material.color.set(color);
    },
    update(pose) {
      const first = previousTime === undefined;
      const dt = first
        ? 0
        : Math.max(0, Math.min(0.1, pose.time - previousTime));
      if (!first && dt > 0) {
        cross.crossVectors(previousDirection, pose.direction);
        turn += (cross.length() / dt - turn) * (1 - Math.exp(-dt * 5));
        const targetBank = THREE.MathUtils.clamp(
          (-cross.y / dt) * 0.9 + (pose.pilotX || 0) * 0.24,
          -0.6,
          0.6,
        );
        bank += (targetBank - bank) * (1 - Math.exp(-dt * 4));
        cooldown = Math.max(0, cooldown - dt);
        const vertical = THREE.MathUtils.clamp(
          pose.direction.y + (pose.pilotY || 0) * 0.18,
          -1,
          1,
        );
        climb += (Math.max(0, vertical) - climb) * (1 - Math.exp(-dt * 3));
        dive += (Math.max(0, -vertical) - dive) * (1 - Math.exp(-dt * 3));
        if ((turn > 0.18 || climb > 0.18) && cooldown === 0 && burst === 0) {
          burst = 1.8;
          cooldown = 4.6;
        }
        burst = Math.max(0, burst - dt);
        phase += dt * Math.PI * 2 * (1.25 + Math.min(0.2, turn * 0.12));
      }
      right.crossVectors(pose.acrobatics ? pose.up : worldUp, pose.direction);
      if (right.lengthSq() < 0.001) right.copy(pose.side).negate();
      right.normalize();
      flightUp.crossVectors(pose.direction, right).normalize();
      basis.makeBasis(right, flightUp, pose.direction);
      orientation.setFromRotationMatrix(basis);
      group.position.copy(pose.position);
      if (first) group.quaternion.copy(orientation);
      else group.quaternion.slerp(orientation, 1 - Math.exp(-dt * 9));
      const progress = burst > 0 ? 1 - burst / 1.8 : 0;
      // Zero slope at each end: no snap between gliding and a turn's wingbeats.
      const envelope = Math.sin(progress * Math.PI) ** 2;
      const lift = Math.min(0.12, Math.max(0, pose.acoustic?.low || 0) * 0.12);
      const amplitude = envelope * (0.34 + climb * 0.16) * (1 - dive * 0.6);
      body.rotation.x =
        Math.sin(pose.time * 0.7) * 0.012 + climb * 0.045 - dive * 0.025;
      silhouette.rotation.y = bank * -0.12;
      const rollDifference = (pose.acroRoll || 0) - figureRoll;
      figureRoll +=
        Math.atan2(Math.sin(rollDifference), Math.cos(rollDifference)) *
        (1 - Math.exp(-dt * 8));
      body.rotation.z = bank + figureRoll;
      for (const { bones, side } of wings) {
        bones[0].rotation.z =
          side *
            (pose.perched
              ? 0.07
              : 0.18 + lift - dive * 0.07 + Math.sin(phase) * amplitude) +
          bank * 0.1;
        bones[0].rotation.y = side * (dive * 0.07 + Math.min(0.4, turn) * 0.06);
        bones[1].rotation.z =
          side *
          (0.045 + dive * 0.18 + Math.sin(phase - 0.48) * amplitude * 0.65);
        bones[2].rotation.z =
          side * (-0.02 + Math.sin(phase - 0.95) * amplitude * 0.5);
        bones[1].rotation.y =
          side *
          (dive * 0.3 + envelope * (0.04 + Math.sin(phase - 0.35) * 0.045));
        bones[2].rotation.x =
          Math.sin(phase - 0.8) * amplitude * 0.18 - dive * 0.07;
        bones[2].rotation.y = side * dive * 0.18;
      }
      previousDirection.copy(pose.direction);
      previousTime = pose.time;
    },
    getWingPosition(index, target) {
      // Sample the actual skinned trailing tip after banking and wing articulation.
      group.updateMatrixWorld(true);
      const mesh = wings[index === 0 ? 0 : 1].mesh;
      mesh.getVertexPosition(33, target).applyMatrix4(mesh.matrixWorld);
      return group.parent ? group.parent.worldToLocal(target) : target;
    },
    getTailPosition(target) {
      return target
        .set(0, -0.008, -0.23)
        .applyQuaternion(body.quaternion)
        .multiply(group.scale)
        .applyQuaternion(group.quaternion)
        .add(group.position);
    },
    dispose() {
      for (const { mesh, skeleton } of wings) {
        mesh.geometry.dispose();
        skeleton.dispose();
      }
      keel.dispose();
      material.dispose();
      group.removeFromParent();
    },
  };
}
