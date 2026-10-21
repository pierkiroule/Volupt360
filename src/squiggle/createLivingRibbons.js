import * as THREE from "three";
import { pigmentAtlas } from "./pigmentAtlas.js";
import { createMaterialAtlas } from "./materialAtlas.js";
import { createDisplacementNoise } from "./displacementNoise.js";
import { SQUIGGLE_BRUSHES } from "./brushes.js";
/** Open sheets with staggered growth/dissolution; one draw call, no frame allocations. */
export function createLivingRibbons({ mobile = false } = {}) {
  const capacity = mobile ? 48 : 72,
    segments = mobile ? 48 : 72,
    bands = mobile ? 3 : 5;
  const limit = capacity * segments * bands * 6,
    geometry = new THREE.BufferGeometry();
  const arrays = {
    position: new Float32Array(limit * 3),
    color: new Float32Array(limit * 3),
    uv: new Float32Array(limit * 2),
    life: new Float32Array(limit * 4),
  };
  for (const [key, array] of Object.entries(arrays))
    geometry.setAttribute(
      key,
      new THREE.BufferAttribute(
        array,
        key === "uv" ? 2 : key === "life" ? 4 : 3,
      ),
    );
  geometry.setDrawRange(0, 0);
  const pigment = new THREE.CanvasTexture(pigmentAtlas());
  pigment.colorSpace = THREE.SRGBColorSpace;
  const external = createMaterialAtlas(),
    noise = createDisplacementNoise();
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    forceSinglePass: true,
    vertexColors: true,
    uniforms: {
      time: { value: 0 },
      audio: { value: new THREE.Vector3() },
      pulse: { value: 0 },
      pigment: { value: pigment },
      noise: { value: noise },
      matter: { value: external.color },
    },
    vertexShader: `attribute vec4 life;uniform float time;uniform vec3 audio;varying vec2 U;varying vec3 C;varying vec4 L;
      void main(){U=uv;C=color;L=life;
      float cycle=floor(time/life.y+life.z);
      float turn=sin(cycle*2.399+life.x)*.32;
      mat2 rotate=mat2(cos(turn),-sin(turn),sin(turn),cos(turn));
      vec3 p=position;p.xz=rotate*p.xz;
      float local=mix(audio.x,audio.y,.5+.5*sin(life.x));
      p+=vec3(sin(p.y*.8+time*.21+life.x),cos(p.z*.9-time*.17+life.x),sin(p.x*.6+time*.19))*(.08+local*.22);
      p.y+=sin(uv.x*13.+time*.5+life.x)*sin(uv.y*3.14159)*(.035+audio.z*.065);
      gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `uniform sampler2D pigment,noise,matter;uniform float time,pulse;uniform vec3 audio;
      varying vec2 U;varying vec3 C;varying vec4 L;
      vec3 softLight(vec3 base,vec3 layer){
        return mix(base-(1.-2.*layer)*base*(1.-base),
          base+(2.*layer-1.)*(sqrt(max(base,vec3(0.)))-base),step(vec3(.5),layer));
      }
      void main(){
        float age=fract(time/L.y+L.z);
        float head=smoothstep(.02,.62,age);
        float drawn=1.-smoothstep(head-.045,head,U.x);
        float fading=1.-smoothstep(.64,.99,age);
        float birth=smoothstep(0.,.07,age);
        vec2 drift=texture2D(noise,U*vec2(.6,.3)+vec2(time*.006,L.x*.03)).rg-.5;
        float tile=L.w;
        vec2 q=vec2((tile+.12+fract(U.x*.74+L.x*.13+drift.x*.06)*.76)/8.,.12+U.y*.76);
        float grain=texture2D(pigment,q).a;
        float wet=texture2D(noise,U*vec2(2.,1.)+L.x*.11).b;
        // Warp within a padded atlas cell: organic image structure, no cross-tile bleed.
        vec2 paperUV=clamp(U+drift*vec2(.065,.11),vec2(.015),vec2(.985));
        vec4 source=texture2D(matter,vec2((tile+.01+paperUV.x*.98)/8.,.01+paperUV.y*.98));
        float detail=dot(source.rgb,vec3(.2126,.7152,.0722));
        float deposits=smoothstep(.12,.78,1.-detail)*source.a;
        float textureGrain=mix(1.,.55+detail*.55,source.a);
        float edge=smoothstep(0.,.18,U.y+drift.y*.07)*(1.-smoothstep(.82,1.,U.y+drift.y*.07));
        float ends=smoothstep(0.,.025,U.x)*(1.-smoothstep(.94,1.,U.x));
        float tide=.5+.5*sin(U.x*19.+wet*5.+time*.13+L.x);
        float granulation=smoothstep(.18,.8,wet*grain)*textureGrain+deposits*.18;
        float rim=exp(-pow((U.y-.12-drift.y*.05)*32.,2.))+exp(-pow((U.y-.88-drift.y*.05)*32.,2.));
        float alpha=drawn*fading*birth*edge*ends*(.24+grain*.48+granulation*.22+rim*.16)*(.8+wet*.2);
        alpha*=.75+audio.x*.16+pulse*.08;
        // Soft-light preserves the chosen pigment; multiply deposits ink in darker image details.
        vec3 stained=softLight(C,source.rgb);
        vec3 dye=mix(C,stained,source.a*.72);
        dye*=1.-deposits*.24;
        alpha*=mix(1.,.65+detail*.2+deposits*.5,source.a);
        vec3 color=dye*(.63+grain*.23+wet*.12);
        color*=1.-rim*.2-granulation*.12;
        alpha*=.88+tide*.12;
        if(alpha<.004)discard;
        gl_FragColor=vec4(color,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "Living_Watercolor_Ribbons";
  mesh.frustumCulled = false;
  const group = new THREE.Group();
  group.add(mesh);
  const color = new THREE.Color(),
    center = new THREE.Vector3(),
    tangent = new THREE.Vector3(),
    across = new THREE.Vector3(),
    up = new THREE.Vector3(0, 1, 0),
    vertex = new THREE.Vector3();
  let count = 0;
  function setDocument(items) {
    if (mesh.parent !== group) group.add(mesh);
    count = Math.min(capacity, items.length);
    let cursor = 0;
    for (let i = 0; i < count; i++) {
      const item = items[i],
        p = item.points.at(-1),
        a = p.x * Math.PI * 2,
        t = (0.04 + p.y * 0.92) * Math.PI;
      let seed = (item.id * 7919 + Math.round(p.x * 100003)) >>> 0;
      const rand = () =>
        (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
      const phase = rand() * 30,
        period = 18 + rand() * 22,
        offset = rand();
      const family = Math.max(
        0,
        SQUIGGLE_BRUSHES.findIndex((b) => b.id === item.emotionId),
      );
      const anchor = new THREE.Vector3(
        -Math.cos(a) * Math.sin(t),
        Math.cos(t),
        Math.sin(a) * Math.sin(t),
      ).multiplyScalar((item.radius || 6) * 0.6);
      const controls = [];
      for (let k = 0; k < 6; k++) {
        const angle = k * 0.95 + phase,
          r = 1.1 + rand() * 2.5;
        const v = new THREE.Vector3(
          Math.cos(angle) * r,
          Math.sin(angle * 0.8 + phase) * r * 0.8,
          Math.sin(angle) * r,
        ).addScaledVector(anchor, 0.95 + Math.sin(k * 0.6 + phase) * 0.18);
        v.clampLength(0, 7.2);
        controls.push(v);
      }
      const curve = new THREE.CatmullRomCurve3(controls, false, "centripetal");
      const width =
        (i + family) % 3 === 0
          ? 0.025 + rand() * 0.04
          : (i + family) % 3 === 1
            ? 0.16 + rand() * 0.13
            : 0.32 + rand() * 0.35;
      color.set(item.color);
      const rows = [];
      for (let j = 0; j <= segments; j++) {
        const u = j / segments;
        curve.getPoint(u, center);
        curve.getTangent(u, tangent);
        across.crossVectors(tangent, up);
        if (across.lengthSq() < 0.001) across.set(1, 0, 0);
        across.normalize();
        const normal = new THREE.Vector3()
            .crossVectors(tangent, across)
            .normalize(),
          row = [];
        for (let k = 0; k <= bands; k++) {
          const v = k / bands,
            s = v * 2 - 1;
          vertex
            .copy(center)
            .addScaledVector(
              across,
              s * width * (0.25 + Math.sin(u * Math.PI) * 0.75),
            );
          vertex.addScaledVector(
            normal,
            Math.sin(u * 9 + phase + s * 2) * width * 0.3 * (1 - s * s),
          );
          row.push({ position: vertex.clone(), u, v });
        }
        rows.push(row);
      }
      const emit = (point) => {
        arrays.position.set(
          [point.position.x, point.position.y, point.position.z],
          cursor * 3,
        );
        arrays.color.set([color.r, color.g, color.b], cursor * 3);
        arrays.uv.set([point.u, point.v], cursor * 2);
        arrays.life.set([phase, period, offset, family], cursor * 4);
        cursor++;
      };
      for (let j = 0; j < segments; j++)
        for (let k = 0; k < bands; k++) {
          emit(rows[j][k]);
          emit(rows[j + 1][k]);
          emit(rows[j][k + 1]);
          emit(rows[j][k + 1]);
          emit(rows[j + 1][k]);
          emit(rows[j + 1][k + 1]);
        }
    }
    geometry.setDrawRange(0, cursor);
    for (const attr of Object.values(geometry.attributes))
      attr.needsUpdate = true;
  }
  return {
    group,
    setDocument,
    setMaterials(value) {
      external.setMaterials(value);
      material.uniforms.matter.value = external.color;
    },
    update(time, sound = {}) {
      material.uniforms.time.value = time;
      material.uniforms.audio.value.set(
        sound.bass || 0,
        sound.mid || 0,
        sound.treble || 0,
      );
      material.uniforms.pulse.value = sound.pulse || 0;
    },
    get count() {
      return count;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      pigment.dispose();
      noise.dispose();
      external.dispose();
      group.clear();
    },
  };
}
