import * as THREE from "three";
import {
  createObjectMatter,
  objectProfile,
  objectRadius,
} from "./objectMatter.js";
import { SCULPT_RADIUS } from "./brushes.js";
/** One bounded surface per placed object; no per-frame texture generation. */
export function createObjectField({ mobile = false } = {}) {
  const group = new THREE.Group(),
    entries = new Map();
  let materials = {},
    items = [];
  const disposeEntry = (e) => {
    e.mesh.geometry.dispose();
    e.mesh.material.dispose();
    e.texture.dispose();
    e.matter.dispose();
    group.remove(e.mesh);
  };
  function sync() {
    const ids = new Set(items.map((s) => s.id));
    for (const [id, e] of entries)
      if (!ids.has(id)) {
        disposeEntry(e);
        entries.delete(id);
      }
    for (const item of items) {
      const key = [item.color, item.emotionId, item.size, item.opacity].join(
        ":",
      );
      let e = entries.get(item.id);
      if (e?.key !== key) {
        if (e) disposeEntry(e);
        const profile = objectProfile(item);
        const matter = createObjectMatter(item, materials[item.emotionId]);
        const texture = new THREE.CanvasTexture(matter.canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const geometry = new THREE.SphereGeometry(
          1,
          mobile ? 28 : 40,
          mobile ? 20 : 28,
        );
        const pos = geometry.attributes.position,
          v = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i);
          const theta = Math.atan2(v.z, v.x),
            phi = Math.acos(THREE.MathUtils.clamp(v.y, -1, 1));
          v.multiplyScalar(
            objectRadius(theta, phi, profile.seed, profile.family),
          );
          pos.setXYZ(i, v.x, v.y, v.z);
        }
        geometry.computeVertexNormals();
        const material = new THREE.ShaderMaterial({
          uniforms: {
            surface: { value: texture },
            time: { value: 0 },
            seed: { value: profile.seed },
            tint: { value: new THREE.Color(item.color) },
            opacity: { value: item.opacity },
          },
          transparent: true,
          depthWrite: false,
          vertexShader: `uniform float time,seed;varying vec2 U;varying vec3 N,V;
          void main(){U=uv;vec3 p=position+normal*sin(position.y*3.+position.x*2.+time*.45+seed)*.035;
          vec4 view=modelViewMatrix*vec4(p,1.);N=normalize(normalMatrix*normal);V=-view.xyz;gl_Position=projectionMatrix*view;}`,
          fragmentShader: `uniform sampler2D surface;uniform vec3 tint;uniform float opacity;varying vec2 U;varying vec3 N,V;
          void main(){vec3 n=normalize(N);float light=.45+.7*max(0.,dot(n,normalize(vec3(-.4,.6,.8))));
          float rim=pow(1.-max(0.,dot(n,normalize(V))),2.)*.38;
          gl_FragColor=vec4(texture2D(surface,U).rgb*light+tint*rim,opacity);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          }`,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = "Weathered_Luminous_Object";
        const size =
          ((item.size / 768) * SCULPT_RADIUS * Math.PI * 2 * 2.4) / 2.65;
        mesh.scale.set(
          size * profile.stretch[0],
          size * profile.stretch[1],
          size * 0.72,
        );
        e = { key, mesh, texture, matter, profile, base: new THREE.Vector3() };
        entries.set(item.id, e);
        group.add(mesh);
      }
      const p = item.points.at(-1);
      if (!p) continue;
      const a = p.x * Math.PI * 2,
        t = (0.04 + p.y * 0.92) * Math.PI;
      e.base
        .set(-Math.cos(a) * Math.sin(t), Math.cos(t), Math.sin(a) * Math.sin(t))
        .multiplyScalar(SCULPT_RADIUS);
      e.mesh.position.copy(e.base);
      e.mesh.lookAt(0, 0, 0);
      e.orientation = e.mesh.quaternion.clone();
    }
  }
  return {
    group,
    setDocument(value) {
      items = value.slice(0, 120);
      sync();
    },
    setMaterials(value) {
      materials = value;
      for (const e of entries.values()) disposeEntry(e);
      entries.clear();
      sync();
    },
    update(time) {
      for (const e of entries.values()) {
        const phase = time * 0.18 + e.profile.seed;
        e.mesh.position
          .copy(e.base)
          .multiplyScalar(1 + Math.sin(phase) * 0.012);
        e.mesh.quaternion.copy(e.orientation);
        e.mesh.rotateY(Math.sin(phase * 0.7) * 0.18);
        e.mesh.rotateZ(Math.sin(phase) * 0.08);
        e.mesh.material.uniforms.time.value = time;
      }
    },
    get count() {
      return entries.size;
    },
    dispose() {
      for (const e of entries.values()) disposeEntry(e);
      entries.clear();
    },
  };
}
