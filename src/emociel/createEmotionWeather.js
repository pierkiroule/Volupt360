import * as THREE from "three";
import {
  brushFor,
  diskWorld,
  emotionalBridges,
  symbolAtlas,
} from "./emotionPainting.js";
/** Fixed GPU budgets. Weather is emitted only along painted strokes. */
export function createEmotionWeather() {
  const group = new THREE.Group(),
    mobile = innerWidth < 600 || matchMedia("(pointer:coarse)").matches,
    capacity = mobile ? 1600 : 3200;
  const atlas = new THREE.CanvasTexture(symbolAtlas());
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.flipY = false;
  atlas.generateMipmaps = false;
  atlas.minFilter = atlas.magFilter = THREE.LinearFilter;
  const uniforms = {
    symbols: { value: atlas },
    time: { value: 0 },
    pixelRatio: { value: Math.min(devicePixelRatio || 1, 1.7) },
  };
  const positions = new Float32Array(capacity * 3),
    colors = new Float32Array(capacity * 3),
    data = new Float32Array(capacity * 4),
    geometry = new THREE.BufferGeometry();
  for (const [name, array] of [
    ["position", positions],
    ["color", colors],
    ["weather", data],
  ])
    geometry.setAttribute(
      name,
      new THREE.BufferAttribute(array, name === "weather" ? 4 : 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
  geometry.setDrawRange(0, 0);
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    vertexShader: `attribute vec4 weather;uniform float time,pixelRatio;varying vec3 C;varying float K,A,S;
    void main(){float k=weather.x,seed=weather.y,age=fract(time*(k==1.? .3:.18)+seed);vec3 p=position;float life=sin(age*3.14159);float w=weather.z;
      if(k==2.){p.y+=age*(.8+w*2.);p.x+=sin(seed*41.+time*.8)*w*.25;}
      else if(k==1.){p.y-=age*(1.1+w*2.5);p.x-=age*.22;}
      else if(k==5.){p.x+=sin(seed*31.+time*.42)*w*.6;p.y+=cos(seed*17.+time*.27)*w*.4;}
      else if(k==8.){p.x+=sin(seed*21.+time*.7)*w*.2;p.y+=sin(seed*13.+time*.5)*w*.08;}
      else if(k==6.||k==10.){p.y+=age*w*.9;p.x+=sin(seed*13.+time*.3)*w*.2;}
      else if(k==7.){p.y-=age*w*.35;p.x+=sin(seed*23.+time*.2)*w*.13;}
      else if(k==4.||k==9.){p+=normalize(position-vec3(0.,0.,20.))*age*w*.55;}
      else if(k==3.){p+=vec3(sin(seed*19.+time*.6),cos(seed*17.+time*.5),sin(seed*13.+time*.4))*w*.12;}
      else{p+=vec3(sin(seed*31.+time*.25),cos(seed*19.+time*.2),sin(seed*43.+time*.18))*w*.35;}
      vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
      float size=k==1.?34.:k==12.?80.:58.;if(k==10.)size*=.55+age*.7;
      gl_PointSize=clamp(size*pixelRatio*(.5+w)*5./max(2.,-view.z),3.,100.);
      C=color;K=k;A=life*(k==12.?.26:.8)*weather.w;S=seed;
    }`,
    fragmentShader: `uniform sampler2D symbols;varying vec3 C;varying float K,A,S;
    void main(){vec2 q=vec2(gl_PointCoord.x,1.-gl_PointCoord.y);
      vec2 tile=vec2(mod(K,4.),floor(K/4.));vec2 uv=(tile+(q*127.+.5)/128.)/4.;
      vec4 ink=texture2D(symbols,uv);if(ink.a*A<.004)discard;
      vec3 tint=K>11.5?mix(ink.rgb,C,.8):ink.rgb;
      gl_FragColor=vec4(tint,ink.a*A);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  group.add(points);
  const lineGeometry = new THREE.BufferGeometry(),
    linePositions = new Float32Array(3 * 28 * 2 * 3),
    lineSeeds = new Float32Array(3 * 28 * 2);
  lineGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(linePositions, 3),
  );
  lineGeometry.setAttribute("seed", new THREE.BufferAttribute(lineSeeds, 1));
  lineGeometry.setDrawRange(0, 0);
  const lineMaterial = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: `attribute float seed;varying float S;void main(){S=seed;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float time;varying float S;void main(){float cycle=.5+.5*sin(time*.48+S);gl_FragColor=vec4(.57,.47,.72,.08+cycle*.32);}`,
  });
  const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
  lines.frustumCulled = false;
  group.add(lines);
  const reduced = matchMedia("(prefers-reduced-motion:reduce)");
  return {
    group,
    get stats() {
      return {
        particles: geometry.drawRange.count,
        bridgeVertices: lineGeometry.drawRange.count,
        capacity,
      };
    },
    setDocument(strokes) {
      let state = 7193;
      const random = () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
      };
      const color = new THREE.Color(),
        v = new THREE.Vector3();
      let count = 0;
      const per = Math.min(
        120,
        Math.max(12, Math.floor(capacity / Math.max(1, strokes.length))),
      );
      for (const s of strokes) {
        const b = brushFor(s.emotionId),
          kind = b.index;
        color.set(s.color || b.color);
        for (let i = 0; i < per && count < capacity; i++) {
          const p =
              s.points[
                Math.min(
                  s.points.length - 1,
                  Math.floor(random() * s.points.length),
                )
              ],
            world = diskWorld(p, 8.5 + random() * 1.4),
            spread = (s.size / 768) * 7;
          v.set(world[0], world[1], world[2]);
          v.x += (random() - 0.5) * spread;
          v.y += (random() - 0.5) * spread;
          v.z += (random() - 0.5) * spread;
          positions.set(v.toArray(), count * 3);
          colors.set([color.r, color.g, color.b], count * 3);
          data.set(
            [
              kind === 1 && i % 4 === 0 ? 12 : kind,
              random(),
              Math.max(0.14, spread),
              s.opacity,
            ],
            count * 4,
          );
          count++;
        }
      }
      geometry.setDrawRange(0, count);
      for (const a of Object.values(geometry.attributes)) a.needsUpdate = true;
      let n = 0;
      for (const edge of emotionalBridges(strokes)) {
        const a = new THREE.Vector3(...diskWorld(edge.a)).sub(
            new THREE.Vector3(0, 0, 20),
          ),
          b = new THREE.Vector3(...diskWorld(edge.b)).sub(
            new THREE.Vector3(0, 0, 20),
          );
        for (let i = 0; i < 28; i++)
          for (let side = 0; side < 2; side++) {
            const t = (i + side) / 28;
            v.copy(a).lerp(b, t);
            if (v.lengthSq() < 0.1) v.set(0, 1, 0);
            v.normalize().multiplyScalar(9);
            v.y +=
              Math.sin((i + side) * 4.7 + edge.seed) *
              0.12 *
              Math.sin(t * Math.PI);
            v.z += 20;
            linePositions.set(v.toArray(), n * 3);
            lineSeeds[n] = edge.seed;
            n++;
          }
      }
      lineGeometry.setDrawRange(0, n);
      for (const a of Object.values(lineGeometry.attributes))
        a.needsUpdate = true;
    },
    update(time) {
      uniforms.time.value = reduced.matches ? 0 : time;
    },
    dispose() {
      atlas.dispose();
      geometry.dispose();
      material.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      group.clear();
    },
  };
}
