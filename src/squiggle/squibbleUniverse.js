import * as THREE from "three";
// Artistic ingredients only: no interpretation or scoring of the participant.
export const EMOJI_INGREDIENTS = [
  { emoji: "🔥", name: "Feu", id: "anger", color: "#ff956b", flow: 1.1 },
  { emoji: "🌊", name: "Vague", id: "peace", color: "#66cbd0", flow: 0.65 },
  {
    emoji: "☁️",
    name: "Nuage",
    id: "uncertainty",
    color: "#b6ccdc",
    flow: 0.35,
  },
  { emoji: "✨", name: "Étincelle", id: "wonder", color: "#f0dcb1", flow: 0.8 },
  { emoji: "🌧️", name: "Pluie", id: "sadness", color: "#80b8f0", flow: 0.55 },
  { emoji: "🌀", name: "Spirale", id: "worry", color: "#b9a0e5", flow: 0.9 },
  {
    emoji: "🌸",
    name: "Fleur",
    id: "frustration",
    color: "#e895bd",
    flow: 0.45,
  },
  { emoji: "☀️", name: "Soleil", id: "joy", color: "#f3cc7e", flow: 0.65 },
  { emoji: "🌙", name: "Lune", id: "sadness", color: "#a6b4ef", flow: 0.3 },
  { emoji: "🍃", name: "Souffle", id: "peace", color: "#a1d4b4", flow: 0.7 },
  {
    emoji: "❄️",
    name: "Cristal",
    id: "uncertainty",
    color: "#c1e5f1",
    flow: 0.4,
  },
  { emoji: "🫧", name: "Bulle", id: "wonder", color: "#d0b6eb", flow: 0.5 },
];
export function generateUniverse(choices) {
  const sorted = [...choices].sort((a, b) => a.emoji.localeCompare(b.emoji));
  let seed = 2166136261;
  for (const c of sorted.map((s) => s.emoji).join(""))
    seed = Math.imul(seed ^ c.codePointAt(0), 16777619) >>> 0;
  let state = seed;
  const random = () =>
    (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
  if (!sorted.length) return [];
  return Array.from({ length: 36 }, (_, i) => {
    const primary = sorted[i % sorted.length],
      secondary = sorted[(i + 1) % sorted.length];
    const color = new THREE.Color(primary.color).lerp(
      new THREE.Color(secondary.color),
      0.15 + random() * 0.3,
    );
    return {
      id: i + 1,
      emotionId: primary.id,
      color: "#" + color.getHexString(),
      size: 18 + random() * 24,
      opacity: 0.6 + random() * 0.35,
      radius: 3.1 + random() * 4.4,
      flow: primary.flow * 0.7 + secondary.flow * 0.3,
      points: [
        {
          x: (i * 0.61803398875 + random() * 0.14) % 1,
          y: 0.13 + random() * 0.74,
        },
      ],
    };
  });
}
export function createResonanceDust(items, mobile) {
  const count = items.length ? (mobile ? 1400 : 2400) : 120;
  const positions = new Float32Array(count * 3),
    colors = new Float32Array(count * 3),
    seeds = new Float32Array(count);
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const a = i * 2.39996323,
      y = 1 - 2 * ((i + 0.5) / count),
      r = 2.2 + (((i * 7919) % 1000) / 1000) * 6.1;
    const side = Math.sqrt(1 - y * y);
    const ink = items.length ? items[i % items.length].worldPoints : null;
    const anchor = ink?.[i % ink.length];
    positions.set(
      anchor
        ? [
            anchor.x + Math.cos(a) * side * 0.85,
            anchor.y + y * 0.85,
            anchor.z + Math.sin(a) * side * 0.85,
          ]
        : [Math.cos(a) * side * r, y * r, Math.sin(a) * side * r],
      i * 3,
    );
    color.set(items[i % Math.max(1, items.length)]?.color || "#8a98b9");
    colors.set([color.r, color.g, color.b], i * 3);
    seeds[i] = (i * 0.618) % 1;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("seed", new THREE.BufferAttribute(seeds, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      resonance: { value: 0 },
      bands: { value: new THREE.Vector3() },
      ratio: { value: Math.min(devicePixelRatio || 1, 1.4) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    vertexColors: true,
    vertexShader: `attribute float seed;uniform float time,ratio,resonance;uniform vec3 bands;varying vec3 C;varying float A;
      void main(){vec3 p=position+vec3(sin(time*.12+seed*31.),cos(time*.15+seed*17.),sin(time*.09+seed*43.))*(.22+resonance*.32);
      float response=seed<.33?bands.x:(seed<.66?bands.y:bands.z);
      p+=normalize(cross(position,vec3(.2,1.,.3)))*response*sin(seed*37.+time*.6)*.35;
      vec4 v=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*v;
      gl_PointSize=clamp((18.+seed*16.)*(1.+response*.7)*ratio/max(1.,-v.z),1.,8.);
      C=color*.56;A=(.18+.28*(.5+.5*sin(time*.23+seed*19.)))*(1.+response*.55);}`,
    fragmentShader: `varying vec3 C;varying float A;void main(){float r=length(gl_PointCoord-.5);
      float a=(1.-smoothstep(.05,.5,r))*A;gl_FragColor=vec4(C,a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  // Fine curved pigment threads: one extra draw call, all buffers built once.
  const strands = items.length ? (mobile ? 72 : 108) : 0,
    segments = 8;
  const threads = new Float32Array(strands * segments * 2 * 3),
    threadColors = new Float32Array(threads.length);
  let cursor = 0;
  for (let i = 0; i < strands; i++) {
    const item = items[i % items.length],
      p = item.points[0],
      a = p.x * Math.PI * 2,
      t = (0.04 + p.y * 0.92) * Math.PI,
      r = item.radius || 7.1;
    const ink = item.worldPoints?.[i % item.worldPoints.length];
    const cx = -Math.cos(a) * Math.sin(t) * r,
      cy = Math.cos(t) * r,
      cz = Math.sin(a) * Math.sin(t) * r;
    color.set(item.color);
    for (let j = 0; j < segments; j++)
      for (let end = 0; end < 2; end++) {
        const u = (j + end) / segments,
          angle = u * 2.5 + i * 2.399;
        threads.set(
          [
            (ink?.x ?? cx) + Math.cos(angle) * (0.3 + u * 0.4),
            (ink?.y ?? cy) + (u - 0.5) * 1.1 + Math.sin(angle) * 0.2,
            (ink?.z ?? cz) + Math.sin(angle) * 0.35,
          ],
          cursor,
        );
        threadColors.set([color.r, color.g, color.b], cursor);
        cursor += 3;
      }
  }
  const threadGeometry = new THREE.BufferGeometry();
  threadGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(threads, 3),
  );
  threadGeometry.setAttribute(
    "color",
    new THREE.BufferAttribute(threadColors, 3),
  );
  const threadMaterial = new THREE.ShaderMaterial({
    uniforms: material.uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    vertexColors: true,
    vertexShader: `uniform float time;uniform vec3 bands;varying vec3 C;varying float A;
    void main(){float lane=.5+.5*sin(position.x*.8+position.z*.7);float response=mix(bands.x,bands.y,lane);
    vec3 p=position+vec3(sin(position.y+time*.3),cos(position.z+time*.23),sin(position.x-time*.27))*(.035+response*.16);
    C=color*.5;A=.12+response*.16+bands.z*.04;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `varying vec3 C;varying float A;void main(){gl_FragColor=vec4(C,A);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const filaments = new THREE.LineSegments(threadGeometry, threadMaterial);
  filaments.frustumCulled = false;
  points.add(filaments);

  return {
    points,
    update(t, sound = 0) {
      const resonance = typeof sound === "number" ? sound : sound.energy;
      material.uniforms.bands.value.set(
        typeof sound === "number" ? sound : sound.bass,
        typeof sound === "number" ? sound : sound.mid,
        typeof sound === "number" ? sound : sound.treble,
      );
      material.uniforms.time.value = t;
      material.uniforms.resonance.value = resonance;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      threadGeometry.dispose();
      threadMaterial.dispose();
    },
  };
}
