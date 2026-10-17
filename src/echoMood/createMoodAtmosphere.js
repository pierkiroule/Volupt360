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
  const group = new THREE.Group();
  const skyGeometry = new THREE.SphereGeometry(220, 32, 16);
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      time: { value: 0 },
      paper: { value: new THREE.Color(universe.background) },
      sky: { value: new THREE.Color(universe.skyColor || universe.color) },
      horizon: {
        value: new THREE.Color(universe.horizonColor || universe.color),
      },
      fluidity: { value: universe.fluidity },
    },
    vertexShader: `varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 direction;uniform float time,fluidity;uniform vec3 paper,sky,horizon;
      void main(){vec3 d=normalize(direction);float drift=time*.008;
      float wash=sin(d.x*5.+sin(d.z*4.+drift)*1.2+d.y*3.)*.5+.5;
      float grain=sin(d.x*171.+sin(d.z*137.))*sin(d.y*159.+d.z*91.);
      float veil=smoothstep(.2,.9,wash)*(.12+fluidity*.08);
      vec3 pigment=mix(horizon,sky,smoothstep(-.25,.8,d.y));
      vec3 c=mix(paper,pigment,veil+exp(-abs(d.y)*4.)*.09+grain*.008);
      gl_FragColor=vec4(c,1.);
      #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(skyGeometry, skyMaterial);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  group.add(sky, object);
  return {
    object: group,
    update(time, audio) {
      skyMaterial.uniforms.time.value = time * universe.speed;
      material.uniforms.time.value = time * universe.speed;
      material.uniforms.energy.value = audio.energy || 0;
    },
    dispose() {
      group.removeFromParent();
      skyGeometry.dispose();
      skyMaterial.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}
