import * as THREE from "three";
export function createChillSky() {
  const geometry = new THREE.SphereGeometry(220, 40, 20);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { progress: { value: 0 }, time: { value: 0 } },
    vertexShader: `varying vec3 d;void main(){d=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 d;uniform float progress,time;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 void main(){vec3 v=normalize(d);float night=smoothstep(.1,1.,progress);
 vec3 zenith=mix(vec3(.09,.19,.32),vec3(.004,.009,.025),night);
 vec3 horizon=mix(vec3(.62,.26,.12),vec3(.025,.035,.07),night);
 float wash=sin(v.x*8.+sin(v.z*9.)+v.y*12.)*.012;
 vec3 color=mix(horizon,zenith,smoothstep(-.02,.75,v.y))+wash;
 vec3 sunDir=normalize(vec3(-.15,mix(.18,-.18,progress),.99));
 float sunDist=length(v-sunDir);
 color+=vec3(1.,.48,.18)*exp(-sunDist*sunDist*19.)*.22*(1.-night);
 float sun=(1.-smoothstep(.029,.036,sunDist))*(1.-smoothstep(.65,.95,progress));
 color=mix(color,vec3(1.,.87,.58),sun);
 {float depth=1.-smoothstep(-.7,-.025,v.y);
 vec3 water=mix(mix(vec3(.045,.105,.16),vec3(.025,.07,.12),depth),vec3(.003,.009,.02),night*.85);
 float waves=sin(v.y*240.+sin(v.x*70.+time*.15)*1.5+time*.25)*.5+.5;
 float reflection=exp(-pow((v.x-sunDir.x)*5.,2.))*exp(-abs(v.y)*8.);
 water+=vec3(.65,.35,.15)*reflection*waves*.16*(1.-night);
 color=mix(color,water,1.-smoothstep(-.04,-.018,v.y));
 }
 vec2 uv=vec2(atan(v.z,v.x)/6.2831853+.5,asin(v.y)/3.14159+.5);
 vec2 cell=floor(uv*vec2(150.,80.)),f=fract(uv*vec2(150.,80.))-.5;
 float star=(1.-smoothstep(.025,.16,length(f)))*step(.987,hash(cell))*smoothstep(.08,.3,v.y)*smoothstep(.35,.95,progress);
 color+=vec3(.7,.8,1.)*star;
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
