import * as THREE from "three";
import { composeWeather } from "./composition";

/** Bounded ribbons and pigment showers: two draws, static buffers, GPU motion. */
export class WeatherAccents {
  readonly ribbons: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  readonly seeds: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  readonly count: number;
  constructor(texture: THREE.Texture, mobile: boolean) {
    const uniforms = () => ({
      time: { value: 0 },
      music: { value: new THREE.Vector3() },
      ratio: { value: 1 },
      contact: { value: 0 },
      weather: { value: new THREE.Vector4() },
      rainbow: { value: 0 },
      layers: { value: 1 },
      kinds: { value: new THREE.Vector3() },
      a: { value: new THREE.Color() },
      b: { value: new THREE.Color() },
      c: { value: new THREE.Color() },
      pigment: { value: texture },
    });
    const lane: number[] = [],
      side: number[] = [],
      positions: number[] = [],
      indices: number[] = [];
    const strands = 12,
      segments = 48;
    for (let s = 0; s < strands; s++) {
      for (let i = 0; i <= segments; i++)
        for (const sign of [-1, 1]) {
          positions.push(i / segments, 0, 0);
          lane.push(s);
          side.push(sign);
        }
      const base = s * (segments + 1) * 2;
      for (let i = 0; i < segments; i++) {
        const v = base + i * 2;
        indices.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("lane", new THREE.Float32BufferAttribute(lane, 1));
    geometry.setAttribute("side", new THREE.Float32BufferAttribute(side, 1));
    geometry.setIndex(indices);
    const ribbonMaterial = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: uniforms(),
      vertexShader: `uniform float time,layers,rainbow;uniform vec4 weather;uniform vec3 kinds;attribute float lane,side;varying vec2 uvInk;varying float group,visibility,weatherKind;
      void main(){float u=position.x;group=mod(lane,layers);float kind=group<.5?kinds.x:group<1.5?kinds.y:kinds.z;
        if(rainbow>.5&&lane<1.5)kind=6.;weatherKind=kind;
        float seed=lane*1.73;float t=time*.09+seed;float theta=u*4.5+t;
        vec3 center=vec3(sin(seed)*5.,cos(seed*.7)*2.,-5.+cos(seed*.9)*4.);
        vec3 p=center+vec3((u-.5)*6.,sin(theta)*1.2,cos(theta*.8)*.9);
        if(kind<.5||abs(kind-5.)<.1){p=center+vec3(sin(theta)*1.3,(u-.5)*5.,cos(theta)*.8);}
        else if(kind<1.5||kind>10.5){p=center+vec3(sin(theta)*.3+weather.z*(u-.5)*2.,(.5-u)*6.,cos(theta*.7)*.35);}
        else if(kind>5.5&&kind<6.5){float arc=(u*.9+.05)*3.14159;p=center+vec3(cos(arc)*3.2,sin(arc)*2.2-.8,sin(seed)*.2);}
        else if(kind<2.5){p.x=center.x+(u-.5)*9.;p.y=center.y+sin(theta)*.7;}
        else if(kind>6.5&&kind<7.5){p.y=center.y+cos(theta)*.8-u*3.;}
        else if(kind>8.5&&kind<9.5){p=center+vec3(cos(u*4.+t*.25)*2.,sin(u*4.+t*.25)*1.1,(u-.5)*2.);}
        float width=(.035+.07*(.5+.5*sin(seed)))*pow(max(.001,sin(u*3.14159)),.6);
        if(kind>5.5&&kind<6.5){float arc=(u*.9+.05)*3.14159;p+=vec3(cos(arc),sin(arc),0.)*side*(.16+.05*sin(seed));}
        else{if(kind<1.5&&kind>.5||kind>10.5)width*=.45;p+=vec3(-sin(theta)*.45,cos(theta),sin(theta*.8)*.6)*width*side;}
        float cycle=.65+.35*sin(time*.045+seed);visibility=cycle;
        uvInk=vec2(u,side*.5+.5);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader: `uniform sampler2D pigment;uniform vec3 a,b,c;uniform float time;varying vec2 uvInk;varying float group,visibility,weatherKind;
      void main(){vec3 ink=group<.5?a:group<1.5?b:c;
        if(weatherKind>5.5&&weatherKind<6.5)ink=.53+.24*cos(vec3(0.,2.1,4.2)+uvInk.y*5.3);
        if(weatherKind>6.5&&weatherKind<7.5)ink=mix(ink,vec3(.85,.91,.95),.7);float grain=texture2D(pigment,vec2(uvInk.x*.42+.03,uvInk.y*.18+.55)).a;
        float edge=1.-smoothstep(.35,1.,abs(uvInk.y-.5)*2.);float ends=smoothstep(0.,.1,uvInk.x)*(1.-smoothstep(.8,1.,uvInk.x));
        float flow=.5+.5*sin(uvInk.x*11.-time*.21);float alpha=edge*ends*(.3+grain*.5)*visibility;
        gl_FragColor=vec4(ink*(.65+flow*.2),alpha*.78);\n#include <colorspace_fragment>\n}`,
    });
    ribbonMaterial.forceSinglePass = true;
    this.ribbons = new THREE.Mesh(geometry, ribbonMaterial);
    this.ribbons.frustumCulled = false;
    this.count = mobile ? 384 : 640;
    const centers = new Float32Array(this.count * 3),
      parameters = new Float32Array(this.count * 3);
    let state = 48191;
    const random = () =>
      (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
    for (let i = 0; i < this.count; i++) {
      const cluster = i % 6,
        angle = cluster * 2.39996;
      centers[i * 3] = Math.sin(angle) * 4.6;
      centers[i * 3 + 1] = Math.cos(angle * 0.7) * 2.1;
      centers[i * 3 + 2] = -5 + Math.cos(angle) * 3.8;
      parameters[i * 3] = random();
      parameters[i * 3 + 1] = random();
      parameters[i * 3 + 2] = random();
    }
    const pointGeometry = new THREE.BufferGeometry();
    pointGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(centers, 3),
    );
    pointGeometry.setAttribute(
      "seed",
      new THREE.BufferAttribute(parameters, 3),
    );
    const pointMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: uniforms(),
      vertexShader: `uniform float time,ratio,layers,contact;uniform vec4 weather;uniform vec3 kinds,music;attribute vec3 seed;varying float group,alpha,style,weatherKind;varying vec3 grainSeed;
      void main(){group=min(floor(seed.x*layers),layers-1.);float kind=group<.5?kinds.x:group<1.5?kinds.y:kinds.z;weatherKind=kind;
        float period=19.+seed.z*17.;float age=fract(time/period+seed.y);float spread=smoothstep(0.,1.,age);float angle=seed.x*62.83185+time*.06;
        float radius=(.2+spread*2.9)*(0.5+seed.z*.5);vec3 p=position+vec3(cos(angle)*radius,sin(angle)*radius*.6,sin(angle*.7)*radius*.65);
        if(kind<.5||abs(kind-5.)<.1){p.y+=spread*3.;}
        else if(kind<1.5||kind>10.5){p.y-=spread*5.5;p.x+=sin(time*.15+seed.z)*.4+weather.z*spread*2.5;}
        else if(kind<2.5){p.x+=spread*4.;p.y+=sin(angle)*.6;}
        else if(kind>6.5&&kind<7.5){p.y-=spread*2.5;p.x+=sin(time*.13+seed.z*4.);}
        else if(kind>8.5&&kind<9.5){p=position+vec3(cos(angle)*radius,sin(angle)*radius,sin(angle*.7)*.4);}
        p+=vec3(sin(angle),cos(angle*.7),sin(angle*.6))*contact*.35;
        p+=vec3(cos(angle+seed.y),sin(angle*.8),cos(angle*.6))*(music.x*.7+music.y*.35)*spread;
        vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
        gl_PointSize=clamp((100.+seed.z*170.)*ratio/max(2.5,-view.z),3.,32.*ratio);
        alpha=smoothstep(0.,.13,age)*(1.-smoothstep(.65,1.,age))*smoothstep(.8,2.5,-view.z);
        style=mod(floor(seed.z*9.),3.);grainSeed=seed;}`,
      fragmentShader: `uniform vec3 a,b,c;uniform vec4 weather;uniform sampler2D pigment;varying float group,alpha,style,weatherKind;varying vec3 grainSeed;
      void main(){vec2 p=gl_PointCoord-.5;float angle=grainSeed.x*6.28318;mat2 rotate=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));p=rotate*p;
        float r=style<.5?length(p*vec2(1.,2.2)):length(p);float mask=1.-smoothstep(.15,.49,r);
        if(style>1.5)mask=exp(-abs(r-.29)*22.)*.7;
        if(weatherKind>.5&&weatherKind<1.5||weatherKind>10.5){vec2 drop=gl_PointCoord-.5;drop.x+=drop.y*weather.z*.45;mask=(1.-smoothstep(.025,.085,abs(drop.x)))*(1.-smoothstep(.12,.49,abs(drop.y)));}
        else if(weatherKind>1.5&&weatherKind<2.5){vec2 wind=gl_PointCoord-.5;mask=exp(-abs(wind.y)*22.)*(1.-smoothstep(.1,.49,abs(wind.x)));}
        else if(weatherKind>6.5&&weatherKind<7.5){float angle=atan(p.y,p.x);float arms=.68+.32*cos(angle*6.);mask=(1.-smoothstep(.1,.46,length(p)/arms))*.9;}
        vec4 paper=texture2D(pigment,gl_PointCoord*.35+grainSeed.xy*.1);mask*=.55+paper.a*.45;
        if(mask<.02)discard;vec3 color=group<.5?a:group<1.5?b:c;
        if(weatherKind>6.5&&weatherKind<7.5)color=mix(color,vec3(.92,.96,1.),.75);
        if(weatherKind>5.5&&weatherKind<6.5)color=.55+.23*cos(vec3(0.,2.1,4.2)+grainSeed.z*5.3);
        gl_FragColor=vec4(color*(.65+grainSeed.z*.25),mask*alpha*.85);\n#include <colorspace_fragment>\n}`,
    });
    this.seeds = new THREE.Points(pointGeometry, pointMaterial);
    this.seeds.frustumCulled = false;
  }
  setPalette(ids: string[]) {
    const score = composeWeather(ids);
    for (const material of [this.ribbons.material, this.seeds.material]) {
      material.uniforms.layers.value = score.entries.length;
      material.uniforms.weather.value.fromArray(score.weather);
      material.uniforms.rainbow.value = score.rainbow;
      material.uniforms.kinds.value.set(
        score.kinds[0],
        score.kinds[1] ?? score.kinds[0],
        score.kinds[2] ?? score.kinds[0],
      );
      ["a", "b", "c"].forEach((key, i) =>
        material.uniforms[key].value.set(
          score.palettes[i % score.palettes.length].color,
        ),
      );
    }
  }
  update(time: number, ratio: number, contact: number, music?: THREE.Vector3) {
    this.ribbons.material.uniforms.time.value = time;
    const u = this.seeds.material.uniforms;
    u.time.value = time;
    u.ratio.value = ratio;
    u.contact.value = contact;
    if (music) u.music.value.copy(music);
    this.seeds.geometry.setDrawRange(
      0,
      ratio < 1 ? Math.floor(this.count * 0.65) : this.count,
    );
  }
  dispose() {
    this.ribbons.geometry.dispose();
    this.ribbons.material.dispose();
    this.seeds.geometry.dispose();
    this.seeds.material.dispose();
  }
}
