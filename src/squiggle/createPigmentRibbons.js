import * as THREE from "three";
import { PIGMENT_COLUMNS, PIGMENT_CELL } from "./pigmentAtlas.js";
import { SQUIGGLE_BRUSHES, SCULPT_RADIUS } from "./brushes.js";

/** Closed, softly corrugated pigment bodies. Buffers are allocated once. */
export function createPigmentRibbons(texture, { mobile = false } = {}) {
  const maxSegments = mobile ? 700 : 1400,
    sides = mobile ? 8 : 12;
  const maxVertices = (maxSegments + 120) * sides * 6;
  const geometry = new THREE.BufferGeometry();
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
    depthWrite: true,
    side: THREE.FrontSide,
    vertexColors: true,
    uniforms: { pigment: { value: texture }, time: { value: 0 } },
    vertexShader: `attribute vec4 fold;uniform float time;varying vec2 U;varying vec3 C,N,P;varying vec4 F;
    void main(){U=uv;C=color;F=fold;
      float sway=sin(uv.x*6.+time*.32+fold.z)*.07+sin(uv.x*13.-time*.21+fold.z)*.025;
      vec3 p=position+normal*sway*fold.w;
      vec4 view=modelViewMatrix*vec4(p,1.);P=view.xyz;N=normalize(normalMatrix*normal);
      gl_Position=projectionMatrix*view;}`,
    fragmentShader: `uniform sampler2D pigment;uniform float time;varying vec2 U;varying vec3 C,N,P;varying vec4 F;
    float heightAt(vec2 uv){
      vec2 q=vec2(.12+fract(uv.x*1.7+F.z*.11)*.76,.12+uv.y*.76);
      return texture2D(pigment,vec2((F.x+q.x)/${PIGMENT_COLUMNS}.,q.y)).a;
    }
    void main(){
      float h=heightAt(U);
      float du=heightAt(U+vec2(.003,0.))-heightAt(U-vec2(.003,0.));
      float dv=heightAt(U+vec2(0.,.003))-heightAt(U-vec2(0.,.003));
      vec3 n=normalize(N);
      vec3 dp1=dFdx(P),dp2=dFdy(P);vec2 st1=dFdx(U),st2=dFdy(U);
      vec3 tangent=dp1*st2.y-dp2*st1.y,bitangent=-dp1*st2.x+dp2*st1.x;
      vec3 t=tangent/max(length(tangent),.00001),b=bitangent/max(length(bitangent),.00001);
      n=normalize(n-t*du*.7-b*dv*.7);
      vec3 light=normalize(vec3(-.55,.8,.9)), fill=normalize(vec3(.7,-.2,.5));
      float diffuse=max(0.,dot(n,light)), reflected=max(0.,dot(n,fill));
      float pockets=smoothstep(.04,.55,h), sediment=pow(h,.65);
      float occlusion=.7+.3*pockets;
      vec3 pigmentColor=C*(.7+.4*sediment);
      vec3 lit=pigmentColor*(.55+diffuse*.75+reflected*.17)*occlusion;
      float rim=pow(1.-max(0.,dot(n,normalize(-P))),2.5);
      float wet=pow(max(0.,dot(n,normalize(light+normalize(-P)))),24.)*.035;
      lit+=mix(C,vec3(.96,.91,.8),.18)*(rim*.09+wet);
      float grain=fract(sin(dot(floor(U*${PIGMENT_CELL}.),vec2(12.9898,78.233)))*43758.5453);
      lit*=.92+.12*grain;
      float alpha=F.y*(.84+.16*pockets);
      if(alpha<.015)discard;
      gl_FragColor=vec4(lit,alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
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
        // A single tap is a compact bead of pigment, not a missing surface.
        if (control.length === 1) {
          const a = control[0];
          control.unshift(a.clone().add(new THREE.Vector3(-0.018, 0, 0)));
          control.push(a.clone().add(new THREE.Vector3(0.018, 0, 0)));
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
          const height =
            width * [0.34, 0.52, 0.68, 0.28, 0.75, 0.45, 0.62, 0.25][family];
          center.addScaledVector(radial, Math.sin(u * 5 + seed) * width * 0.65);
          const row = [];
          for (let j = 0; j < sides; j++) {
            const angle = (j / sides) * Math.PI * 2,
              fold = 1 + 0.1 * Math.sin(u * 21 + angle * 3 + seed);
            p.copy(center)
              .addScaledVector(across, Math.cos(angle) * width * fold)
              .addScaledVector(radial, Math.sin(angle) * height * fold);
            n.copy(across)
              .multiplyScalar(Math.cos(angle) / width)
              .addScaledVector(radial, Math.sin(angle) / Math.max(0.01, height))
              .normalize();
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
          const sample = rows[row][side % sides];
          write(sample.p, sample.n, row / count, uvSide / sides);
        };
        for (let i = 0; i < count && vertices + sides * 6 <= maxVertices; i++)
          for (let j = 0; j < sides; j++) {
            emit(i, j, j);
            emit(i, j + 1, j + 1);
            emit(i + 1, j, j);
            emit(i, j + 1, j + 1);
            emit(i + 1, j + 1, j + 1);
            emit(i + 1, j, j);
          }
        if (vertices + sides * 6 <= maxVertices)
          for (const end of [0, count]) {
            center.set(0, 0, 0);
            for (const sample of rows[end]) center.add(sample.p);
            center.multiplyScalar(1 / sides);
            curve
              .getTangentAt(end / count, tangent)
              .normalize()
              .multiplyScalar(end === 0 ? -1 : 1);
            for (let j = 0; j < sides; j++) {
              const first = end === 0 ? j + 1 : j,
                second = end === 0 ? j : j + 1;
              write(center, tangent, end / count, 0.5);
              write(
                rows[end][first % sides].p,
                tangent,
                end / count,
                first / sides,
              );
              write(
                rows[end][second % sides].p,
                tangent,
                end / count,
                second / sides,
              );
            }
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
      geometry.dispose();
      material.dispose();
    },
  };
}
