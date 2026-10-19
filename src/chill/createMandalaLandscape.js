import * as THREE from "three";
import { mandalaPoint } from "./mandalaGenerator.js";

/** A single ribbon batch retains every 2D petal; bounded local motion lives on the GPU. */
export function createMandalaLandscape() {
  const group = new THREE.Group(),
    bounds = new THREE.Box3();
  let mesh = null,
    energy = new Float32Array(6),
    active = false;
  const uniforms = { time: { value: 0 }, bands: { value: energy } };
  function clear() {
    for (const child of group.children) {
      child.geometry.dispose();
      child.material.dispose();
    }
    mesh = null;
    group.clear();
    bounds.makeEmpty();
    active = false;
    energy.fill(0);
  }
  return {
    group,
    bounds,
    get active() {
      return active;
    },
    setDocument(doc) {
      clear();
      if (doc.kind !== "resonant-mandala") return;
      active = true;
      const positions = [],
        colors = [],
        data = [],
        indices = [],
        uv = [];
      const tint = new THREE.Color();
      for (const path of doc.paths) {
        tint.set(path.color);
        const offset = positions.length / 3;
        for (let i = 0; i < path.points.length; i++) {
          const p = path.points[i],
            prev = path.points[Math.max(0, i - 1)],
            next = path.points[Math.min(path.points.length - 1, i + 1)];
          const dx = next.x - prev.x,
            dy = next.y - prev.y,
            len = Math.hypot(dx, dy) || 1;
          for (let edge = 0; edge < 2; edge++) {
            const sign = edge ? 1 : -1,
              world = mandalaPoint(
                {
                  x: p.x - (dy / len) * path.width * sign * 0.75,
                  y: p.y + (dx / len) * path.width * sign * 0.75,
                },
                path.layer,
              );
            positions.push(...world);
            bounds.expandByPoint(new THREE.Vector3(...world));
            colors.push(tint.r, tint.g, tint.b);
            data.push(path.band, path.opacity, path.layer);
            uv.push(i / (path.points.length - 1), edge);
          }
          if (i < path.points.length - 1) {
            const k = offset + i * 2;
            indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
          }
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      g.setAttribute("data", new THREE.Float32BufferAttribute(data, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(indices);
      mesh = new THREE.Mesh(
        g,
        new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          vertexColors: true,
          uniforms,
          vertexShader: `attribute vec3 data; uniform float time; uniform float bands[6]; varying vec3 C; varying vec2 U; varying float A;
        void main(){float e=0.;for(int i=0;i<6;i++){if(abs(float(i)-data.x)<.1)e=bands[i];}vec3 p=position;float r=length(p.xz-vec2(0.,20.));p.y+=sin(r*.6+time*.35+data.z)*(.12+e*.55);p.x+=sin(time*.23+p.z*.3)*e*.12;C=color;U=uv;A=data.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
          fragmentShader: `varying vec3 C;varying vec2 U;varying float A;void main(){float edge=1.-abs(U.y*2.-1.);float grain=.7+.3*sin(U.x*713.+sin(U.y*43.));gl_FragColor=vec4(C*.85,A*(.35+.65*edge)*grain);}`,
        }),
      );
      mesh.frustumCulled = false;
      group.add(mesh);
      // Pigment deposits from the paper remain present in the landscape.
      const dots = new THREE.BufferGeometry(),
        dp = [],
        dc = [];
      for (const dot of doc.dots) {
        dp.push(...mandalaPoint(dot, 2));
        tint.set(dot.color);
        dc.push(tint.r, tint.g, tint.b);
      }
      dots.setAttribute("position", new THREE.Float32BufferAttribute(dp, 3));
      dots.setAttribute("color", new THREE.Float32BufferAttribute(dc, 3));
      group.add(
        new THREE.Points(
          dots,
          new THREE.PointsMaterial({
            size: 0.065,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
          }),
        ),
      );
    },
    update(time, audio, dt) {
      if (!active) return;
      uniforms.time.value = time;
      for (let i = 0; i < 6; i++)
        energy[i] +=
          ((audio.bands?.[i] ?? audio.energy ?? 0) - energy[i]) *
          (1 - Math.exp(-dt * 2));
    },
    clear,
    dispose() {
      this.clear();
    },
  };
}
