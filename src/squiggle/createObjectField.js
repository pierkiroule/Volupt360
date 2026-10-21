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
    for (const layer of e.mesh.children) layer.material.dispose();
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
            flow: { value: item.flow ?? 1 },
            resonance: { value: 0 },
            tint: { value: new THREE.Color(item.color) },
            opacity: { value: item.opacity },
            layer: { value: 1 },
          },
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          forceSinglePass: true,
          blending: THREE.AdditiveBlending,
          vertexShader: `uniform float time,seed,flow,resonance;varying vec2 U;varying vec3 N,V;
          void main(){U=uv;
          float wave=sin(position.y*2.8+position.x*2.+time*.32*flow+seed)*.13
           +sin(position.z*3.2-position.y*1.7-time*.24*flow+seed)*.075;
          vec3 p=position+normalize(position)*wave*(1.+resonance*.45);
          vec4 view=modelViewMatrix*vec4(p,1.);N=normalize(normalMatrix*normal);V=-view.xyz;gl_Position=projectionMatrix*view;}`,
          fragmentShader: `uniform sampler2D surface;uniform vec3 tint;uniform float opacity,time,seed,layer;varying vec2 U;varying vec3 N,V;
          void main(){
          vec3 n=normalize(N);
          vec2 drift=vec2(sin(U.y*9.+time*.17+seed),cos(U.x*8.-time*.13+seed))*.035;
          vec4 wash=texture2D(surface,U+drift);
          float facing=abs(dot(n,normalize(V)));
          float soft=pow(smoothstep(0.,.75,facing),1.4);
          float stream=.72+.28*sin(U.x*17.+U.y*11.+time*.23+seed);
          float alpha=opacity*wash.a*soft*stream*.38*layer;
          gl_FragColor=vec4(mix(wash.rgb,tint,.18)*(.88+facing*.16),alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          }`,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = "Liquid_Pigment_Cloud";
        // Shared geometry and color map, only one extra draw call on mobile.
        for (let i = 0; i < (mobile ? 1 : 2); i++) {
          const innerMaterial = material.clone();
          innerMaterial.uniforms.surface.value = texture;
          innerMaterial.uniforms.seed.value = profile.seed + i * 2.3;
          innerMaterial.uniforms.layer.value = 0.65;
          const veil = new THREE.Mesh(geometry, innerMaterial);
          veil.scale.setScalar(0.7 - i * 0.16);
          veil.rotation.set(0.3 + i, 0.5 + i * 0.7, 0.2);
          mesh.add(veil);
        }
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
        .multiplyScalar(item.radius ?? SCULPT_RADIUS);
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
    update(time, resonance = 0) {
      for (const e of entries.values()) {
        const phase = time * 0.18 + e.profile.seed;
        e.mesh.position
          .copy(e.base)
          .multiplyScalar(1 + Math.sin(phase) * 0.012);
        e.mesh.quaternion.copy(e.orientation);
        e.mesh.rotateY(Math.sin(phase * 0.7) * 0.18);
        e.mesh.rotateZ(Math.sin(phase) * 0.08);
        e.mesh.material.uniforms.time.value = time;
        e.mesh.material.uniforms.resonance.value = resonance;
        for (const layer of e.mesh.children) {
          layer.material.uniforms.time.value = time;
          layer.material.uniforms.resonance.value = resonance;
          layer.rotation.y = time * 0.035 + e.profile.seed;
          layer.rotation.z = Math.sin(phase * 0.8) * 0.14;
        }
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
