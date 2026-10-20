import * as THREE from "three";
import { PIGMENT_COLUMNS } from "./pigmentAtlas.js";
import { SQUIGGLE_BRUSHES } from "./brushes.js";
/** One shared geometry for gently folded, double-sided pigment membranes. */
export function createPigmentRibbons(texture, { mobile = false } = {}) {
  const maxSegments = mobile ? 700 : 1400,
    maxVertices = maxSegments * 6;
  const geometry = new THREE.BufferGeometry();
  const buffers = {
    position: new Float32Array(maxVertices * 3),
    normal: new Float32Array(maxVertices * 3),
    color: new Float32Array(maxVertices * 3),
    uv: new Float32Array(maxVertices * 2),
    fold: new Float32Array(maxVertices * 2),
  };
  for (const [name, buffer] of Object.entries(buffers))
    geometry.setAttribute(
      name,
      new THREE.BufferAttribute(
        buffer,
        name === "uv" || name === "fold" ? 2 : 3,
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
      time: { value: 0 },
    },
    vertexShader: `attribute vec2 fold;uniform float time;varying vec2 U;varying vec3 C;varying vec2 F;
    void main(){U=uv;C=color;F=fold;vec3 p=position;
      float w=sin(uv.x*7.+time*.24+fold.x)*sin(uv.y*3.14159);
      p+=normal*(w*.19+sin(uv.x*3.1-time*.17+fold.x)*.1);
      gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `uniform sampler2D pigment;uniform float time;varying vec2 U;varying vec3 C;varying vec2 F;
    void main(){float drift=sin(U.x*4.+time*.18+F.x)*.035;
      vec2 q=vec2(.16+fract(U.x*.12+F.x*.17)*.65,clamp(U.y+drift,0.,1.));
      float grain=texture2D(pigment,vec2((mod(F.x,${PIGMENT_COLUMNS}.)+q.x)/${PIGMENT_COLUMNS}.,q.y)).a;
      float edge=sin(U.y*3.14159);float endFade=smoothstep(0.,.1,U.x)*(1.-smoothstep(.9,1.,U.x));
      float sediment=pow(abs(sin(U.y*18.+sin(U.x*6.+F.x)*2.)),12.);
      float a=grain*edge*endFade*F.y*(.5+sediment*.9);
      if(a<.003)discard;gl_FragColor=vec4(C*(.72+sediment*.2),a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const centre = new THREE.Vector3(),
    prior = new THREE.Vector3(),
    next = new THREE.Vector3(),
    tangent = new THREE.Vector3(),
    side = new THREE.Vector3(),
    radial = new THREE.Vector3(),
    up = new THREE.Vector3(0, 1, 0),
    color = new THREE.Color();
  const at = (p, r, out) => {
    const a = p.x * Math.PI * 2,
      t = (0.04 + p.y * 0.92) * Math.PI;
    return out.set(
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
        if (s.points.length < 2) continue;
        color.set(s.color || "#507b98");
        const count = Math.min(
          per,
          Math.max(8, Math.min(80, s.points.length * 2)),
        );
        const rows = [];
        for (let i = 0; i <= count; i++) {
          const progress = (i / count) * (s.points.length - 1),
            index = Math.floor(progress),
            f = progress - index;
          const a = s.points[index],
            b = s.points[Math.min(index + 1, s.points.length - 1)];
          at(
            { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f },
            7.65,
            centre,
          );
          at(s.points[Math.max(0, index - 1)], 7.65, prior);
          at(s.points[Math.min(s.points.length - 1, index + 1)], 7.65, next);
          tangent.subVectors(next, prior).normalize();
          radial.copy(centre).normalize();
          side.crossVectors(radial, tangent);
          if (side.lengthSq() < 0.0001) side.crossVectors(radial, up);
          side.normalize();
          const width =
            (s.size / 768) * 8 * (0.7 + 0.15 * Math.sin(i * 0.35 + s.id));
          rows.push(
            [-1, 1].map((sign) =>
              centre
                .clone()
                .addScaledVector(side, width * sign)
                .addScaledVector(radial, Math.sin(i * 0.23 + s.id) * 0.12),
            ),
          );
        }
        for (let i = 0; i < count && vertices + 6 <= maxVertices; i++)
          for (const [row, edge] of [
            [i, 0],
            [i, 1],
            [i + 1, 0],
            [i + 1, 0],
            [i, 1],
            [i + 1, 1],
          ]) {
            const p = rows[row][edge];
            buffers.position.set([p.x, p.y, p.z], vertices * 3);
            radial.copy(p).normalize();
            buffers.normal.set([radial.x, radial.y, radial.z], vertices * 3);
            buffers.color.set([color.r, color.g, color.b], vertices * 3);
            buffers.uv.set([row / count, edge], vertices * 2);
            buffers.fold.set(
              [
                Math.max(
                  0,
                  SQUIGGLE_BRUSHES.findIndex((b) => b.id === s.emotionId),
                ),
                s.opacity,
              ],
              vertices * 2,
            );
            vertices++;
          }
      }
      geometry.setDrawRange(0, vertices);
      for (const a of Object.values(geometry.attributes)) a.needsUpdate = true;
    },
    update(t) {
      material.uniforms.time.value = t;
    },
    get vertices() {
      return geometry.drawRange.count;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
