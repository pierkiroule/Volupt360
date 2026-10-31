import * as THREE from "three";
import { NUANCES } from "./palette";

/** Authored plastic vocabularies, not psychological measurements. */
export const RESONANCE_PROFILES: Record<string, [number, number, number]> = {
  warm: [1.1, 0.35, 0.7],
  water: [0.45, 0.9, 0.22],
  air: [1.8, 0.65, 0.38],
  soft: [0.7, 0.4, 0.3],
  night: [2.4, 0.45, 0.65],
  spark: [0.8, 0.25, 0.25],
  wonder: [1.5, 0.6, 0.55],
  surprise: [2, 0.8, 0.5],
  confused: [2.7, 0.65, 0.35],
  tired: [0.3, 0.2, 0.12],
  trust: [0.65, 0.3, 0.18],
  longing: [1, 0.75, 0.2],
};
const vertex = `uniform float time,curl,drift,speed,phase,encounter,energy;
attribute float lane;varying vec2 vUv;varying float ribbon,viewDepth;
void main(){vUv=uv;ribbon=lane;float u=uv.x;float a=u*6.283185*(1.+curl*.32)+lane*1.57+phase;
 float t=time*speed*.22;float r=1.15+.22*sin(a*2.+t+lane);
 vec3 p=vec3(cos(a+t*.35)*r,sin(a*1.3-t)*drift*1.7+(u-.5)*1.8,sin(a+t*.35)*r);
 vec3 crossAxis=normalize(vec3(cos(a),.7*sin(a*2.+t),sin(a)));
 float width=(.1+.28*sin(u*3.14159))*(.8+encounter*.55);
 p+=crossAxis*(uv.y-.5)*width*2.;
 p+=vec3(sin(a*3.-t),cos(a*2.+t),sin(a-t))*.035*energy;
 vec4 view=modelViewMatrix*vec4(p,1.);viewDepth=-view.z;gl_Position=projectionMatrix*view;}`;
const fragment = `uniform vec3 color,secondary;uniform float time,encounter;varying vec2 vUv;varying float ribbon,viewDepth;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
 void main(){float grain=noise(vUv*vec2(160.,22.)+ribbon*17.);float wash=noise(vUv*vec2(15.,5.)+ribbon*3.);
 float edge=abs(vUv.y-.5)*2.;float mask=1.-smoothstep(.55+wash*.18,1.,edge);
 float ends=smoothstep(0.,.08,vUv.x)*(1.-smoothstep(.9,1.,vUv.x));
 vec3 pigment=mix(color,secondary,wash*.65+.15*sin(ribbon));
 pigment*=.65+grain*.45;float rim=smoothstep(.4,.9,edge)*mask;
 pigment*=1.-rim*.25;
 gl_FragColor=vec4(pigment,mask*ends*smoothstep(.3,1.4,viewDepth)*(.38+grain*.25+encounter*.15));
 #include <colorspace_fragment>
 }`;

export class EmotionalResonance {
  readonly group = new THREE.Group();
  private geometry: THREE.BufferGeometry;
  private particles: THREE.BufferGeometry;
  private entries: {
    node: THREE.Group;
    veil: THREE.ShaderMaterial;
    dust: THREE.ShaderMaterial;
    presence: number;
  }[] = [];
  private energy = 0;
  private lastTime = 0;
  constructor(mobile: boolean) {
    const positions: number[] = [],
      uv: number[] = [],
      lanes: number[] = [],
      indices: number[] = [];
    for (let lane = 0; lane < 4; lane++) {
      const start = positions.length / 3;
      for (let j = 0; j <= 80; j++)
        for (let side = 0; side < 2; side++) {
          positions.push(0, 0, 0);
          uv.push(j / 80, side);
          lanes.push(lane);
        }
      for (let j = 0; j < 80; j++) {
        const k = start + j * 2;
        indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    this.geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    this.geometry.setAttribute(
      "lane",
      new THREE.Float32BufferAttribute(lanes, 1),
    );
    this.geometry.setIndex(indices);
    const count = mobile ? 128 : 240,
      seeds = new Float32Array(count * 3);
    let state = 47123;
    for (let i = 0; i < seeds.length; i++) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      seeds[i] = state / 4294967296;
    }
    this.particles = new THREE.BufferGeometry();
    this.particles.setAttribute(
      "position",
      new THREE.BufferAttribute(seeds, 3),
    );
    for (let i = 0; i < 3; i++) {
      const uniforms = {
        time: { value: 0 },
        curl: { value: 1 },
        drift: { value: 0.5 },
        speed: { value: 0.3 },
        phase: { value: i * 1.4 },
        encounter: { value: 0 },
        energy: { value: 0 },
        color: { value: new THREE.Color() },
        secondary: { value: new THREE.Color() },
      };
      const veil = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.geometry, veil);
      mesh.frustumCulled = false;
      const dust = new THREE.ShaderMaterial({
        uniforms,
        transparent: true,
        depthWrite: false,
        vertexShader: `uniform float time,speed,curl,phase,encounter;varying float alpha;
        void main(){float a=position.x*6.283+time*speed*.15;float r=.5+position.y*1.6;
        vec3 p=vec3(cos(a)*r,sin(a*curl+phase+time*.12)*position.z*1.8,sin(a)*r);
        vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;gl_PointSize=clamp((12.+position.z*15.)/max(.5,-view.z),1.,5.);alpha=.35+encounter*.3;}`,
        fragmentShader: `uniform vec3 color,secondary;varying float alpha;void main(){float r=length(gl_PointCoord-.5);float a=1.-smoothstep(.1,.5,r);if(a<.01)discard;gl_FragColor=vec4(mix(color,secondary,.5),a*alpha);\n#include <colorspace_fragment>\n}`,
      });
      const points = new THREE.Points(this.particles, dust);
      points.frustumCulled = false;
      const node = new THREE.Group();
      node.position.set(
        Math.sin(i * 2.094) * 5.5,
        18 + (i - 1) * 0.8,
        -5 + Math.cos(i * 2.094) * 5.5,
      );
      node.add(mesh, points);
      this.group.add(node);
      this.entries.push({ node, veil, dust, presence: 0 });
    }
    this.setPalette(["warm", "water"]);
  }
  setPalette(ids: string[]) {
    const valid = ids.filter((id) => RESONANCE_PROFILES[id]).slice(0, 3);
    if (!valid.length) valid.push("warm");
    this.entries.forEach((entry, i) => {
      const id = valid[i % valid.length],
        other = valid[(i + 1) % valid.length];
      const n = NUANCES.find((n) => n.id === id)!,
        next = NUANCES.find((n) => n.id === other)!;
      const p = RESONANCE_PROFILES[id],
        q = RESONANCE_PROFILES[other],
        u = entry.veil.uniforms;
      u.color.value.set(n.color);
      u.secondary.value.set(next.secondary);
      u.curl.value = p[0] * 0.75 + q[0] * 0.25 + i * 0.12;
      u.drift.value = p[1] * 0.75 + q[1] * 0.25;
      u.speed.value = p[2] * 0.75 + q[2] * 0.25;
      entry.presence = 0;
      u.encounter.value = 0;
    });
    this.group.userData.sequence = valid.join(">");
  }
  update(time: number, camera: THREE.Camera, energy = 0) {
    const dt = Math.max(0, Math.min(0.04, time - this.lastTime));
    this.lastTime = time;
    this.energy = THREE.MathUtils.damp(
      this.energy,
      Math.min(1, Math.max(0, energy)),
      2,
      dt,
    );
    for (const entry of this.entries) {
      const distance = camera.position.distanceTo(entry.node.position);
      const target = 1 - THREE.MathUtils.smoothstep(distance, 1.2, 4.5);
      entry.presence = THREE.MathUtils.damp(entry.presence, target, 1.4, dt);
      entry.veil.uniforms.time.value = time;
      entry.veil.uniforms.energy.value = this.energy;
      entry.veil.uniforms.encounter.value = entry.presence;
    }
  }
  inspect() {
    return {
      sequence: this.group.userData.sequence,
      draws: 6,
      particles: this.particles.attributes.position.count * 3,
      presence: this.entries.map((e) => e.presence),
      time: this.lastTime,
    };
  }
  dispose() {
    for (const e of this.entries) {
      e.veil.dispose();
      e.dust.dispose();
    }
    this.geometry.dispose();
    this.particles.dispose();
    this.group.clear();
  }
}
