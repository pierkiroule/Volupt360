import * as THREE from "three";
import { universeIdentity } from "./UniverseIdentity";

// Shared trajectory: detached grains originate on the actual calligraphic line.
const trajectory = `
uniform float time,seed,pace,mode,hand;
uniform vec3 space,music;
vec3 path(float u,float id){
 float s=id*2.39996+seed,t=time*.065*pace;
 float a=u*6.28318*(1.+mod(mode,3.)*.24)+s;
 float rain=1.-smoothstep(.0,.65,abs(mode-1.));
 float hesitation=1.-smoothstep(.0,.65,abs(mode-2.));
 vec3 p=vec3(cos(a)*(1.1+.5*sin(u*4.+s)),sin(a*1.3+s)*1.1,sin(a*.7)*.9);
 p.x+=hesitation*(u-.5)*1.5;p.y=mix(p.y,(u-.5)*4.,rain*.85);
 float envelope=sin(u*3.141593);
 p+=vec3(sin(u*11.+t+s),cos(u*8.-t+s),sin(u*7.+t))*(.12+music.x*.3)*envelope;
 if(abs(mode-3.)<.1){p.z+=sin(u*12.+s)*.4;p.x*=.7+.2*sin(t+s);}
 if(abs(mode-4.)<.1){p.y+=sin(u*14.+t)*.35;}
 if(abs(mode-9.)<.1){p.y*=.3;p.x*=1.5;}
 if(abs(mode-10.)<.1){p.y*=.65;}
 p.x*=hand;
 p+=vec3(sin(s)*5.,cos(s)*2.,cos(s*.79)*5.);
 p*=space;
 p+=vec3(sin(t+s)*.35,18.+cos(t*.7+s)*.3,-5.);
 return p;
}
`;

/** Two bounded GPU batches: hairlines and grains which bloom into paper-grained ink.
 * No emitters, per-frame allocations, accumulating trails or new texture resources. */
export class CalligraphicInk {
  readonly group = new THREE.Group();
  readonly lines: THREE.LineSegments<
    THREE.BufferGeometry,
    THREE.ShaderMaterial
  >;
  readonly grains: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private uniforms = {
    time: { value: 0 },
    seed: { value: 0 },
    pace: { value: 1 },
    mode: { value: 0 },
    hand: { value: 1 },
    space: { value: new THREE.Vector3(1, 1, 1) },
    music: { value: new THREE.Vector3() },
    pixelRatio: { value: 1 },
    paper: { value: null as THREE.Texture | null },
  };
  constructor(paper: THREE.Texture, mobile = false) {
    this.uniforms.paper.value = paper;
    const positions: number[] = [],
      ids: number[] = [],
      count = mobile ? 12 : 18,
      steps = 128;
    for (let id = 0; id < count; id++)
      for (let j = 0; j < steps; j++) {
        positions.push(j / steps, 0, 0, (j + 1) / steps, 0, 0);
        ids.push(id, id);
      }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("id", new THREE.Float32BufferAttribute(ids, 1));
    this.lines = new THREE.LineSegments(
      geometry,
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        transparent: true,
        depthWrite: false,
        vertexShader:
          trajectory +
          `attribute float id;varying float opacity;
   void main(){float u=position.x;float cycle=fract(time*.025*pace+id*.137);
    float head=smoothstep(0.,.56,cycle);float fade=1.-smoothstep(.72,1.,cycle);
    opacity=smoothstep(0.,.07,u)*(1.-smoothstep(head-.06,head,u))*fade;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(path(u,id),1.);
   }`,
        fragmentShader: `varying float opacity;void main(){gl_FragColor=vec4(.008,.009,.012,opacity*.48);}`,
      }),
    );
    const grainGeometry = new THREE.BufferGeometry();
    const grainPositions: number[] = [],
      grainIds: number[] = [];
    for (let id = 0; id < count; id++)
      for (let k = 0; k < 4; k++) {
        grainPositions.push(k / 4, 0, 0);
        grainIds.push(id);
      }
    grainGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(grainPositions, 3),
    );
    grainGeometry.setAttribute(
      "id",
      new THREE.Float32BufferAttribute(grainIds, 1),
    );
    this.grains = new THREE.Points(
      grainGeometry,
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        transparent: true,
        depthWrite: false,
        vertexShader:
          trajectory +
          `attribute float id;uniform float pixelRatio;varying float age,variant;
   void main(){
    age=fract(time*.025*pace+id*.137-position.x*.06);variant=id+position.x*7.;
    // A grain detaches from the head, drifts, then opens into an ink bloom.
    float detach=smoothstep(.48,.76,age);
    float u=smoothstep(0.,.56,age);
    vec3 p=path(u,id)+vec3(sin(variant)*.7,.4,cos(variant)*.6)*detach;
    vec4 view=modelViewMatrix*vec4(p,1.);
    gl_Position=projectionMatrix*view;
    float bloom=smoothstep(.65,.93,age);
    gl_PointSize=clamp((.045+bloom*.85)*(210./max(1.,-view.z))*pixelRatio,1.,96.*pixelRatio);
   }`,
        fragmentShader: `uniform sampler2D paper;uniform float time;varying float age,variant;
   void main(){
    vec2 p=gl_PointCoord*2.-1.;float bloom=smoothstep(.65,.93,age);
    p.x*=1.+bloom*.35*sin(variant+time*.07);p.y*=1.-bloom*.18;
    // Soft bilateral hints remain ambiguous: no fixed Rorschach figure.
    vec2 uv=vec2(abs(p.x),p.y)*.2+vec2(.52,.24);
    vec4 ink=texture2D(paper,uv);
    float contour=length(p)+bloom*(ink.b-.5)*.65;
    float edge=1.-smoothstep(.45,.94,contour);
    float grain=mix(1.,smoothstep(.12,.7,ink.a)*(.45+ink.g*.55),bloom);
    float fade=smoothstep(.43,.52,age)*(1.-smoothstep(.88,1.,age));
    float alpha=edge*grain*fade*mix(.6,.32,bloom);
    if(alpha<.004)discard;gl_FragColor=vec4(.008,.009,.012,alpha);
   }`,
      }),
    );
    this.lines.frustumCulled = this.grains.frustumCulled = false;
    this.group.add(this.lines, this.grains);
    this.group.visible = false;
  }
  setPalette(ids: string[]) {
    const identity = universeIdentity(ids),
      u = this.uniforms;
    u.seed.value = (identity.seed % 10000) / 1000;
    u.pace.value = identity.speed;
    u.mode.value = identity.mode;
    u.hand.value = identity.hand;
    u.space.value.fromArray(identity.space);
  }
  update(
    time: number,
    music: THREE.Vector3,
    pixelRatio: number,
    inside: boolean,
  ) {
    this.group.visible = inside;
    this.uniforms.time.value = time;
    this.uniforms.music.value.copy(music);
    this.uniforms.pixelRatio.value = pixelRatio;
  }
  dispose() {
    for (const object of [this.lines, this.grains]) {
      object.geometry.dispose();
      object.material.dispose();
    }
  }
}
