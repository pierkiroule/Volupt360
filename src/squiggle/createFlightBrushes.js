import * as THREE from "three";
import { pigmentAtlas } from "./pigmentAtlas.js";
export const FLIGHT_BRUSHES = [
  { name: "Voile", glyph: "≈", color: "#368e91", width: 0.14 },
  { name: "Encre", glyph: "∿", color: "#535c86", width: 0.025 },
  { name: "Grains", glyph: "⁙", color: "#b78336", width: 0.2 },
];
/** Ring-buffer painting: one draw call, at most 75 seconds of living pigment. */
export function createFlightBrushes({ mobile = false } = {}) {
  const capacity = mobile ? 2200 : 3600,
    vertices = capacity * 6,
    geometry = new THREE.BufferGeometry();
  const data = {
    position: new Float32Array(vertices * 3),
    uv: new Float32Array(vertices * 2),
    color: new Float32Array(vertices * 3),
    life: new Float32Array(vertices * 3),
  };
  for (const [name, array] of Object.entries(data))
    geometry.setAttribute(
      name,
      new THREE.BufferAttribute(array, name === "uv" ? 2 : 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
  geometry.setDrawRange(0, 0);
  const attributes = Object.values(geometry.attributes);
  const texture = new THREE.CanvasTexture(pigmentAtlas());
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    forceSinglePass: true,
    vertexColors: true,
    uniforms: {
      time: { value: 0 },
      audio: { value: 0 },
      pigment: { value: texture },
    },
    vertexShader: `attribute vec3 life;uniform float time,audio;varying vec2 U;varying vec3 C,L;
 void main(){U=uv;C=color;L=life;float age=max(0.,time-life.x);vec3 p=position;
 p.y+=sin(position.x*3.+position.z*2.+time*.4+life.z)*min(age*.025,.12)*(1.+audio*.45);
 gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `uniform float time,audio;uniform sampler2D pigment;varying vec2 U;varying vec3 C,L;
 void main(){float age=max(0.,time-L.x);float fade=1.-smoothstep(48.,75.,age);
 float edge=pow(max(0.,1.-abs(U.y*2.-1.)),.8);
 float ink=texture2D(pigment,vec2((L.y+.12+fract(U.x*.12)*.76)/8.,.12+U.y*.76)).a;
 float grain=fract(sin(floor(U.x*6.)*127.1+floor(U.y*12.)*311.7)*43758.5453);
 float alpha=fade*edge*(.3+ink*.7);
 if(L.y>1.5){alpha*=smoothstep(.76,.93,grain);}
 gl_FragColor=vec4(C*(.9+ink*.2),alpha*.86);if(gl_FragColor.a<.005)discard;
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.name = "FPV_Painted_Wake";
  const group = new THREE.Group();
  group.add(mesh);
  const point = new THREE.Vector3(),
    right = new THREE.Vector3(),
    previous = new THREE.Vector3(),
    previousRight = new THREE.Vector3(),
    color = new THREE.Color();
  let connected = false,
    slot = 0,
    count = 0,
    lastBrush = -1,
    clock = 0,
    lastStamp = -10,
    distance = 0;
  const widths = FLIGHT_BRUSHES.map((b) => b.width);
  const emit = (index, p, side, u, v, born, brush) => {
    const i = index * 3;
    data.position[i] = p.x + side.x;
    data.position[i + 1] = p.y + side.y;
    data.position[i + 2] = p.z + side.z;
    data.color[i] = color.r;
    data.color[i + 1] = color.g;
    data.color[i + 2] = color.b;
    data.uv[index * 2] = u;
    data.uv[index * 2 + 1] = v;
    data.life[i] = born;
    data.life[i + 1] = brush;
    data.life[i + 2] = Math.floor(distance * 0.3);
  };
  const startL = new THREE.Vector3(),
    startR = new THREE.Vector3(),
    endL = new THREE.Vector3(),
    endR = new THREE.Vector3();
  return {
    group,
    get count() {
      return count;
    },
    get capacity() {
      return capacity;
    },
    update(
      camera,
      dt,
      { active = false, paused = false, brush = 0, energy = 0 } = {},
    ) {
      if (mesh.parent !== group) group.add(mesh);
      if (!paused) clock += Math.min(dt, 0.1);
      material.uniforms.time.value = clock;
      material.uniforms.audio.value = energy;
      if (paused || !active) {
        connected = false;
        return;
      }
      point
        .set(0, -0.05, -1.8)
        .applyQuaternion(camera.quaternion)
        .add(camera.position);
      right
        .set(1, 0, 0)
        .applyQuaternion(camera.quaternion)
        .multiplyScalar(widths[brush]);
      if (
        !connected ||
        brush !== lastBrush ||
        point.distanceTo(previous) > 0.5
      ) {
        previous.copy(point);
        previousRight.copy(right);
        connected = true;
        lastBrush = brush;
        return;
      }
      const d = point.distanceTo(previous);
      if (d < 0.025 || clock - lastStamp < 0.035) return;
      lastStamp = clock;
      color.set(FLIGHT_BRUSHES[brush].color);
      distance += d * 12;
      startL.copy(previousRight).negate();
      startR.copy(previousRight);
      endL.copy(right).negate();
      endR.copy(right);
      const index = slot * 6,
        u = distance - d * 12;
      emit(index, previous, startL, u, 0, clock, brush);
      emit(index + 1, point, endL, distance, 0, clock, brush);
      emit(index + 2, previous, startR, u, 1, clock, brush);
      emit(index + 3, previous, startR, u, 1, clock, brush);
      emit(index + 4, point, endL, distance, 0, clock, brush);
      emit(index + 5, point, endR, distance, 1, clock, brush);
      for (const attr of attributes) {
        attr.clearUpdateRanges();
        attr.addUpdateRange(index * attr.itemSize, 6 * attr.itemSize);
        attr.needsUpdate = true;
      }
      slot = (slot + 1) % capacity;
      count = Math.min(count + 1, capacity);
      geometry.setDrawRange(0, count * 6);
      previous.copy(point);
      previousRight.copy(right);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      texture.dispose();
      group.clear();
    },
  };
}
