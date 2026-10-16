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
  const wings = [-1, 1].map((side) => {
    const positions = [],
      indices = [],
      weights = [],
      joints = [],
      triangles = [];
    const spans = [0, 0.2, 0.37];
    for (let i = 0; i <= 16; i++) {
      const x = (i / 16) * 0.52;
      const center = 0.1 - x * 0.58;
      const width = 0.014 + 0.09 * Math.pow(Math.sin((i / 16) * Math.PI), 0.7);
      const joint = x < spans[1] ? 0 : 1;
      const blend = THREE.MathUtils.smoothstep(
        x,
        spans[joint],
        spans[joint + 1],
      );
      for (let edge = 0; edge < 2; edge++) {
        positions.push(side * x, 0, center + (edge ? -1 : 1) * width * 0.5);
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
  const right = new THREE.Vector3();
  let previousTime,
    turn = 0,
    bank = 0,
    burst = 0,
    cooldown = 0,
    phase = 0;
  return {
    group,
    update(pose) {
      const first = previousTime === undefined;
      const dt = first
        ? 0
        : Math.max(0, Math.min(0.1, pose.time - previousTime));
      if (!first && dt > 0) {
        cross.crossVectors(previousDirection, pose.direction);
        turn += (cross.length() / dt - turn) * (1 - Math.exp(-dt * 5));
        const targetBank = THREE.MathUtils.clamp(
          (-cross.dot(pose.up) / dt) * 0.65,
          -0.4,
          0.4,
        );
        bank += (targetBank - bank) * (1 - Math.exp(-dt * 4));
        cooldown = Math.max(0, cooldown - dt);
        if (turn > 0.18 && cooldown === 0 && burst === 0) {
          burst = 1.8;
          cooldown = 4.6;
        }
        burst = Math.max(0, burst - dt);
        phase += dt * Math.PI * 2 * (1.25 + Math.min(0.2, turn * 0.12));
      }
      right.copy(pose.side).negate();
      basis.makeBasis(right, pose.up, pose.direction);
      orientation.setFromRotationMatrix(basis);
      group.position.copy(pose.position);
      group.quaternion.copy(orientation);
      const progress = burst > 0 ? 1 - burst / 1.8 : 0;
      // Zero slope at each end: no snap between gliding and a turn's wingbeats.
      const envelope = Math.sin(progress * Math.PI) ** 2;
      const amplitude = envelope * 0.34;
      body.rotation.z = bank;
      for (const { bones, side } of wings) {
        bones[0].rotation.z = side * (0.13 + Math.sin(phase) * amplitude);
        bones[1].rotation.z =
          side * (0.045 + Math.sin(phase - 0.48) * amplitude * 0.65);
        bones[2].rotation.z =
          side * (-0.02 + Math.sin(phase - 0.95) * amplitude * 0.5);
        bones[1].rotation.y =
          side * envelope * (0.04 + Math.sin(phase - 0.35) * 0.045);
        bones[2].rotation.x = Math.sin(phase - 0.8) * amplitude * 0.18;
      }
      previousDirection.copy(pose.direction);
      previousTime = pose.time;
    },
    dispose() {
      for (const { mesh, skeleton } of wings) {
        mesh.geometry.dispose();
        skeleton.dispose();
      }
      material.dispose();
      group.removeFromParent();
    },
  };
}
