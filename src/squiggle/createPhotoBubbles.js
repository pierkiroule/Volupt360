import * as THREE from "three";
/** Shared local image maps, readable photos on gently floating spherical lenses. */
export function createPhotoBubbles() {
  const group = new THREE.Group(),
    entries = [],
    textures = [];
  let geometry = null;
  function clear() {
    for (const entry of entries) entry.mesh.material.dispose();
    for (const texture of textures) texture.dispose();
    geometry?.dispose();
    geometry = null;
    entries.length = textures.length = 0;
    group.clear();
  }
  function setMaterials(materials) {
    clear();
    const sources = [
      ...new Set(Object.values(materials).filter(Boolean)),
    ].slice(0, 6);
    if (!sources.length) return;
    geometry = new THREE.SphereGeometry(1, 32, 24);
    for (const source of sources) {
      const map = new THREE.CanvasTexture(source.canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      textures.push(map);
    }
    const count = Math.min(8, sources.length * 2);
    for (let i = 0; i < count; i++) {
      const source = i % sources.length,
        angle = i * 2.39996323 + 0.3,
        radius = 3.6 + (i % 3) * 0.75;
      const base = new THREE.Vector3(
        Math.sin(angle) * radius,
        Math.sin(i * 1.7) * 1.65,
        Math.cos(angle) * radius,
      );
      const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { photo: { value: textures[source] }, energy: { value: 0 } },
        vertexShader: `varying vec3 P,N,V;void main(){P=position;N=normalize(normalMatrix*normal);vec4 view=modelViewMatrix*vec4(position,1.);V=-view.xyz;gl_Position=projectionMatrix*view;}`,
        fragmentShader: `uniform sampler2D photo;uniform float energy;varying vec3 P,N,V;
    void main(){float facing=max(0.,dot(normalize(N),normalize(V)));float rim=pow(1.-facing,3.);
    vec2 uv=P.xy*.5+.5;vec4 image=texture2D(photo,uv);
    vec3 color=mix(image.rgb,vec3(.95,.93,.88),rim*.32);
    float sheen=pow(max(0.,dot(normalize(N),normalize(vec3(-.5,.8,1.)))),24.)*.055;
    color+=vec3(.95,.93,.88)*sheen;
    float fiber=sin(P.x*91.+sin(P.y*47.))*sin(P.y*83.+P.z*31.);
    float edge=smoothstep(.02,.23,facing+fiber*.045);
    gl_FragColor=vec4(color,(.94-rim*.36)*image.a*edge);
    #include <colorspace_fragment>
    }`,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = "Photo_Bubble_" + sources[source].name;
      mesh.scale.setScalar(0.65 + (i % 2) * 0.12);
      mesh.position.copy(base);
      group.add(mesh);
      entries.push({ mesh, base, phase: i * 2.13 });
    }
  }
  return {
    group,
    setMaterials,
    get count() {
      return entries.length;
    },
    update(time, camera, sound = {}) {
      for (const e of entries) {
        e.mesh.position.copy(e.base);
        e.mesh.position.y += Math.sin(time * 0.17 + e.phase) * 0.22;
        // Face the visitor with the image centred, rather than stretching it around a UV seam.
        e.mesh.lookAt(camera.position);
        e.mesh.material.uniforms.energy.value = sound.energy || 0;
      }
    },
    dispose: clear,
  };
}
