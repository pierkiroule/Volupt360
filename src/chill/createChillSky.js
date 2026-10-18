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
      opening: { value: 0 },
      openingDirection: { value: new THREE.Vector3(0, 0, 1) },
      progress: { value: 0 },
      phase: { value: new THREE.Vector3(1, 0, 0) },
      gesture: { value: 0 },
      passage: { value: new THREE.Vector3(1, 0, 0) },
      time: { value: 0 },
      paperAlpha: { value: paperAlpha },
    },
    vertexShader: `varying vec3 d;void main(){d=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 d;uniform float progress,time,opening;uniform vec3 openingDirection;uniform sampler2D paperAlpha;uniform vec3 phase,passage;uniform float gesture;
 float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
 float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash(i),hash(i+vec3(1.,0.,0.)),f.x),mix(hash(i+vec3(0.,1.,0.)),hash(i+vec3(1.,1.,0.)),f.x),f.y),mix(mix(hash(i+vec3(0.,0.,1.)),hash(i+vec3(1.,0.,1.)),f.x),mix(hash(i+vec3(0.,1.,1.)),hash(i+vec3(1.,1.,1.)),f.x),f.y),f.z);}
 void main(){vec3 v=normalize(d);float drift=time*.003;
 vec3 p=v*3.2+vec3(drift,-drift*.6,0.);
 float broad=noise(p+noise(p*1.8)*.8), detail=noise(p*5.5), grain=hash(floor(v*1800.));
 float purple=smoothstep(.10,.31,progress), blueHour=smoothstep(.25,.50,progress);
 float sunrise=smoothstep(.45,.70,progress), roseHour=smoothstep(.64,.86,progress), paperHour=smoothstep(.82,1.,progress);
 vec3 paper=mix(vec3(.0015,.002,.006),vec3(.085,.022,.14),purple);
 paper=mix(paper,vec3(.045,.14,.27),blueHour);
 float horizon=exp(-pow((v.y-.08)/.48,2.));
 paper=mix(paper,mix(vec3(.22,.12,.28),vec3(.64,.16,.045),horizon),sunrise);
 paper=mix(paper,mix(vec3(.64,.40,.48),vec3(.95,.69,.34),horizon),roseHour);
 paper=mix(paper,vec3(.95,.935,.905),paperHour);
 vec3 pigment=mix(vec3(.04,.025,.08),vec3(.17,.28,.42),blueHour);
 pigment=mix(pigment,vec3(.75,.34,.24),sunrise);
 pigment=mix(pigment,vec3(.83,.51,.49),roseHour);
 pigment=mix(pigment,vec3(.76,.73,.67),paperHour);
 float plate=texture2D(paperAlpha,v.xy*.45+.5).a*.5+texture2D(paperAlpha,v.yz*.45+.5).a*.5;
 float aperture=exp(-dot(v-openingDirection,v-openingDirection)*9.)*opening;
 float wash=(smoothstep(.42,.82,broad)*.24+plate*.08)*(1.-paperHour*.8);
 float edge=exp(-abs(broad-.57)*70.)*.03;
 vec3 color=mix(paper,pigment,(wash+edge*(1.-paperHour))*(1.-aperture*.7));
 float localPassage=exp(-dot(v-passage,v-passage)*3.)*gesture;
 float veil=exp(-pow((v.y-.18-sin(v.x*3.+drift)*.14-noise(p*.8)*.16)/.17,2.))*noise(p*2.+drift);
 vec3 sage=mix(vec3(.18,.37,.32),vec3(.32,.20,.45),noise(p*1.4+4.));
 color=mix(color,sage,veil*phase.y*(.38+localPassage*.4)*(1.-aperture*.8));
 vec3 starCell=v*95.;
 float star=step(.997,hash(floor(starCell)))*exp(-dot(fract(starCell)-.5,fract(starCell)-.5)*26.);
 color=mix(color,vec3(.83,.86,.78),star*(1.-smoothstep(.22,.52,progress))*.9);
 // A paper-edged crescent, without halo or bloom.
 vec3 moonDirection=normalize(vec3(.48,.44,-.76));
 vec3 moonSide=normalize(cross(moonDirection,vec3(0.,1.,0.)));
 float moonDistance=length(v-moonDirection);
 float disc=1.-smoothstep(.047,.052+(grain-.5)*.002,moonDistance);
 float shadow=1.-smoothstep(.045,.05,length(v-normalize(moonDirection+moonSide*.027)));
 float crescent=disc*(1.-shadow)*(1.-smoothstep(.18,.43,progress));
 color=mix(color,vec3(.93,.90,.68)*( .94+detail*.06),crescent);
 vec3 sunDirection=normalize(vec3(-.22,.09+sunrise*.22,-1.));
 float sunDistance=length(v-sunDirection);
 float sun=1.-smoothstep(.065,.083+(detail-.5)*.01,sunDistance);
 vec3 sunColor=mix(vec3(.94,.25,.035),vec3(1.,.77,.38),roseHour);
 sunColor=mix(sunColor,vec3(.995,.985,.945),paperHour);
 color=mix(color,sunColor,sun*smoothstep(.45,.65,progress)*(.65+.35*paperHour));
 color-=(grain-.5)*(.001+paperHour*.009)+detail*.003*paperHour;
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
    setNarrativeResponse(effects, direction) {
      material.uniforms.opening.value = effects?.opening || 0;
      if (direction)
        material.uniforms.openingDirection.value.copy(direction).normalize();
    },
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
