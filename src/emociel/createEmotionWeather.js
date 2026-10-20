import * as THREE from "three";
import { brushFor, diskWorld, emotionalBridges } from "./emotionPainting.js";
/** Fixed GPU budgets. Weather is emitted only along painted strokes. */
export function createEmotionWeather() {
  const group = new THREE.Group(),
    mobile = innerWidth < 600 || matchMedia("(pointer:coarse)").matches,
    capacity = mobile ? 1600 : 3200;
  const uniforms = {
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
  void main(){float kind=weather.x,seed=weather.y,age=fract(time*(kind<.5?.24:.32)+seed);vec3 p=position;float life=sin(age*3.14159);
    if(kind<.5){p.y+=age*(.8+weather.z*2.);p.x+=sin(seed*41.+time*.8)*weather.z*.25;}
    else if(kind<1.5){p.y-=age*(1.1+weather.z*2.5);p.x-=age*.22;}
    else{p+=vec3(sin(seed*31.+time*.25),cos(seed*19.+time*.2),sin(seed*43.+time*.18))*weather.z*.35;}
    vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
    float size=kind<.5?46.:kind<1.5?32.:68.;gl_PointSize=clamp(size*pixelRatio*(.5+weather.z)*5./max(2.,-view.z),2.,100.);
    C=color;K=kind;A=life*(kind<1.5?.64:.24)*weather.w;S=seed;
  }`,
    fragmentShader: `varying vec3 C;varying float K,A,S;void main(){vec2 q=gl_PointCoord;float alpha=0.;vec3 tint=C;
    if(K<.5){float y=1.-q.y;float center=.5+sin(y*5.+S*17.)*.1*y;float width=(1.-y)*.38;alpha=(1.-smoothstep(width*.35,width+.025,abs(q.x-center)))*sin(y*3.14159);tint=mix(C,vec3(1.,.77,.32),smoothstep(.2,.85,1.-length((q-vec2(.5,.7))*vec2(2.,1.))));}
    else if(K<1.5){float d=abs(q.x-(.48+(q.y-.5)*.12));alpha=(1.-smoothstep(.012,.065,d))*sin(q.y*3.14159);}
    else{float r=length(q-.5)*2.;alpha=(1.-smoothstep(.05,1.,r))*(.7+.3*sin(q.x*31.+sin(q.y*29.)));}
    if(alpha*A<.003)discard;gl_FragColor=vec4(tint,alpha*A);
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
          kind = ["anger", "frustration"].includes(s.emotionId)
            ? 0
            : ["sadness", "worry"].includes(s.emotionId)
              ? 1
              : 2;
        color.set(b.color);
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
              kind === 1 && i % 4 === 0 ? 2 : kind,
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
      geometry.dispose();
      material.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      group.clear();
    },
  };
}
