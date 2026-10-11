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

function watercolor(brush, color, seed, opacity = 1) {
  return new THREE.ShaderMaterial({
    uniforms: {
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

// A two-dimensional strip whose cross-section is entirely different per brush.
// The empty inner radius always remains open for the central observer.
function strip(
  brush,
  { angle, radius, height, energy, seed, color },
  layer = 0,
) {
  const positions = [],
    colors = [],
    uvs = [],
    indices = [];
  const rows = 44,
    columns = 10;
  const span =
    brush.id === "falaises" ? 0.48 : brush.id === "corolles" ? 0.22 : 0.65;
  const thickness =
    brush.id === "falaises" ? 3.4 : brush.id === "corolles" ? 2.1 : 1.25;
  for (let i = 0; i <= rows; i++) {
    const v = i / rows;
    const a = angle + (v - 0.5) * span;
    const taper = Math.pow(
      Math.sin(Math.PI * v),
      brush.id === "falaises" ? 0.18 : 0.65,
    );
    for (let j = 0; j <= columns; j++) {
      const u = j / columns,
        w = u * 2 - 1;
      let r = radius + layer * 0.25,
        y = height;
      if (brush.id === "falaises") {
        r += 0.75 * Math.sin(v * 15 + seed) + w * 0.4;
        y +=
          w * thickness * (1 + energy) * taper + 0.4 * Math.sin(v * 21 + seed);
      } else if (brush.id === "corolles") {
        const petal = Math.sin(Math.PI * u);
        r += petal * thickness * taper;
        y += w * 2.8 * taper + 0.45 * Math.sin(u * 24 + v * 9 + seed) * petal;
      } else {
        r += w * thickness * (1 + energy) * taper;
        y +=
          Math.sin(v * Math.PI * 2 + seed) * 1.4 +
          Math.sin(u * 9 + v * 10) * 0.4 * taper;
      }
      positions.push(Math.sin(a) * r, y, Math.cos(a) * r);
      const tint = color
        .clone()
        .lerp(
          new THREE.Color("#eee3cd"),
          0.12 + 0.18 * Math.sin(v * 11 + u * 3) ** 2,
        );
      colors.push(tint.r, tint.g, tint.b);
      uvs.push(u, v);
      if (i && j < columns) {
        const p = (i - 1) * (columns + 1) + j,
          q = i * (columns + 1) + j;
        indices.push(p, p + 1, q + 1, p, q + 1, q);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(
    geometry,
    watercolor(brush, color, seed + layer, layer ? 0.4 : 1),
  );
}

export function createBrushMark(id, options) {
  const brush = BRUSHES.find((item) => item.id === id) || BRUSHES[0];
  const group = new THREE.Group();
  const { angle, radius, height, energy, seed, color } = options;
  if (id === "filaments") {
    for (let strand = 0; strand < 5; strand++) {
      const points = Array.from({ length: 32 }, (_, i) => {
        const v = i / 31,
          a = angle + (v - 0.5) * 0.5;
        const r = radius + Math.sin(v * 12 + seed + strand) * 0.5;
        return new THREE.Vector3(
          Math.sin(a) * r,
          height + Math.sin(v * 8 + seed) * 1.8 + strand * 0.19,
          Math.cos(a) * r,
        );
      });
      const geometry = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        48,
        0.018 + energy * 0.055 + strand * 0.004,
        4,
        false,
      );
      const count = geometry.attributes.position.count;
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(
          Array.from({ length: count }, () => [
            color.r,
            color.g,
            color.b,
          ]).flat(),
          3,
        ),
      );
      group.add(
        new THREE.Mesh(
          geometry,
          watercolor(brush, color, seed + strand, 0.55 + strand * 0.1),
        ),
      );
    }
  } else if (id === "brumes") {
    // Overlapping, feathered pigment discs, not a ribbon or solid cloud.
    for (let i = 0; i < 13; i++) {
      const a = angle + Math.sin(seed + i * 2.4) * 0.2;
      const geometry = new THREE.PlaneGeometry(
        2.3 + energy * 2 + (i % 3) * 0.5,
        2.7,
        1,
        1,
      );
      const count = geometry.attributes.position.count;
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(
          Array.from({ length: count }, () => [
            color.r,
            color.g,
            color.b,
          ]).flat(),
          3,
        ),
      );
      const mesh = new THREE.Mesh(
        geometry,
        watercolor(brush, color, seed + i, 0.65),
      );
      mesh.position.set(
        Math.sin(a) * radius,
        height + Math.cos(i * 1.7) * 1.6,
        Math.cos(a) * radius,
      );
      mesh.lookAt(0, height, 0);
      group.add(mesh);
    }
  } else if (id === "lagons") {
    for (let i = 0; i < 5; i++) {
      const geometry = new THREE.SphereGeometry(
        0.65 + energy + (i % 3) * 0.22,
        20,
        14,
      );
      const count = geometry.attributes.position.count;
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(
          Array.from({ length: count }, () => [
            color.r,
            color.g,
            color.b,
          ]).flat(),
          3,
        ),
      );
      const mesh = new THREE.Mesh(
        geometry,
        watercolor(brush, color, seed + i, 0.8),
      );
      const a = angle + (i - 2) * 0.055;
      mesh.position.set(
        Math.sin(a) * radius,
        height + Math.sin(seed + i) * 1.1,
        Math.cos(a) * radius,
      );
      mesh.scale.set(1.5, 0.32 + energy * 0.4, 1);
      group.add(mesh);
    }
  } else {
    group.add(strip(brush, options));
    if (id === "voiles") group.add(strip(brush, options, 1));
    if (id === "falaises")
      group.add(
        strip(
          brush,
          {
            ...options,
            height: height - 0.8,
            radius: radius + 0.6,
            energy: energy * 0.6,
          },
          1,
        ),
      );
    if (id === "corolles") {
      for (let i = 1; i < 4; i++)
        group.add(
          strip(brush, {
            ...options,
            angle: angle + i * 0.085,
            height: height + Math.sin(i * 2) * 0.6,
            seed: seed + i,
          }),
        );
    }
  }
  return group;
}

export function disposeMark(mark) {
  mark.traverse((object) => {
    object.geometry?.dispose();
    object.material?.dispose();
  });
  mark.removeFromParent();
}

/** Pale nested landforms establish a continuous horizon and an empty clearing.
 * Unlike musical marks they do not animate, respond to pointer pressure or fill
 * the observer's central space. They provide the paper landscape's foundation.
 */
export function createLandscapeGround() {
  const ground = new THREE.Group();
  const tones = ["#a3b7a5", "#a5bec0", "#c4b39b"];
  for (let layer = 0; layer < 3; layer++) {
    const positions = [],
      colors = [],
      uvs = [],
      indices = [];
    const segments = 180,
      rows = 12;
    const base = new THREE.Color(tones[layer]);
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const ridge =
        0.65 * Math.sin(angle * 3 + layer) +
        0.38 * Math.cos(angle * 7 - layer * 2) +
        0.2 * Math.sin(angle * 13);
      for (let j = 0; j <= rows; j++) {
        const u = j / rows;
        const radius = 8 + layer * 6.5 + u * 8 + ridge;
        const height =
          -4.3 +
          Math.sin(Math.PI * u) * (1.3 + layer * 0.8 + ridge * 1.9) -
          layer * 0.15;
        positions.push(
          Math.sin(angle) * radius,
          height,
          Math.cos(angle) * radius,
        );
        const color = base
          .clone()
          .lerp(new THREE.Color("#e4d7ba"), 0.25 + 0.2 * ridge);
        colors.push(color.r, color.g, color.b);
        uvs.push(u, (i / segments) * 8);
        if (i && j < rows) {
          const a = (i - 1) * (rows + 1) + j,
            b = i * (rows + 1) + j;
          indices.push(a, a + 1, b + 1, a, b + 1, b);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    ground.add(
      new THREE.Mesh(geometry, watercolor(BRUSHES[0], base, layer * 6.2, 0.55)),
    );
  }
  return ground;
}
