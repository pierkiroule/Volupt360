import * as THREE from "three";
import vertexShader from "./shaders/vertexShader.glsl?raw";
import fragmentShader from "./shaders/fragmentShader.glsl?raw";

export const BRUSHES = [
  {
    id: "voiles",
    name: "Voiles",
    detail: "Rubans amples · lavis diaphane",
    color: "#8babb7",
    glyph: "≈",
    style: 0,
    opacity: 0.66,
  },
  {
    id: "falaises",
    name: "Falaises",
    detail: "Strates épaisses · granulation minérale",
    color: "#bd987c",
    glyph: "▥",
    style: 3,
    opacity: 0.95,
  },
  {
    id: "corolles",
    name: "Corolles",
    detail: "Pétales plissés · nervures végétales",
    color: "#b58698",
    glyph: "✺",
    style: 8,
    opacity: 0.72,
  },
  {
    id: "filaments",
    name: "Filaments",
    detail: "Lignes fines · encre capillaire",
    color: "#587c79",
    glyph: "〰",
    style: 12,
    opacity: 0.9,
  },
  {
    id: "brumes",
    name: "Brumes",
    detail: "Nuages diffus · pigments suspendus",
    color: "#a9a9c4",
    glyph: "⋰",
    style: 1,
    opacity: 0.32,
  },
  {
    id: "lagons",
    name: "Lagons",
    detail: "Lentilles fluides · membranes irisées",
    color: "#7bada7",
    glyph: "◌",
    style: 2,
    opacity: 0.58,
  },
];

function watercolor(brush, color, seed, opacity = 1, texture = null) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uBrushMask: { value: texture?.texture || null },
      uHasMask: { value: texture ? 1 : 0 },
      uMaskAspect: { value: texture?.aspect || 1 },
      uTime: { value: 0 },
      uPigment: { value: 0.88 },
      uOpacity: { value: brush.opacity * opacity },
      uLayer: { value: 0 },
      uSeed: { value: seed },
      uStyle: { value: brush.style },
      uFade: { value: 1 },
    },
    vertexShader,
    fragmentShader,
    vertexColors: true,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

/** A brush grows along the painter's actual XYZ samples. Ribbons use dynamic
 * buffers; cloud and lens brushes leave volumetric deposits along that same
 * journey. All six keep their own cross-section, texture and audio response.
 */
export function createBrushStroke(id, { seed, color, texture = null }) {
  const brush = BRUSHES.find((item) => item.id === id) || BRUSHES[0];
  const group = new THREE.Group();
  let textureBinding = texture;
  const capacity = 52;
  let count = 0,
    finished = false;
  const ribbon = !["brumes", "lagons"].includes(id);
  const layers = id === "filaments" ? 4 : id === "corolles" ? 3 : 2;
  const columns = id === "filaments" ? 6 : 10;
  const meshes = [];
  const warm = new THREE.Color("#e6d3b2");
  if (ribbon) {
    for (let layer = 0; layer < layers; layer++) {
      const geometry = new THREE.BufferGeometry();
      for (const [name, size] of [
        ["position", 3],
        ["normal", 3],
        ["color", 3],
        ["uv", 2],
      ]) {
        geometry.setAttribute(
          name,
          new THREE.BufferAttribute(
            new Float32Array(capacity * (columns + 1) * size),
            size,
          ).setUsage(THREE.DynamicDrawUsage),
        );
      }
      const indices = [];
      for (let row = 1; row < capacity; row++)
        for (let j = 0; j < columns; j++) {
          const a = (row - 1) * (columns + 1) + j,
            b = row * (columns + 1) + j;
          indices.push(a, a + 1, b + 1, a, b + 1, b);
        }
      geometry.setIndex(indices);
      geometry.setDrawRange(0, 0);
      const material = watercolor(
        brush,
        color,
        seed + layer * 0.71,
        layer && id === "voiles" ? 0.35 : 1,
        textureBinding,
      );
      const mesh = new THREE.Mesh(geometry, material);
      mesh.frustumCulled = false;
      group.add(mesh);
      meshes.push(mesh);
    }
  }
  function append(sample) {
    if (finished || count >= capacity) return;
    if (!ribbon) {
      // Volumes are spaced by movement samples, with changing scale and depth.
      // They follow the path rather than occupying repeated radial positions.
      if (count % 3 === 0) {
        for (let layer = 0; layer < (id === "brumes" ? 3 : 2); layer++) {
          const isMist = id === "brumes";
          const geometry = isMist
            ? new THREE.PlaneGeometry(1, 1)
            : new THREE.SphereGeometry(1, 14, 10);
          const vertices = geometry.attributes.position.count;
          const colors = new Float32Array(vertices * 3);
          for (let i = 0; i < vertices; i++) color.toArray(colors, i * 3);
          geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
          const material = watercolor(
            brush,
            color,
            seed + count * 0.17 + layer,
            0.6 + sample.energy * 0.7,
            textureBinding,
          );
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position
            .copy(sample.position)
            .addScaledVector(
              sample.side,
              Math.sin(count * 1.7 + layer) * (isMist ? 1.7 : 0.8),
            )
            .addScaledVector(sample.up, Math.cos(count * 0.91 + layer) * 0.9);
          mesh.quaternion.setFromRotationMatrix(
            new THREE.Matrix4().makeBasis(
              sample.side,
              sample.up,
              sample.direction.clone().negate(),
            ),
          );
          const scale =
            0.6 +
            sample.energy * 1.4 +
            Math.sin(seed + count * 0.67 + layer) ** 2;
          mesh.scale.set(
            isMist ? scale * 2.7 : scale * 1.35,
            isMist ? scale * 1.7 : scale * 0.28,
            isMist ? 1 : scale * 0.85,
          );
          group.add(mesh);
        }
      }
    } else {
      meshes.forEach((mesh, layer) => {
        const g = mesh.geometry;
        const p = g.attributes.position.array,
          n = g.attributes.normal.array,
          c = g.attributes.color.array,
          uv = g.attributes.uv.array;
        const opening = Math.min(1, (count + 1) / 5);
        const pulse = 0.6 + 0.4 * Math.sin(sample.time * 1.7 + seed) ** 2;
        let width =
          (0.45 + sample.energy * 1.35 + sample.low * 0.9) * opening * pulse;
        if (id === "falaises") width *= 2.1;
        if (id === "corolles")
          width *=
            0.25 +
            Math.pow(
              Math.max(0, Math.sin(sample.time * 2.1 + layer * 1.9 + seed)),
              0.8,
            ) *
              2.8;
        const tint = color
          .clone()
          .lerp(warm, 0.08 + 0.15 * Math.sin(sample.time + layer) ** 2);
        for (let j = 0; j <= columns; j++) {
          const u = j / columns,
            across = u * 2 - 1;
          let lateral = across * width,
            vertical = 0;
          if (id === "filaments") {
            const angle = u * Math.PI * 2;
            const radius = 0.024 + sample.energy * 0.048 + sample.low * 0.015;
            lateral =
              (layer - 1.5) * 0.23 +
              Math.sin(sample.time * 1.6 + layer + seed) * 0.42 +
              Math.cos(angle) * radius;
            vertical =
              Math.sin(sample.time * 2 + layer * 1.3) * 0.3 +
              Math.sin(angle) * radius;
          } else if (id === "falaises") {
            vertical =
              across * width * 0.9 +
              Math.sin(u * 22 + sample.time * 3 + seed) * width * 0.22;
            lateral =
              across * width * 0.32 +
              Math.sin(sample.time * 2.3 + layer) * 0.35;
          } else if (id === "corolles") {
            const roll = layer * 2.1 + sample.time * 0.13;
            lateral = across * width * Math.cos(roll);
            vertical =
              across * width * Math.sin(roll) +
              Math.sin(u * Math.PI) * width * 0.6;
          } else {
            vertical =
              Math.sin(u * 7 + sample.time * 2.3 + seed) * width * 0.3 +
              across ** 2 * Math.sin(sample.time * 0.8) * width * 0.45;
            lateral *= 1 + 0.08 * Math.sin(sample.time * 11 + u * 17);
          }
          vertical += layer * 0.09;
          const point = sample.position
            .clone()
            .addScaledVector(sample.side, lateral)
            .addScaledVector(sample.up, vertical);
          const k = (count * (columns + 1) + j) * 3,
            t = (count * (columns + 1) + j) * 2;
          point.toArray(p, k);
          sample.up.toArray(n, k);
          tint.toArray(c, k);
          uv[t] = u;
          uv[t + 1] = count / (capacity - 1);
        }
        g.setDrawRange(0, count * columns * 6);
        for (const attr of Object.values(g.attributes)) attr.needsUpdate = true;
        mesh.material.uniforms.uOpacity.value =
          brush.opacity *
          (0.65 + sample.energy * 0.6) *
          (layer && id === "voiles" ? 0.35 : 1);
      });
    }
    count++;
  }
  function finish() {
    if (finished) return;
    finished = true;
    meshes.forEach((mesh) => {
      // Trim unused capacity so finished strokes get accurate bounds/culling.
      const old = mesh.geometry,
        geometry = new THREE.BufferGeometry();
      for (const [name, attr] of Object.entries(old.attributes))
        geometry.setAttribute(
          name,
          new THREE.BufferAttribute(
            attr.array.slice(0, count * (columns + 1) * attr.itemSize),
            attr.itemSize,
          ),
        );
      geometry.setIndex(
        Array.from(
          old.index.array.slice(0, Math.max(0, count - 1) * columns * 6),
        ),
      );
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      mesh.geometry = geometry;
      mesh.frustumCulled = true;
      old.dispose();
    });
  }
  function setTexture(next) {
    textureBinding = next;
    group.traverse((object) => {
      const uniforms = object.material?.uniforms;
      if (!uniforms) return;
      uniforms.uBrushMask.value = next?.texture || null;
      uniforms.uHasMask.value = next ? 1 : 0;
      uniforms.uMaskAspect.value = next?.aspect || 1;
    });
  }
  return {
    group,
    setTexture,
    append,
    finish,
    get full() {
      return count >= capacity;
    },
    get count() {
      return count;
    },
  };
}

export function disposeMark(mark) {
  mark.traverse((object) => {
    object.geometry?.dispose();
    object.material?.dispose();
  });
  mark.removeFromParent();
}
