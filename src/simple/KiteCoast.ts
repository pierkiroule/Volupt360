import * as THREE from "three";
import { NUANCES } from "./palette";
import { RESONANCE_PROFILES } from "./EmotionalResonance";

/** Stable shore, bounded fingertip steering, fixed-step flowing cloth tail. */
export class KiteCoast {
  readonly group = new THREE.Group();
  readonly position = new THREE.Vector3(0, 20, -5);
  private target = new THREE.Vector3(0, 20, -5);
  private body = new THREE.Group();
  private sail: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private sea: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private tail: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private string: THREE.Line;
  private points = new Float32Array(100 * 3);
  private old = new Float32Array(100 * 3);
  private tailVertices = new Float32Array(100 * 6);
  private lineVertices = new Float32Array(64 * 3);
  private anchor = new THREE.Vector3();
  private bank = 0;
  private accumulator = 0;
  private lastTime = 0;
  private wind = 0.3;
  private held = false;
  private materialResources: THREE.Material[] = [];
  constructor() {
    this.sail = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2.8, 12, 16),
      new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        transparent: true,
        uniforms: {
          time: { value: 0 },
          color: { value: new THREE.Color() },
          secondary: { value: new THREE.Color() },
          wind: { value: 0.3 },
          pattern: { value: 1 },
        },
        vertexShader: `uniform float time,wind;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;p.x*=1.-abs(uv.y-.5)*2.;p.z=.18*sin(uv.y*3.14159)+sin(time*2.4+uv.y*8.)*.045*wind*abs(p.x);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
        fragmentShader: `uniform vec3 color,secondary;uniform float pattern;varying vec2 vUv;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){float panel=smoothstep(.2,.8,vUv.x+sin(vUv.y*(5.+pattern*5.))*(.07+pattern*.03));vec3 c=mix(color,secondary,panel);float seam=1.-smoothstep(.003,.012,abs(vUv.x-.5));c=mix(c,vec3(.95,.89,.76),seam*.7);c*=.85+hash(floor(vUv*600.))*.17;gl_FragColor=vec4(c,.95);\n#include <colorspace_fragment>\n}`,
      }),
    );
    this.body.add(this.sail);
    this.group.add(this.body);
    const seaMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color("#577f91") },
      },
      side: THREE.DoubleSide,
      vertexShader: `varying vec3 world;void main(){world=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}`,
      fragmentShader: `uniform float time;uniform vec3 color;varying vec3 world;void main(){float wave=sin(world.z*2.1+time*.55+sin(world.x*.2))*sin(world.z*.7-world.x*.3+time*.25);vec3 c=color+wave*.035;float foam=pow(max(0.,sin(world.z*1.1+time*.35+sin(world.x*.08)*.7)),22.);c+=foam*.13;c=mix(c,vec3(.68,.74,.77),smoothstep(30.,300.,length(world.xz)));gl_FragColor=vec4(c,1.);\n#include <colorspace_fragment>\n}`,
    });
    this.sea = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), seaMaterial);
    this.sea.rotation.x = -Math.PI / 2;
    this.sea.position.set(0, 13.8, -480);
    this.group.add(this.sea);
    const beach = new THREE.Mesh(
      new THREE.PlaneGeometry(1000, 24),
      new THREE.MeshBasicMaterial({ color: "#d6c7ab", side: THREE.DoubleSide }),
    );
    beach.rotation.x = -Math.PI / 2;
    beach.position.set(0, 13.82, 20);
    this.group.add(beach);
    const tg = new THREE.BufferGeometry();
    tg.setAttribute(
      "position",
      new THREE.BufferAttribute(this.tailVertices, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    const indices = [];
    for (let i = 0; i < 99; i++) {
      const k = i * 2;
      indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
    tg.setIndex(indices);
    this.tail = new THREE.Mesh(
      tg,
      new THREE.MeshBasicMaterial({
        color: "#d98b66",
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    this.tail.frustumCulled = false;
    this.tail.renderOrder = 3;
    this.group.add(this.tail);
    const lg = new THREE.BufferGeometry();
    lg.setAttribute(
      "position",
      new THREE.BufferAttribute(this.lineVertices, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    this.string = new THREE.Line(
      lg,
      new THREE.LineBasicMaterial({
        color: "#494652",
        transparent: true,
        opacity: 0.5,
      }),
    );
    this.string.frustumCulled = false;
    this.group.add(this.string);
    this.body.position.copy(this.position);
    for (let i = 0; i < 100; i++) {
      this.points.set([0, 18.6 - i * 0.075, -5], i * 3);
    }
    this.old.set(this.points);
    this.group.traverse((o) => {
      const m = (o as THREE.Mesh).material;
      if (m && !Array.isArray(m)) this.materialResources.push(m);
    });
    this.setPalette(["warm", "water"]);
  }
  setPalette(ids: string[]) {
    const chosen = ids
      .map((id) => NUANCES.find((n) => n.id === id))
      .filter(Boolean);
    const a = chosen[0] || NUANCES[0],
      b = chosen[1] || a,
      c = chosen[2] || b;
    this.sail.material.uniforms.color.value.set(a.color);
    this.sail.material.uniforms.secondary.value
      .set(b.secondary)
      .lerp(new THREE.Color(c.color), chosen.length === 3 ? 0.35 : 0);
    this.wind =
      ids.reduce((sum, id) => sum + (RESONANCE_PROFILES[id]?.[2] ?? 0.3), 0) /
      Math.max(1, ids.length);
    this.sail.material.uniforms.wind.value = this.wind;
    this.sail.material.uniforms.pattern.value = RESONANCE_PROFILES[a.id][0];
    this.tail.material.color.set(c.secondary);
    this.sea.material.uniforms.color.value
      .set("#577f91")
      .lerp(new THREE.Color(a.color), 0.16);
    this.group.userData.sequence = ids.join(">");
  }
  steer(x: number, y: number) {
    this.held = true;
    this.target.set(
      THREE.MathUtils.clamp(x, -1, 1) * 5,
      20 - THREE.MathUtils.clamp(y, -1, 1) * 3,
      -5,
    );
  }
  release() {
    this.held = false;
  }
  update(time: number) {
    const dt = Math.max(0, Math.min(0.04, time - this.lastTime));
    this.lastTime = time;
    if (!this.held)
      this.target.set(
        Math.sin(time * 0.23) * 2.5,
        20 + Math.sin(time * 0.31) * 0.8,
        -5 + Math.sin(time * 0.13) * 0.5,
      );
    const dx = this.target.x - this.position.x;
    this.position.x = THREE.MathUtils.damp(
      this.position.x,
      this.target.x,
      3,
      dt,
    );
    this.position.y = THREE.MathUtils.damp(
      this.position.y,
      this.target.y,
      3,
      dt,
    );
    this.position.z = THREE.MathUtils.damp(
      this.position.z,
      this.target.z,
      3,
      dt,
    );
    this.bank = THREE.MathUtils.damp(this.bank, -dx * 0.12, 3, dt);
    this.body.position.copy(this.position);
    this.body.rotation.set(
      0.06 * Math.sin(time * 0.7),
      Math.sin(time * 0.32) * 0.12,
      this.bank,
    );
    this.sail.material.uniforms.time.value = time;
    this.sea.material.uniforms.time.value = time;
    this.anchor
      .set(0, -1.4, 0)
      .applyEuler(this.body.rotation)
      .add(this.position);
    this.accumulator += dt;
    while (this.accumulator >= 1 / 60) {
      this.step(time);
      this.accumulator -= 1 / 60;
    }
    for (let i = 0; i < 100; i++) {
      const k = i * 3,
        v = i * 6,
        width = 0.085 * (1 - i / 110);
      const next = Math.min(99, i + 1) * 3,
        previous = Math.max(0, i - 1) * 3;
      const tx = this.points[next] - this.points[previous],
        ty = this.points[next + 1] - this.points[previous + 1];
      const length = Math.max(0.001, Math.hypot(tx, ty));
      const sx = (-ty / length) * width,
        sy = (tx / length) * width;
      this.tailVertices[v] = this.points[k] - sx;
      this.tailVertices[v + 1] = this.points[k + 1] - sy;
      this.tailVertices[v + 2] = this.points[k + 2];
      this.tailVertices[v + 3] = this.points[k] + sx;
      this.tailVertices[v + 4] = this.points[k + 1] + sy;
      this.tailVertices[v + 5] = this.points[k + 2];
    }
    this.tail.geometry.attributes.position.needsUpdate = true;
    for (let i = 0; i < 64; i++) {
      const u = i / 63,
        k = i * 3;
      this.lineVertices[k] = this.position.x * u;
      this.lineVertices[k + 1] =
        16 + (this.position.y - 16) * u - Math.sin(u * Math.PI) * 0.35;
      this.lineVertices[k + 2] = 10 + (this.position.z - 10) * u;
    }
    this.string.geometry.attributes.position.needsUpdate = true;
  }
  private step(time: number) {
    for (let i = 1; i < 100; i++) {
      const k = i * 3;
      for (let axis = 0; axis < 3; axis++) {
        const p = this.points[k + axis];
        const force =
          axis === 0
            ? Math.sin(time * 0.9 + i * 0.12) * 0.0015
            : axis === 1
              ? -0.0014
              : 0.0015 + Math.cos(time * 0.8 + i * 0.1) * 0.0008;
        this.points[k + axis] = p + (p - this.old[k + axis]) * 0.965 + force;
        this.old[k + axis] = p;
      }
    }
    for (let pass = 0; pass < 4; pass++) {
      this.points[0] = this.anchor.x;
      this.points[1] = this.anchor.y;
      this.points[2] = this.anchor.z;
      for (let i = 1; i < 100; i++) {
        const k = i * 3,
          p = k - 3;
        const x = this.points[k] - this.points[p],
          y = this.points[k + 1] - this.points[p + 1],
          z = this.points[k + 2] - this.points[p + 2];
        const correction =
          (Math.hypot(x, y, z) - 0.09) / Math.max(0.001, Math.hypot(x, y, z));
        this.points[k] -= x * correction;
        this.points[k + 1] -= y * correction;
        this.points[k + 2] -= z * correction;
      }
    }
  }
  inspect() {
    return {
      position: this.position.toArray(),
      held: this.held,
      time: this.lastTime,
      tailPoints: 100,
      sequence: this.group.userData.sequence,
    };
  }
  dispose() {
    const geometries = new Set<THREE.BufferGeometry>();
    this.group.traverse((o) => {
      const g = (o as THREE.Mesh).geometry;
      if (g) geometries.add(g);
    });
    geometries.forEach((g) => g.dispose());
    this.materialResources.forEach((m) => m.dispose());
    this.group.clear();
  }
}
