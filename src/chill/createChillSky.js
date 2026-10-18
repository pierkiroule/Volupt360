import { createWatercolorAlpha } from "./createWatercolorAlpha.js";
import * as THREE from "three";

/** Continuous spherical paper and pigment washes: no horizon or figurative scenery. */
export function createChillSky() {
  const paperAlpha = new THREE.CanvasTexture(
    createWatercolorAlpha("wash", 811, 256),
  );
  const geometry = new THREE.SphereGeometry(220, 32, 16);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      progress: { value: 0 },
      phase: { value: new THREE.Vector3(1, 0, 0) },
      gesture: { value: 0 },
      passage: { value: new THREE.Vector3(1, 0, 0) },
      time: { value: 0 },
      paperAlpha: { value: paperAlpha },
    },
    vertexShader: `varying vec3 d;void main(){d=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 d;uniform float progress,time;uniform sampler2D paperAlpha;uniform vec3 phase,passage;uniform float gesture;
 float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
 float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash(i),hash(i+vec3(1.,0.,0.)),f.x),mix(hash(i+vec3(0.,1.,0.)),hash(i+vec3(1.,1.,0.)),f.x),f.y),mix(mix(hash(i+vec3(0.,0.,1.)),hash(i+vec3(1.,0.,1.)),f.x),mix(hash(i+vec3(0.,1.,1.)),hash(i+vec3(1.,1.,1.)),f.x),f.y),f.z);}
 void main(){vec3 v=normalize(d);float drift=time*.003;
 vec3 p=v*3.2+vec3(drift,-drift*.6,0.);
 float broad=noise(p+noise(p*1.8)*.8), detail=noise(p*5.5), grain=hash(floor(v*1800.));
 vec3 nightPaper=vec3(.018,.035,.065), auroraPaper=vec3(.12,.20,.24),dawnPaper=mix(vec3(.55,.39,.39),vec3(.89,.855,.79),smoothstep(.48,1.,progress));
 vec3 paper=nightPaper*phase.x+auroraPaper*phase.y+dawnPaper*phase.z;
 vec3 blue=vec3(.025,.08,.13)*phase.x+vec3(.17,.29,.3)*phase.y+vec3(.32,.52,.57)*phase.z;
 vec3 rose=vec3(.07,.07,.12)*phase.x+vec3(.25,.18,.31)*phase.y+vec3(.68,.43,.43)*phase.z;
 vec3 pigment=mix(blue,rose,smoothstep(.32,.72,noise(p+7.)));
 float plate=texture2D(paperAlpha,v.xy*.45+.5).a*.5+texture2D(paperAlpha,v.yz*.45+.5).a*.5;
 float wash=smoothstep(.42,.82,broad)*.24+plate*.06;
 float edge=exp(-abs(broad-.57)*70.)*.025;
 vec3 color=mix(paper,pigment,wash+edge+detail*.018);
 float localPassage=exp(-dot(v-passage,v-passage)*3.)*gesture;
 float veil=exp(-pow((v.y-.18-sin(v.x*3.+drift)*.14-noise(p*.8)*.16)/.17,2.))*noise(p*2.+drift);
 vec3 sage=mix(vec3(.22,.38,.29),vec3(.29,.22,.39),noise(p*1.4+4.));
 color=mix(color,sage,veil*phase.y*(.32+localPassage*.4));
 vec3 starCell=v*65.;
 float reserves=step(.995,hash(floor(starCell)))*exp(-dot(fract(starCell)-.5,fract(starCell)-.5)*18.)*(1.-smoothstep(.2,.6,noise(p*4.)));
 color=mix(color,vec3(.7,.76,.75),reserves*phase.x*.5);
 float ink=exp(-abs(v.y+.04+sin(v.x*6.)*.018+noise(p)*.04)*600.)*noise(p*14.);
 color=mix(color,vec3(.18,.25,.28),ink*phase.z*.055);
 color-=(grain-.5)*(.003+phase.z*.005)+detail*.004;
 gl_FragColor=vec4(color,1.);
 #include <colorspace_fragment>
 }`,
  });
  const object = new THREE.Mesh(geometry, material);
  object.frustumCulled = false;
  object.renderOrder = -20;
  const traceDirection = new THREE.Vector3();
  let lastTime = 0;
  return {
    object,
    onTrace(position, energy) {
      material.uniforms.passage.value
        .lerp(traceDirection.copy(position).normalize(), 0.04)
        .normalize();
      material.uniforms.gesture.value = Math.min(
        1,
        material.uniforms.gesture.value + 0.008 + energy * 0.008,
      );
    },
    update(time, audio, progress = 0, state = null) {
      if (state)
        material.uniforms.phase.value.set(
          state.night,
          state.aurora,
          state.dawn,
        );
      material.uniforms.gesture.value *= Math.exp(
        -Math.max(0, time - lastTime) * 0.025,
      );
      lastTime = time;
      material.uniforms.time.value = time;
      material.uniforms.progress.value = progress;
    },
    dispose() {
      object.removeFromParent();
      paperAlpha.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}
