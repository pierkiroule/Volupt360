import * as THREE from "three";
import { createMaterialAtlas } from "./materialAtlas.js";
import { createDisplacementNoise } from "./displacementNoise.js";
import { PIGMENT_COLUMNS } from "./pigmentAtlas.js";
import { SQUIGGLE_BRUSHES, SCULPT_RADIUS } from "./brushes.js";

/** Open, double-sided watercolor sheets; no thickness and no end caps. */
export function createPigmentRibbons(texture, { mobile = false } = {}) {
  const maxSegments = mobile ? 700 : 1400,
    sides = mobile ? 4 : 7;
  const maxVertices = maxSegments * sides * 6;
  const geometry = new THREE.BufferGeometry();
  geometry.name = "GEO_Nappe_Aquarelle_01";
  const noiseTexture = createDisplacementNoise();
  const external = createMaterialAtlas();
  const buffers = {
    position: new Float32Array(maxVertices * 3),
    normal: new Float32Array(maxVertices * 3),
    color: new Float32Array(maxVertices * 3),
    uv: new Float32Array(maxVertices * 2),
    fold: new Float32Array(maxVertices * 4),
  };
  for (const [name, array] of Object.entries(buffers))
    geometry.setAttribute(
      name,
      new THREE.BufferAttribute(
        array,
        name === "fold" ? 4 : name === "uv" ? 2 : 3,
      ).setUsage(THREE.DynamicDrawUsage),
    );
  geometry.setDrawRange(0, 0);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexColors: true,
    uniforms: {
      pigment: { value: texture },
      materialColor: { value: external.color },
      materialHeight: { value: external.height },
      displacementNoise: { value: noiseTexture },
      time: { value: 0 },
    },
    vertexShader: `attribute vec4 fold;uniform sampler2D displacementNoise,materialColor,materialHeight;uniform float time;varying vec2 U;varying vec3 C,N,P;varying vec4 F;
    void main(){U=uv;C=color;F=fold;
      vec2 flowUV=uv*vec2(.65,.4)+vec2(fold.z*.071+time*.013,-time*.009);
      vec3 field=texture2D(displacementNoise,flowUV).rgb;
      vec2 surfaceUV=vec2((fold.x+.01+fract(uv.x*1.7+fold.z*.11)*.98)/${PIGMENT_COLUMNS}.,.01+uv.y*.98);
      float present=texture2D(materialColor,surfaceUV).a;
      float detail=texture2D(materialHeight,surfaceUV).r-.5;
      float sway=(field.r-.5)*.5+(field.b-.5)*.16+detail*present*.08;
      vec3 p=position+normal*sway*fold.w;
      vec4 view=modelViewMatrix*vec4(p,1.);P=view.xyz;N=normalize(normalMatrix*normal);
      gl_Position=projectionMatrix*view;}`,
    fragmentShader: `uniform sampler2D pigment,displacementNoise,materialColor;uniform float time;varying vec2 U;varying vec3 C,N,P;varying vec4 F;
    float heightAt(vec2 uv){
      vec2 flow=texture2D(displacementNoise,uv*.35+vec2(time*.006,F.z*.071)).rb-.5;
      vec2 q=vec2(.12+fract(uv.x*1.7+F.z*.11+flow.x*.09)*.76,clamp(.12+uv.y*.76+flow.y*.07,.03,.97));
      return texture2D(pigment,vec2((F.x+q.x)/${PIGMENT_COLUMNS}.,q.y)).a;
    }
    void main(){
      float h=heightAt(U);
      vec3 n=normalize(N);
      float light=.72+.28*abs(dot(n,normalize(vec3(-.55,.8,.9))));
      float naturalGrain=texture2D(displacementNoise,U*vec2(2.,1.4)+F.z*.13).g;
      float pigment=(.62+.58*h)*(.83+naturalGrain*.32);
      vec2 surfaceUV=vec2((F.x+.01+fract(U.x*1.7+F.z*.11)*.98)/${PIGMENT_COLUMNS}.,.01+U.y*.98);
      vec4 matter=texture2D(materialColor,surfaceUV);
      vec3 lit=mix(C,matter.rgb,matter.a*.72)*pigment*light;
      float wetEdge=(texture2D(displacementNoise,vec2(U.x*.7+F.z*.17,U.y*.13)).b-.5)*.11;
      float edge=smoothstep(0.,.17,U.y+wetEdge)*(1.-smoothstep(.83,1.,U.y+wetEdge));
      float ends=smoothstep(0.,.07,U.x)*(1.-smoothstep(.93,1.,U.x));
      float alpha=F.y*edge*ends*(.08+h*.88);
      if(alpha<.008)discard;
      gl_FragColor=vec4(lit,alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  material.name = "MAT_Watercolor_NaturalGrain";
  material.userData.style = "Shader_Organic_Fluid";
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "Mesh_AudioWave_Organic";
  mesh.frustumCulled = false;
  const center = new THREE.Vector3(),
    tangent = new THREE.Vector3(),
    radial = new THREE.Vector3(),
    across = new THREE.Vector3(),
    up = new THREE.Vector3(0, 1, 0),
    p = new THREE.Vector3(),
    n = new THREE.Vector3(),
    color = new THREE.Color();
  const at = (q, r) => {
    const a = q.x * Math.PI * 2,
      t = (0.04 + q.y * 0.92) * Math.PI;
    return new THREE.Vector3(
      -Math.cos(a) * Math.sin(t) * r,
      Math.cos(t) * r,
      Math.sin(a) * Math.sin(t) * r,
    );
  };
  return {
    mesh,
    setMaterials(value) {
      external.setMaterials(value);
      material.uniforms.materialColor.value = external.color;
      material.uniforms.materialHeight.value = external.height;
    },
    setDocument(strokes) {
      let vertices = 0;
      const per = Math.max(
        2,
        Math.floor(maxSegments / Math.max(1, strokes.length)),
      );
      for (const s of strokes) {
        if (!s.points.length) continue;
        const family = Math.max(
            0,
            SQUIGGLE_BRUSHES.findIndex((b) => b.id === s.emotionId),
          ),
          seed = s.id * 1.73;
        color.set(s.color || "#507b98");
        const control = [];
        for (const q of s.points) {
          const point = at(q, SCULPT_RADIUS);
          if (
            !control.length ||
            point.distanceToSquared(control.at(-1)) > 0.000001
          )
            control.push(point);
        }
        // A tap deposits an open wash with an area, never a solid bead.
        if (control.length === 1) {
          const a = control[0];
          radial.copy(a).normalize();
          tangent.crossVectors(up, radial);
          if (tangent.lengthSq() < 0.00001) tangent.set(1, 0, 0);
          tangent
            .normalize()
            .multiplyScalar(Math.max(0.04, (s.size / 768) * 5));
          control.unshift(a.clone().sub(tangent));
          control.push(a.clone().add(tangent));
        }
        const curve = new THREE.CatmullRomCurve3(control, false, "centripetal");
        const count = Math.min(
          per,
          Math.max(8, Math.min(120, Math.ceil(curve.getLength() * 6))),
        );
        const rows = [];
        for (let i = 0; i <= count; i++) {
          const u = i / count;
          curve.getPointAt(u, center);
          curve.getTangentAt(u, tangent).normalize();
          radial.copy(center).normalize();
          across.crossVectors(radial, tangent);
          if (across.lengthSq() < 0.00001) across.crossVectors(radial, up);
          if (across.lengthSq() < 0.00001) across.set(1, 0, 0);
          across.normalize();
          radial.crossVectors(tangent, across).normalize();
          const taper = 0.13 + 0.87 * Math.pow(Math.sin(u * Math.PI), 0.3);
          const width =
            Math.max(0.035, (s.size / 768) * 6.8) *
            taper *
            (0.9 + 0.1 * Math.sin(u * 12 + seed));
          center.addScaledVector(radial, Math.sin(u * 5 + seed) * width * 0.35);
          const row = [];
          for (let j = 0; j <= sides; j++) {
            const v = (j / sides) * 2 - 1;
            const phase = u * 8 + v * 2.8 + seed;
            const fold =
              Math.sin(phase) * width * 0.38 +
              Math.sin(v * Math.PI) * width * 0.16;
            const derivative =
              Math.cos(phase) * 2.8 * 0.38 +
              Math.cos(v * Math.PI) * Math.PI * 0.16;
            p.copy(center)
              .addScaledVector(across, v * width)
              .addScaledVector(radial, fold);
            n.copy(radial).addScaledVector(across, -derivative).normalize();
            row.push({ p: p.clone(), n: n.clone() });
          }
          rows.push(row);
        }
        const write = (position, normal, u, v) => {
          buffers.position.set(position.toArray(), vertices * 3);
          buffers.normal.set(normal.toArray(), vertices * 3);
          buffers.color.set([color.r, color.g, color.b], vertices * 3);
          buffers.uv.set([u, v], vertices * 2);
          buffers.fold.set(
            [family, s.opacity, seed, s.size / 48],
            vertices * 4,
          );
          vertices++;
        };
        const emit = (row, side, uvSide) => {
          const sample = rows[row][side];
          write(sample.p, sample.n, row / count, uvSide / sides);
        };
        for (let i = 0; i < count && vertices + sides * 6 <= maxVertices; i++)
          for (let j = 0; j < sides; j++) {
            emit(i, j, j);
            emit(i + 1, j, j);
            emit(i, j + 1, j + 1);
            emit(i, j + 1, j + 1);
            emit(i + 1, j, j);
            emit(i + 1, j + 1, j + 1);
          }
      }
      geometry.setDrawRange(0, vertices);
      for (const a of Object.values(geometry.attributes)) {
        a.clearUpdateRanges();
        if (vertices) {
          a.addUpdateRange(0, vertices * a.itemSize);
          a.needsUpdate = true;
        }
      }
    },
    update(t) {
      material.uniforms.time.value = t;
    },
    get vertices() {
      return geometry.drawRange.count;
    },
    get capacity() {
      return maxVertices;
    },
    dispose() {
      external.dispose();
      noiseTexture.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}
