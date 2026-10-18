import * as THREE from "three";

/** Continuous spherical paper and pigment washes: no horizon or figurative scenery. */
export function createChillSky() {
  const geometry = new THREE.SphereGeometry(220, 32, 16);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { progress: { value: 0 }, time: { value: 0 } },
    vertexShader: `varying vec3 d;void main(){d=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 d;uniform float progress,time;
 float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
 float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash(i),hash(i+vec3(1.,0.,0.)),f.x),mix(hash(i+vec3(0.,1.,0.)),hash(i+vec3(1.,1.,0.)),f.x),f.y),mix(mix(hash(i+vec3(0.,0.,1.)),hash(i+vec3(1.,0.,1.)),f.x),mix(hash(i+vec3(0.,1.,1.)),hash(i+vec3(1.,1.,1.)),f.x),f.y),f.z);}
 void main(){vec3 v=normalize(d);float drift=time*.003;
 vec3 p=v*3.2+vec3(drift,-drift*.6,0.);
 float broad=noise(p+noise(p*1.8)*.8), detail=noise(p*5.5), grain=hash(floor(v*1800.));
 vec3 paper=mix(vec3(.89,.855,.79),vec3(.83,.835,.87),progress*.55);
 vec3 blue=vec3(.32,.52,.57), rose=vec3(.68,.43,.43), lavender=vec3(.48,.43,.59);
 vec3 pigment=mix(blue,mix(rose,lavender,progress),smoothstep(.32,.72,noise(p+7.)));
 float wash=smoothstep(.42,.82,broad)*.19;
 float edge=exp(-abs(broad-.57)*70.)*.022;
 vec3 color=mix(paper,pigment,wash+edge+detail*.018);
 color-=(grain-.5)*.014+detail*.006;
 gl_FragColor=vec4(color,1.);
 #include <colorspace_fragment>
 }`,
  });
  const object = new THREE.Mesh(geometry, material);
  object.frustumCulled = false;
  object.renderOrder = -20;
  return {
    object,
    update(time, audio, progress = 0) {
      material.uniforms.time.value = time;
      material.uniforms.progress.value = progress;
    },
    dispose() {
      object.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}
