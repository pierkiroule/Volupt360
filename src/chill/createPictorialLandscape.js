import * as THREE from "three";
import { SENSORY_EMOJIS } from "./sensoryEmojiCatalog.js";
import { paintingToWorld } from "./paintingToWorld.js";
function pictorialPoint(point, layer = 0) {
  return paintingToWorld(
    { u: point.x + 0.5, v: point.y + 0.5 },
    layer,
    80,
    0.04,
  ).toArray();
}

/** A single ribbon batch retains every painted gesture; bounded local motion lives on the GPU. */
export function createPictorialLandscape() {
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
      if (doc.kind !== "emoji-painting") return;
      active = true;
      const positions = [],
        colors = [],
        data = [],
        motifs = [],
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
              world = pictorialPoint(
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
            motifs.push(
              Math.max(
                0,
                SENSORY_EMOJIS.findIndex((e) => e.id === path.emojiId),
              ),
            );
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
      g.setAttribute("motif", new THREE.Float32BufferAttribute(motifs, 1));
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
          vertexShader: `attribute vec3 data; attribute float motif; uniform float time; uniform float bands[6]; varying vec3 C; varying vec2 U; varying float A;varying float M;varying float E;
        void main(){float e=0.;for(int i=0;i<6;i++){if(abs(float(i)-data.x)<.1)e=bands[i];}vec3 p=position;float phase=uv.x*18.+data.z;
          float motion=sin(phase-time*.8)*.08;
          if(motif<.5){motion=sin(phase+time*.6)*.12;}
          else if(motif<1.5){motion=sin(phase-time*1.8)*(.12+e*.3);}
          else if(motif<2.5){motion=(.5+.5*sin(phase-time*2.8))*(.18+e*.4);}
          else if(motif<3.5){motion=sin(phase+time*.35)*.045;}
          else if(motif<4.5){motion=sin(phase+time*.25)*.025;}
          else if(motif<5.5){motion=sin(phase+time*.75)*.18;}
          else if(motif<6.5){motion=sin(phase*.3+time*.25)*.2;}
          else if(motif<7.5){motion=sin(phase*3.-time*2.)*.08;}
          else if(motif<8.5){p.x+=cos(phase+time*.6)*.09;motion=sin(phase+time*.6)*.13;}
          else if(motif<9.5){motion=sin(phase*2.-time*1.5)*.08;}
          else if(motif<10.5){motion=sin(phase+time*.5)*.1;}
          else{motion=sin(phase*.5+time*.6)*.07;}
          p.y+=motion*(.7+e);C=color;U=uv;A=data.y;M=motif;E=e;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
          fragmentShader: `uniform float time;varying vec3 C;varying vec2 U;varying float A;varying float M;varying float E;void main(){float edge=1.-abs(U.y*2.-1.);float grain=.7+.3*sin(U.x*713.+sin(U.y*43.));vec3 tint=C;float flow=.9+.1*sin(U.x*28.-time);if(M>1.5&&M<2.5){float heat=.5+.5*sin(U.x*25.-time*2.8);tint=mix(C,vec3(.84,.32,.065),heat*.75);}if(M>.5&&M<1.5){float crest=.5+.5*sin(U.x*32.-time*1.8);tint=mix(C,vec3(.3,.65,.78),crest*.45);flow=.7+crest*.3;}gl_FragColor=vec4(tint*.9,A*(.35+.65*edge)*grain*flow);}`,
        }),
      );
      mesh.frustumCulled = false;
      group.add(mesh);
      // Pigment deposits from the paper remain present in the landscape.
      const dots = new THREE.BufferGeometry(),
        dp = [],
        dc = [];
      for (const dot of doc.dots) {
        dp.push(...pictorialPoint(dot, 2));
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
