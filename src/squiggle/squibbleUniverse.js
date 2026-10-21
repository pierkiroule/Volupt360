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
    positions.set(
      [Math.cos(a) * side * r, y * r, Math.sin(a) * side * r],
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
      ratio: { value: Math.min(devicePixelRatio || 1, 1.4) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    vertexShader: `attribute float seed;uniform float time,ratio,resonance;varying vec3 C;varying float A;
      void main(){vec3 p=position+vec3(sin(time*.12+seed*31.),cos(time*.15+seed*17.),sin(time*.09+seed*43.))*(.22+resonance*.12);
      vec4 v=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*v;
      gl_PointSize=clamp((18.+seed*16.)*ratio/max(1.,-v.z),1.,6.);
      C=color;A=.25+.35*(.5+.5*sin(time*.23+seed*19.));}`,
    fragmentShader: `varying vec3 C;varying float A;void main(){float r=length(gl_PointCoord-.5);
      float a=(1.-smoothstep(.05,.5,r))*A;gl_FragColor=vec4(C,a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return {
    points,
    update(t, resonance = 0) {
      material.uniforms.time.value = t;
      material.uniforms.resonance.value = resonance;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
