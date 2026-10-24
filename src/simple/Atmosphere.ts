import * as THREE from "three";
import { composeWeather } from "./composition";

/** One sky draw and one particle draw. No frame allocations, remote assets or bloom. */
export class Atmosphere {
  readonly sky: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  readonly particles: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  readonly count: number;
  constructor(texture: THREE.Texture, mobile: boolean) {
    const skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        paper: { value: texture },
        electro: { value: new THREE.Vector3() },
        eye: { value: new THREE.Vector3(0, 18, 12) },
        time: { value: 0 },
        weather: { value: new THREE.Vector4() },
        climate: { value: new THREE.Vector4() },
        magic: { value: new THREE.Vector4() },
        kinds: { value: new THREE.Vector3() },
        layers: { value: 1 },
        a: { value: new THREE.Color("#519b9e") },
        b: { value: new THREE.Color("#c77868") },
        c: { value: new THREE.Color("#a49bb9") },
      },
      vertexShader: `varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform sampler2D paper;uniform vec3 eye;uniform float time;uniform vec3 a,b,c,electro;uniform vec4 weather,climate,magic;varying vec3 direction;
      void main(){vec3 d=normalize(direction);float t=time*.008;
        vec2 uv=d.xz*.24+vec2(d.y*.18,t*(1.+weather.z*2.));
        vec4 wash=texture2D(paper,uv+vec2(.5));
        vec4 grain=texture2D(paper,d.xy*.21+vec2(.5-t*.3,.5));
        float clouds=smoothstep(.19,.79,wash.a)*(.65+grain.a*.35);
        float veil=.5+.5*sin(d.x*3.+d.z*2.+sin(d.y*4.+t)*1.5+t);
        vec3 pigment=mix(a,b,veil);pigment=mix(pigment,c,smoothstep(-.3,.8,d.y)*.4);
        vec3 ivory=vec3(.91,.90,.86);
        float dark=climate.x*.4+climate.z*.55;
        vec3 base=mix(ivory,vec3(.11,.15,.25),min(.75,dark));
        base=mix(base,vec3(.13,.10,.22),electro.x*.55);
        float saturation=dot(pigment,vec3(.2126,.7152,.0722));pigment=max(vec3(.01),mix(vec3(saturation),pigment,1.+electro.x*.65));
        vec3 color=mix(base,pigment,.18+clouds*(.25+magic.w*.15));
        color=mix(color,vec3(.33,.43,.57),weather.y*clouds*.28);
        color=mix(color,ivory,weather.w*(.28+grain.a*.25));
        vec3 sunDir=normalize(vec3(-.6,.09,-.8));float sun=pow(max(0.,dot(d,sunDir)),7.);
        color=mix(color,vec3(1.,.85,.54),weather.x*sun*.78*(1.-clouds*.45));
        float sunCore=smoothstep(.9975,.9995,dot(d,sunDir));
        color=mix(color,vec3(1.,.9,.64),sunCore*weather.x*.7*(1.-clouds*.45));
        float arc=exp(-pow((length(d.xy-vec2(0.,-.25))-.78)*24.,2.));
        vec3 rainbow=.64+.22*cos(vec3(0.,2.,4.)+d.y*18.);
        color=mix(color,rainbow,arc*max(magic.x,weather.x*weather.y*.75)*.4);
        float aurora=exp(-pow((d.y-.3-sin(d.x*4.+t)*.13)*14.,2.));
        color=mix(color,mix(vec3(.48,.73,.65),vec3(.69,.56,.78),veil),magic.z*aurora*.4);
        float moon=smoothstep(.995,.999,dot(d,normalize(vec3(.45,.5,-.7))));
        float cut=smoothstep(.995,.999,dot(d,normalize(vec3(.475,.515,-.68))));
        color=mix(color,vec3(.97,.94,.82),climate.z*moon*(1.-cut)*.8);
        float stars=step(.995,grain.r)*smoothstep(.15,.7,d.y);
        color+=climate.z*stars*.15+vec3(.025)*grain.r;
        // Watercolored dusk and distant, fog-softened terrain, continuous over 360 degrees.
        float dusk=(1.-climate.z*.85)*(1.-climate.x*.35);
        float glow=exp(-abs(d.y+.025)*9.);
        color=mix(color,vec3(.91,.61,.48),glow*dusk*.32);
        float ridge=-.09+sin(d.x*5.+d.z*3.)*.018+sin(d.z*9.-d.x*4.)*.01;
        float hills=1.-smoothstep(ridge-.028,ridge+.028,d.y);
        vec3 hillColor=mix(vec3(.57,.61,.65),a,.13);
        color=mix(color,hillColor,hills*.5);
        float nearRidge=-.17+sin(d.x*7.-d.z*5.)*.025;
        float foothills=1.-smoothstep(nearRidge-.035,nearRidge+.035,d.y);
        color=mix(color,mix(vec3(.39,.47,.48),a,.15),foothills*.25);
        float land=1.-smoothstep(-.26,-.095,d.y);
        vec2 ground=eye.xz+d.xz*(eye.y+14.)/max(.025,-d.y);
        vec2 landUv=clamp(ground*.0017+.5,.01,.99);
        vec4 earth=texture2D(paper,landUv);
        vec3 terrain=mix(vec3(.36,.45,.42),vec3(.51,.40,.35),earth.b);
        terrain=mix(terrain,c,.12);terrain*=.85+earth.r*.15;
        terrain=mix(terrain,vec3(.27,.32,.42),climate.z*.48);
        float haze=smoothstep(-.9,-.15,d.y);
        terrain=mix(terrain,mix(vec3(.82,.78,.73),a,.1),haze*.28);
        color=mix(color,terrain,land*.78);
        gl_FragColor=vec4(color,1.);\n#include <colorspace_fragment>\n}`,
    });
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(38, 24, 12),
      skyMaterial,
    );
    this.sky.renderOrder = -100;
    this.sky.frustumCulled = false;
    this.count = mobile ? 480 : 800;
    const positions = new Float32Array(this.count * 3),
      seeds = new Float32Array(this.count * 3);
    let seed = 87123;
    const random = () =>
      (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
    for (let i = 0; i < this.count; i++) {
      const angle = random() * Math.PI * 2,
        radius = 3 + random() * 17;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (random() - 0.5) * 19;
      positions[i * 3 + 2] = Math.sin(angle) * radius - 4;
      seeds[i * 3] = random();
      seeds[i * 3 + 1] = random();
      seeds[i * 3 + 2] = random();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("seed", new THREE.BufferAttribute(seeds, 3));
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        time: { value: 0 },
        weather: { value: new THREE.Vector4() },
        climate: { value: new THREE.Vector4() },
        magic: { value: new THREE.Vector4() },
        kinds: { value: new THREE.Vector3() },
        layers: { value: 1 },
        ratio: { value: 1 },
        resonance: { value: 0 },
        a: { value: new THREE.Color() },
        b: { value: new THREE.Color() },
        c: { value: new THREE.Color() },
      },
      vertexShader: `uniform float time,ratio,layers,resonance;uniform vec3 kinds;uniform vec4 weather,climate,magic;attribute vec3 seed;varying vec3 particle;varying float fade,kind,group;
      void main(){particle=seed;group=min(floor(seed.x*layers),layers-1.);kind=group<.5?kinds.x:group<1.5?kinds.y:kinds.z;
        float t=time*(.025+seed.y*.025)+seed.x*6.28318;vec3 p=position;float edge=1.;
        if(kind<.5){p.y=mod(position.y+time*(.18+seed.y*.2)+10.,20.)-10.;p.x+=sin(t)*1.4;}
        else if(kind<1.5){p.y=mod(position.y-time*(1.3+seed.y)+10.,20.)-10.;p.x+=weather.z*sin(time*.13+seed.z)*2.+weather.z*time*.08; p.x=mod(p.x+22.,44.)-22.;}
        else if(kind<2.5){p.x=mod(position.x+time*(.7+seed.y)+22.,44.)-22.;p.y+=sin(p.x*.3+t)*1.8;}
        else if(kind<3.5){p.x+=sin(t*.3)*2.;p.y+=cos(t*.4+seed.z)*.7;}
        else if(kind<4.5){p.x+=sin(t*2.+p.y)*1.3;p.y+=sin(t*1.7+p.z)*1.1;}
        else if(kind<5.5){p.y=mod(position.y+time*(.5+seed.y*.5)+10.,20.)-10.;p.x+=sin(p.y*.5+t)*.7;}
        else if(kind<6.5){p.x+=sin(t)*1.5;p.y+=cos(t+seed.z*6.)*1.1;}
        else if(kind<7.5){p.y=mod(position.y-time*(.2+seed.y*.2)+10.,20.)-10.;p.x+=sin(time*.18+seed.z*8.)*1.5;}
        else if(kind<8.5){p.y+=sin(p.x*.4+t)*2.;p.z+=cos(p.x*.4+t)*1.5;}
        else if(kind<9.5){p.x+=sin(t*.2)*.3;}
        else if(kind<10.5){p.x+=sin(t*.5)*1.2;p.y+=cos(t*.4)*.4;}
        else{p.y+=sin(p.x*.45-time*.35)*1.8;p.z+=cos(p.x*.3-time*.25);}
        edge=smoothstep(0.,2.,10.-abs(p.y))*smoothstep(0.,3.,22.-abs(p.x));
        p+=vec3(sin(t+p.y),cos(t*.6+p.z),sin(t*.7+p.x))*resonance*.4;
        vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
        float size=kind>2.5&&kind<3.5?1.7:kind>9.5&&kind<10.5?1.7:1.;
        gl_PointSize=clamp((58.+seed.z*100.)*ratio*size/max(2.,-view.z),2.,20.*ratio);
        fade=edge*smoothstep(.4,2.,-view.z)*(.55+.12*sin(t*.7+seed.z*6.));}`,
      fragmentShader: `uniform vec3 a,b,c;uniform vec4 weather;varying vec3 particle;varying float fade,kind,group;
      void main(){vec2 p=gl_PointCoord-.5;float alpha=0.;vec3 color=group<.5?a:group<1.5?b:c;
        if(kind>.5&&kind<1.5){p.x+=p.y*weather.z*.7;alpha=(1.-smoothstep(.025,.1,abs(p.x)))*(1.-smoothstep(.08,.48,abs(p.y)));color=mix(color,vec3(.9,.8,.52),weather.x*.35*particle.z);}
        else if(kind>1.5&&kind<2.5){alpha=exp(-abs(p.y)*24.)*(1.-smoothstep(.1,.49,abs(p.x)));}
        else if((kind>2.5&&kind<3.5)||(kind>9.5&&kind<10.5)){alpha=(1.-smoothstep(0.,.5,length(p)))*.26;}
        else if(kind>6.5&&kind<7.5){float r=length(p);float arms=.7+.3*cos(atan(p.y,p.x)*6.);alpha=(1.-smoothstep(.05,.45,r/arms))*.7;color=mix(color,vec3(.9,.95,1.),.65);}
        else if(kind>10.5){float r=length(p*vec2(1.,2.));alpha=exp(-abs(r-.3)*25.)*.6;}
        else if(kind>8.5&&kind<9.5){alpha=exp(-length(p)*15.);color=vec3(.94,.92,.8);}
        else{float angle=particle.z*6.28;mat2 rotate=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));p=rotate*p;alpha=1.-smoothstep(.04,.46,length(p*vec2(1.,2.4)));}
        if(alpha<.01)discard;gl_FragColor=vec4(color,alpha*fade*.85);\n#include <colorspace_fragment>\n}`,
    });
    this.particles = new THREE.Points(geometry, material);
    this.particles.frustumCulled = false;
  }
  setPalette(ids: string[]) {
    const score = composeWeather(ids);
    for (const material of [this.sky.material, this.particles.material]) {
      ["a", "b", "c"].forEach((name, i) =>
        material.uniforms[name].value.set(
          score.palettes[i % score.palettes.length].color,
        ),
      );
      material.uniforms.weather.value.fromArray(score.weather);
      material.uniforms.climate.value.fromArray(score.climate);
      material.uniforms.magic.value.fromArray(score.magic);
      material.uniforms.kinds.value.set(
        score.kinds[0],
        score.kinds[1] ?? score.kinds[0],
        score.kinds[2] ?? score.kinds[0],
      );
      material.uniforms.layers.value = score.entries.length;
    }
  }
  update(time: number, camera: THREE.Camera, ratio: number) {
    this.sky.position.copy(camera.position);
    this.sky.material.uniforms.eye.value.copy(camera.position);
    this.sky.material.uniforms.time.value = time;
    this.particles.material.uniforms.time.value = time;
    this.particles.material.uniforms.ratio.value = ratio;
    this.particles.geometry.setDrawRange(
      0,
      ratio < 1 ? Math.floor(this.count * 0.65) : this.count,
    );
  }
  dispose() {
    this.sky.geometry.dispose();
    this.sky.material.dispose();
    this.particles.geometry.dispose();
    this.particles.material.dispose();
  }
}
