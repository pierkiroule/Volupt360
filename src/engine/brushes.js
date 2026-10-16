import { createPoeticParticleStroke } from "./createPoeticParticleStroke.js";
import * as THREE from "three";
import { createNetworkStroke } from "./createNetworkStroke.js";
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
    name: "Encres",
    detail: "Taches noires · diffusion organique",
    color: "#29232b",
    glyph: "⋰",
    style: 14,
    opacity: 0.92,
  },
  {
    id: "lagons",
    name: "Éclats",
    detail: "Éclaboussures noires · satellites dispersés",
    color: "#211f25",
    glyph: "◌",
    style: 15,
    opacity: 0.88,
  },
  {
    id: "bulles",
    name: "Bulles",
    detail: "Sphères translucides · reflets arc-en-ciel",
    color: "#3cbbc3",
    glyph: "◉",
    style: 16,
    opacity: 0.82,
  },
  {
    id: "aurore",
    name: "Aurore",
    detail: "Voiles torsadés · irisations boréales",
    color: "#769ad3",
    glyph: "✧",
    style: 17,
    opacity: 0.72,
  },
  {
    id: "calligraphie",
    name: "Calligraphie",
    detail: "Pleins et déliés · arabesques hypnotiques",
    color: "#5a477c",
    glyph: "❦",
    style: 18,
    opacity: 0.95,
  },
  {
    id: "network",
    name: "Network",
    detail: "Nœuds cristallins · réseau tissé en 3D",
    color: "#398b87",
    glyph: "⋈",
    style: 19,
    opacity: 0.95,
  },
  {
    id: "dilution",
    name: "Dilution",
    detail: "Lavis étendus · auréoles de pigment diffus",
    color: "#568bae",
    glyph: "◍",
    style: 20,
    opacity: 0.78,
  },
  {
    id: "echo",
    name: "Echo",
    detail: "Trois rémanences · rubans décalés dans le temps",
    color: "#9963a8",
    glyph: "≋",
    style: 21,
    opacity: 0.88,
  },
  {
    id: "plumes",
    name: "Plumes",
    detail: "Plumage fin · envols lents",
    color: "#235e8f",
    glyph: "❧",
    particle: 0,
    style: 0,
    opacity: 0.92,
  },
  {
    id: "lucioles",
    name: "Lucioles",
    detail: "Étincelles d’or · respirations lumineuses",
    color: "#b0750f",
    glyph: "✧",
    particle: 2,
    style: 0,
    opacity: 0.92,
  },
  {
    id: "feuilles",
    name: "Feuilles",
    detail: "Nervures vives · feuilles virevoltantes",
    color: "#287d54",
    glyph: "❦",
    particle: 1,
    style: 0,
    opacity: 0.92,
  },
  {
    id: "filamentslibres",
    name: "Filaments libres",
    detail: "Chevelures abstraites · courants entrelacés",
    color: "#704bc6",
    glyph: "≋",
    particle: 4,
    style: 0,
    opacity: 0.92,
  },
  {
    id: "racines",
    name: "Racines",
    detail: "Radicelles d’encre · ramifications vivantes",
    color: "#5a3c29",
    glyph: "⋔",
    particle: 3,
    style: 0,
    opacity: 0.92,
  },
  {
    id: "hachures",
    name: "Hachures",
    detail: "Hachures dansantes · essaims de signes",
    color: "#b63860",
    glyph: "⫶",
    particle: 5,
    style: 0,
    opacity: 0.92,
  },
];

function watercolor(brush, color, seed, opacity = 1, texture = null) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uBrushMask: { value: texture?.texture || null },
      uHasMask: { value: texture ? 1 : 0 },
      uPhotograph: { value: texture?.photograph ? 1 : 0 },
      uMaskAspect: { value: texture?.aspect || 1 },
      uMaskRepeat: { value: texture?.repeat ?? 4 },
      uSurprise: { value: 0 },
      uTime: { value: 0 },
      uAge: { value: 0 },
      uPigment: { value: 1.12 },
      uAudioEnergy: { value: 0 },
      uAudioLow: { value: 0 },
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
 * journey. All twelve keep their own cross-section, texture and audio response.
 */
export function createBrushStroke(
  id,
  { seed, color, texture = null, surprise = 0, dynamics = null },
) {
  const template = BRUSHES.find((item) => item.id === id) || BRUSHES[0];
  const brush = dynamics
    ? { ...template, opacity: dynamics.opacity, generatedWidth: dynamics.width }
    : template;
  if (brush.particle !== undefined)
    return createPoeticParticleStroke(brush, { seed, color, texture });
  const group = new THREE.Group();
  let textureBinding = texture;
  const capacity = 52;
  let count = 0,
    finished = false;
  const ribbon = !["brumes", "lagons", "bulles", "network"].includes(id);
  const layers =
    id === "filaments"
      ? 4
      : ["corolles", "aurore", "echo"].includes(id)
        ? 3
        : id === "calligraphie"
          ? 1
          : 2;
  const columns = id === "filaments" ? 6 : 10;
  const meshes = [];
  const warm = new THREE.Color("#e6d3b2");
  const echoHistory = [];
  const network =
    id === "network"
      ? createNetworkStroke({
          material: watercolor(brush, color, seed, 1, textureBinding),
          color,
          seed,
          capacity,
        })
      : null;
  if (network) group.add(network.mesh);
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
      material.uniforms.uSurprise.value = surprise;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.frustumCulled = false;
      group.add(mesh);
      meshes.push(mesh);
    }
  }
  function append(sample) {
    if (finished || count >= capacity) return;
    if (network) {
      network.append(sample, count);
    } else if (!ribbon) {
      // Volumes are spaced by movement samples, with changing scale and depth.
      // They follow the path rather than occupying repeated radial positions.
      const accented =
        id !== "lagons" ||
        (sample.accent ?? sample.motion) > 0.12 ||
        count === 0;
      if (id === "bulles") {
        if (count % 6 === 0)
          for (let layer = 0; layer < 2; layer++) {
            const geometry = new THREE.SphereGeometry(1, 12, 8);
            const colors = new Float32Array(
              geometry.attributes.position.count * 3,
            );
            for (let i = 0; i < geometry.attributes.position.count; i++)
              color.toArray(colors, i * 3);
            geometry.setAttribute(
              "color",
              new THREE.BufferAttribute(colors, 3),
            );
            const material = watercolor(
              brush,
              color,
              seed + count * 0.13 + layer,
              sample.density ?? 1,
              textureBinding,
            );
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position
              .copy(sample.position)
              .addScaledVector(
                sample.side,
                Math.sin(count * 0.7 + seed + layer * 2) * 2.2,
              )
              .addScaledVector(sample.up, Math.cos(count * 0.6 + layer) * 1.7);
            mesh.scale.setScalar(
              0.35 +
                sample.energy * 0.6 +
                Math.sin(seed + count * 0.5 + layer) ** 2 * 0.7,
            );
            group.add(mesh);
          }
      } else if (count % 3 === 0 && accented) {
        for (let layer = 0; layer < (id === "brumes" ? 2 : 6); layer++) {
          const isMist = id === "brumes";
          const geometry = new THREE.PlaneGeometry(1, 1, 6, 6);
          const vertices = geometry.attributes.position.count;
          const colors = new Float32Array(vertices * 3);
          for (let i = 0; i < vertices; i++) color.toArray(colors, i * 3);
          geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
          const material = watercolor(
            brush,
            color,
            seed + count * 0.17 + layer,
            (0.6 + sample.energy * 0.7) * (sample.density ?? 1),
            textureBinding,
          );
          material.uniforms.uSurprise.value = surprise;
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position
            .copy(sample.position)
            .addScaledVector(
              sample.side,
              Math.sin(count * 1.7 + layer) * (isMist ? 1.7 : 3.5),
            )
            .addScaledVector(
              sample.up,
              Math.cos(count * 0.91 + layer) * (isMist ? 0.9 : 2.6),
            );
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
            isMist
              ? scale * 1.6
              : scale *
                  (layer === 0
                    ? 0.7
                    : 0.12 + 0.18 * Math.sin(seed + count + layer) ** 2),
            isMist
              ? scale * 1.2
              : scale *
                  (layer === 0
                    ? 0.65
                    : 0.1 + 0.2 * Math.cos(count + layer) ** 2),
            isMist ? 1 : scale * 0.85,
          );
          group.add(mesh);
        }
      }
    } else {
      if (id === "echo")
        echoHistory.push({
          ...sample,
          position: sample.position.clone(),
          side: sample.side.clone(),
          up: sample.up.clone(),
        });
      meshes.forEach((mesh, layer) => {
        const pose =
          id === "echo" ? echoHistory[Math.max(0, count - layer * 4)] : sample;
        const g = mesh.geometry;
        const p = g.attributes.position.array,
          n = g.attributes.normal.array,
          c = g.attributes.color.array,
          uv = g.attributes.uv.array;
        const opening = Math.min(1, (count + 1) / 5);
        const pulse = 0.6 + 0.4 * Math.sin(pose.time * 1.7 + seed) ** 2;
        let width =
          (0.45 + pose.energy * 1.35 + pose.low * 0.9) *
          opening *
          pulse *
          (dynamics?.width || 1);
        if (id === "falaises") width *= 2.1;
        if (id === "corolles")
          width *=
            0.25 +
            Math.pow(
              Math.max(0, Math.sin(pose.time * 2.1 + layer * 1.9 + seed)),
              0.8,
            ) *
              2.8;
        const tint = color
          .clone()
          .lerp(warm, 0.08 + 0.15 * Math.sin(pose.time + layer) ** 2);
        for (let j = 0; j <= columns; j++) {
          const u = j / columns,
            across = u * 2 - 1;
          let lateral = across * width,
            vertical = 0;
          if (id === "dilution") {
            lateral = across * width * (2.2 + 0.4 * Math.sin(pose.time + seed));
            vertical =
              Math.sin(u * 5 + pose.time * 0.5 + layer) * width * 0.65 +
              layer * 0.5;
          } else if (id === "echo") {
            const roll = pose.time * 0.3 + layer * 0.7;
            lateral = across * width * 0.55 * Math.cos(roll) + layer * 0.8;
            vertical =
              across * width * 0.55 * Math.sin(roll) +
              Math.sin(pose.time + layer) * 0.45 +
              layer * 0.5;
          } else if (id === "aurore") {
            const roll = pose.time * 0.45 + layer * 2.1;
            const curl = Math.sin(pose.time * 0.7 + seed + u * 4) * 0.9;
            lateral = across * width * 1.8 * Math.cos(roll) + curl;
            vertical =
              across * width * 1.8 * Math.sin(roll) +
              Math.sin(u * 9 + pose.time) * width * 0.5;
          } else if (id === "calligraphie") {
            const pressure =
              0.055 +
              Math.pow(0.5 + 0.5 * Math.sin(pose.time * 2.2 + seed), 3) * 1.4;
            const roll = pose.time * 0.8 + Math.sin(pose.time * 0.65) * 1.1;
            lateral =
              across * width * pressure * Math.cos(roll) +
              Math.sin(pose.time * 1.4) * 0.9;
            vertical =
              across * width * pressure * Math.sin(roll) +
              Math.cos(pose.time * 1.1) * 0.7;
          } else if (id === "filaments") {
            const angle = u * Math.PI * 2;
            const radius = 0.024 + pose.energy * 0.048 + pose.low * 0.015;
            lateral =
              (layer - 1.5) * 0.23 +
              Math.sin(pose.time * 1.6 + layer + seed) * 0.42 +
              Math.cos(angle) * radius;
            vertical =
              Math.sin(pose.time * 2 + layer * 1.3) * 0.3 +
              Math.sin(angle) * radius;
          } else if (id === "falaises") {
            vertical =
              across * width * 0.9 +
              Math.sin(u * 22 + pose.time * 3 + seed) * width * 0.22;
            lateral =
              across * width * 0.32 + Math.sin(pose.time * 2.3 + layer) * 0.35;
          } else if (id === "corolles") {
            const roll = layer * 2.1 + pose.time * 0.13;
            lateral = across * width * Math.cos(roll);
            vertical =
              across * width * Math.sin(roll) +
              Math.sin(u * Math.PI) * width * 0.6;
          } else {
            vertical =
              Math.sin(u * 7 + pose.time * 2.3 + seed) * width * 0.3 +
              across ** 2 * Math.sin(pose.time * 0.8) * width * 0.45;
            lateral *= 1 + 0.08 * Math.sin(pose.time * 11 + u * 17);
          }
          vertical += layer * 0.09;
          const point = pose.position
            .clone()
            .addScaledVector(pose.side, lateral)
            .addScaledVector(pose.up, vertical);
          const k = (count * (columns + 1) + j) * 3,
            t = (count * (columns + 1) + j) * 2;
          point.toArray(p, k);
          pose.up.toArray(n, k);
          tint.toArray(c, k);
          uv[t] = u;
          uv[t + 1] = count / (capacity - 1);
        }
        g.setDrawRange(0, count * columns * 6);
        for (const attr of Object.values(g.attributes)) attr.needsUpdate = true;
        mesh.material.uniforms.uOpacity.value =
          brush.opacity *
          (pose.density ?? 1) *
          (0.65 + pose.energy * 0.6) *
          (layer && id === "voiles"
            ? 0.35
            : id === "echo"
              ? 1 / (1 + layer * 0.55)
              : 1);
      });
    }
    count++;
  }
  function finish() {
    if (finished) return;
    finished = true;
    network?.finish();
    echoHistory.length = 0;
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
      uniforms.uPhotograph.value = next?.photograph ? 1 : 0;
      uniforms.uMaskAspect.value = next?.aspect || 1;
      uniforms.uMaskRepeat.value = next?.repeat ?? 4;
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
