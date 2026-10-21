import * as THREE from "three";

/** Readable local images on open, gently deforming sheets; never spheres or remote assets. */
export function createImageVeils() {
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
      ...new Set(Object.values(materials).filter((s) => s?.canvas)),
    ].slice(0, 8);
    if (!sources.length) return;
    geometry = new THREE.PlaneGeometry(1, 1, 24, 18);
    sources.forEach((source, i) => {
      const texture = new THREE.CanvasTexture(source.canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      textures.push(texture);
      const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        forceSinglePass: true,
        uniforms: {
          image: { value: texture },
          time: { value: 0 },
          energy: { value: 0 },
          phase: { value: i * 2.399 },
        },
        vertexShader: `uniform float time,energy,phase;varying vec2 U;
          void main(){U=uv;vec3 p=position;
          p.z+=sin(p.x*5.+time*.27+phase)*cos(p.y*3.-time*.19)*(.035+energy*.075);
          gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
        fragmentShader: `uniform sampler2D image;uniform float phase;varying vec2 U;
          void main(){vec4 photo=texture2D(image,U);
          float fiber=sin(U.x*103.+sin(U.y*47.+phase))*sin(U.y*89.+phase);
          float border=min(min(U.x,1.-U.x),min(U.y,1.-U.y));
          float mask=smoothstep(.012,.115,border+fiber*.012);
          vec3 color=mix(vec3(.95,.93,.88),photo.rgb,.92);
          gl_FragColor=vec4(color,mask*photo.a*.9);
          #include <colorspace_fragment>
        }`,
      });
      const mesh = new THREE.Mesh(geometry, material);
      const angle = i * 2.399;
      const base = new THREE.Vector3(
        Math.sin(angle) * 3.2,
        Math.sin(i * 1.7) * 1.7,
        Math.cos(angle) * 2.4 - 1.8,
      );
      mesh.scale.set(2.4 + (i % 2) * 0.4, 2.4 + (i % 2) * 0.4, 1);
      mesh.position.copy(base);
      mesh.name = "Local_Image_Veil_" + (source.name || source.id || i);
      group.add(mesh);
      entries.push({ mesh, base, phase: i * 2.399 });
    });
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
        e.mesh.position.y += Math.sin(time * 0.12 + e.phase) * 0.18;
        e.mesh.lookAt(camera.position);
        e.mesh.rotateZ(Math.sin(time * 0.08 + e.phase) * 0.06);
        e.mesh.material.uniforms.time.value = time;
        e.mesh.material.uniforms.energy.value = sound.mid || 0;
      }
    },
    dispose: clear,
  };
}
