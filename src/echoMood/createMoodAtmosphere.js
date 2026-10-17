import * as THREE from "three";
export function createMoodAtmosphere(universe, mobile) {
  const count = mobile ? 48 : 96,
    positions = new Float32Array(count * 3);
  let state = universe.seed || 1;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let i = 0; i < count; i++) {
    const a = random() * Math.PI * 2,
      y = random() * 2 - 1,
      r = 14 + random() * 17,
      s = Math.sqrt(1 - y * y);
    positions.set([Math.cos(a) * s * r, y * r, Math.sin(a) * s * r], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      time: { value: 0 },
      energy: { value: 0 },
      color: { value: new THREE.Color(universe.color) },
    },
    vertexShader: `uniform float time,energy;void main(){vec3 p=position+vec3(sin(time*.09+position.z),cos(time*.07+position.x),sin(time*.05+position.y))*(.2+energy*.5);vec4 v=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp((90.+energy*60.)/max(1.,-v.z),1.,15.);gl_Position=projectionMatrix*v;}`,
    fragmentShader:
      `uniform vec3 color;void main(){float d=length(gl_PointCoord-.5)*2.;float a=(1.-smoothstep(.05,1.,d))*.07;if(a<.002)discard;gl_FragColor=vec4(color,a);#include <colorspace_fragment>}`
        .replace(";#include", ";\n#include")
        .replace("<colorspace_fragment>}", "<colorspace_fragment>\n}"),
  });
  const object = new THREE.Points(geometry, material);
  object.frustumCulled = false;
  return {
    object,
    update(time, audio) {
      material.uniforms.time.value = time * universe.speed;
      material.uniforms.energy.value = audio.energy || 0;
    },
    dispose() {
      object.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}
