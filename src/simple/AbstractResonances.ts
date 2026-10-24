import { universeIdentity } from "./UniverseIdentity";
import * as THREE from "three";
import type { MusicSignal } from "./MusicSignal";
import { composeWeather } from "./composition";

/** Six spatial pigment membranes, one draw, shared grain and static buffers.
 * All deformation is reconstructed from the original parameter grid on the GPU. */
export class AbstractResonances {
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  constructor(paper: THREE.Texture, coarse = false) {
    const points: number[] = [],
      slots: number[] = [],
      indices: number[] = [];
    const along = coarse ? 48 : 64,
      across = coarse ? 6 : 8;
    for (let slot = 0; slot < 6; slot++) {
      const base = points.length / 3;
      for (let y = 0; y <= across; y++)
        for (let x = 0; x <= along; x++) {
          points.push(x / along, y / across, 0);
          slots.push(slot);
        }
      for (let y = 0; y < across; y++)
        for (let x = 0; x < along; x++) {
          const a = base + y * (along + 1) + x,
            b = a + along + 1;
          indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(points, 3),
    );
    geometry.setAttribute("slot", new THREE.Float32BufferAttribute(slots, 1));
    geometry.setIndex(indices);
    this.mesh = new THREE.Mesh(
      geometry,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          paper: { value: paper },
          living: { value: paper },
          livingPrevious: { value: paper },
          livingBlend: { value: 1 },
          livingEnabled: { value: 0 },
          time: { value: 0 },
          worldMode: { value: 0 },
          partnerModes: { value: new THREE.Vector3() },
          space: { value: new THREE.Vector3(1, 1, 1) },
          worldStyle: { value: new THREE.Vector4(1, 0.8, 0.4, 1) },
          music: { value: new THREE.Vector3() },
          melody: { value: 0.5 },
          beat: { value: 0 },
          presence: { value: 0 },
          kinds: { value: new THREE.Vector3() },
          layers: { value: 1 },
          a: { value: new THREE.Color() },
          b: { value: new THREE.Color() },
          c: { value: new THREE.Color() },
          encounters: { value: new THREE.Vector3() },
        },
        vertexShader: `attribute float slot;uniform float time,layers,melody,beat,worldMode;uniform vec3 kinds,music,space,partnerModes;uniform vec4 worldStyle;varying vec2 inkUV;varying float family,kind,fold,membrane;
      void main(){membrane=slot;float u=position.x,v=position.y;inkUV=position.xy;family=mod(slot,layers);
        kind=family<.5?kinds.x:family<1.5?kinds.y:kinds.z;
        float seed=slot*2.39996,t=time*.13*worldStyle.w+seed+beat*.04;
        float angle=(u-.5)*6.4+t*.55;
        float radius=1.6+sin(u*4.+t)*.35;
        vec3 p=vec3(cos(angle)*radius,sin(angle)*radius*.65,(v-.5)*2.);
        if(kind<.5||abs(kind-5.)<.1){p=vec3((u-.5)*5.,sin(u*5.+t)*.7+(v-.5)*1.5,cos(u*4.+t)*.8+sin(v*3.14)*.6);}
        else if(abs(kind-1.)<.1||kind>10.5){p=vec3((v-.5)*1.8+sin(u*7.+t)*.3,(u-.5)*5.,cos(u*6.+t)*.65);}
        else if(abs(kind-2.)<.1||abs(kind-7.)<.1){p=vec3((u-.5)*6.,sin(u*8.-t)*.55+(v-.5)*1.2,cos(u*5.+t+v)*.9);}
        else if(abs(kind-3.)<.1||kind>9.5){p=vec3((u-.5)*4.8,(v-.5)*2.8+sin(u*4.+t)*.5,sin(u*5.+v*3.+t)*.85);}
        else if(abs(kind-8.)<.1){p=vec3((u-.5)*5.,sin(u*7.+t)*1.2+(v-.5)*2.,cos(u*4.-t)*.8);}
        float m=worldMode,band=v-.5,arc=(u-.5)*4.8;
        if((worldMode<11.5 && layers>1.5)||(layers>2.5 && family>1.5))m=family<.5?partnerModes.x:family<1.5?partnerModes.y:partnerModes.z;
        if(m<.5){float r=1.+band*1.7;p=vec3(cos(arc)*r*2.,sin(arc)*r*2.,sin(u*5.+t)*.6);}
        else if(m<1.5){p=vec3(band*1.6+sin(u*6.+t)*.3,(u-.5)*7.,cos(u*4.+t)*.8);}
        else if(m<2.5){p=vec3((u-.5)*9.,sin(u*9.-t)*.7+band,cos(u*5.+t+v)*1.2);}
        else if(m<3.5){float a=u*6.28318;p=vec3(cos(a)*(1.+band),sin(a)*(.7+band*.4),sin(v*3.14159)*1.4);}
        else if(m<4.5||abs(m-13.)<.1){float a=u*9.+t;float r=.5+u*2.+band;p=vec3(cos(a)*r,(u-.5)*5.+band,sin(a)*r);}
        else if(m<5.5){p=vec3(sin(arc)*2.,cos(arc)*2.+band*1.8,(u-.5)*2.);}
        else if(m<6.5){float a=u*3.14159;p=vec3(cos(a)*(2.7+band),sin(a)*(2.7+band),sin(u*5.+t)*.4);}
        else if(m<7.5){p=vec3((u-.5)*7.,band*.9+sin(u*9.+seed)*.15,cos(u*4.)*1.8);}
        else if(m<8.5){p=vec3((u-.5)*6.,band*4.+sin(u*8.+t)*1.4,cos(u*5.+t)*.8);}
        else if(m<9.5||abs(m-14.)<.1||abs(m-16.)<.1){p=vec3(cos(arc)*(2.+band),sin(arc)*(2.+band),sin(v*3.14159)*.8);}
        else if(m<10.5){float a=u*6.28318;p=vec3(cos(a)*(1.7+band),sin(a)*(1.7+band)*.65,sin(v*3.14159)*2.);}
        else if(m<11.5){p=vec3((u-.5)*7.,(u-.5)*3.*(mod(slot,2.)*2.-1.)+band*1.5,sin(u*7.+t)*.8);}
        else if(m<12.5){if(mod(slot,2.)<.5)p=vec3(band*1.2,(u-.5)*7.,sin(u*6.+t)*.6);else p=vec3(cos(arc)*(2.5+band),sin(arc)*(2.5+band),sin(u*4.+t)*.5);}
        else if(abs(m-15.)<.1){p=vec3((u-.5)*8.,sin(u*9.+t)*(.5+v),cos(u*9.+t)*(.5+v));}
        else {float a=u*10.+t;p=vec3(cos(a)*(1.4+band),(u-.5)*6.,sin(a)*(1.4+band));}
        p*=worldStyle.x;p.x*=worldStyle.z<0.?-1.:1.;
        p.z+=sin(v*6.+u*8.+t)*(.22+(1.-exp(-music.x*2.5))*1.25)*sin(u*3.14159);
        p.y+=sin(u*9.-t*.7+seed)*music.y*.85*sin(v*3.14159);
        p.z+=sin(u*5.+v*3.+seed)*melody*music.x*.35;
        p.z+=sin(u*7.+seed)*(.5-.5*cos(beat*6.283185+u*1.5+seed))*.32*music.x*sin(u*3.14159);
        fold=.5+.5*sin(u*8.+v*5.+t);
        float az=seed*.75;float x=p.x;p.x=x*cos(az)+p.z*sin(az);p.z=-x*sin(az)+p.z*cos(az);
        p+=vec3(sin(seed)*5.5*space.x,18.+cos(seed)*1.5*space.y,-5.+cos(seed*.9)*4.5*space.z);
        p.y+=sin(time*.021+seed)*.6;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
      }`,
        fragmentShader: `uniform sampler2D paper,living,livingPrevious;uniform float time,presence,livingEnabled,livingBlend,melody,beat;uniform vec3 a,b,c,encounters,music;uniform vec4 worldStyle;varying vec2 inkUV;varying float family,kind,fold,membrane;
      void main(){vec2 uv=inkUV;vec4 grain=texture2D(paper,uv*.46+vec2(.015,.515));
        vec4 pool=texture2D(paper,uv*.43+vec2(.515,.015));
        float edge=smoothstep(0.,.15,uv.x)*smoothstep(0.,.15,1.-uv.x)*smoothstep(0.,.22,uv.y)*smoothstep(0.,.22,1.-uv.y);
        float holes=smoothstep(.1+abs(worldStyle.z)*.14,.36+abs(worldStyle.z)*.14,grain.a+pool.a*.45);
        // A moving reserve suggests a silhouette without ever fixing a figure.
        vec2 hollow=uv-vec2(.48+.1*sin(time*.025+family),.5+melody*.12);
        float reserve=1.-smoothstep(.035,.22,length(hollow*vec2(1.,1.4))+(pool.b-.5)*.12);
        float reveal=smoothstep(.55,.95,.5+.5*sin(time*.032+family*2.1));
        holes*=1.-reserve*reveal*.6;
        float rim=exp(-abs(grain.b-.5-music.z*.025*sin(uv.x*16.-time*.3))*32.);
        vec3 pigment=family<.5?a:family<1.5?b:c;
        pigment=mix(pigment,vec3(.86,.72,.43),encounters.x*fold*.22);
        pigment=mix(pigment,vec3(.85,.9,.94),encounters.y*.3+encounters.z*.2);
        if(abs(kind-6.)<.1) pigment=mix(pigment,.62+.18*cos(vec3(0.,2.1,4.2)+uv.x*4.),.6);
        float wet=.5+.5*sin(time*.08+family*2.+uv.x*3.);
        float flow=.5+.5*sin(uv.x*11.-uv.y*4.-time*.4+family*1.7);
        vec3 iridescence=.48+.34*cos(vec3(0.,2.1,4.2)+uv.x*4.+uv.y*2.+time*.12+family*1.6);
        pigment=mix(pigment,iridescence,music.x*(.22+fold*.22));
        float luma=dot(pigment,vec3(.2126,.7152,.0722));
        pigment=max(vec3(.015),mix(vec3(luma),pigment,1.45+music.x*.5));
        vec3 color=pigment*(.65+grain.g*.28+fold*.12-rim*.12)*(1.-music.x*flow*.2);
        float alpha=edge*holes*(.25+pool.a*.4+rim*.13)*presence*(.8+wet*.2);
        alpha*=1.+music.y*flow*.3;
        if(livingEnabled>.5 && membrane<.5){
          vec3 paint=mix(texture2D(livingPrevious,uv).rgb,texture2D(living,uv).rgb,livingBlend);
          float deposit=smoothstep(.035,.24,1.-dot(paint,vec3(.2126,.7152,.0722)));
          color=mix(color,paint,.82*deposit);
          alpha=max(alpha,edge*deposit*presence*.86);
        }
        alpha*=worldStyle.y;
        if(alpha<.005)discard;gl_FragColor=vec4(color,alpha);
        #include <colorspace_fragment>
      }`,
      }),
    );
    this.mesh.material.forceSinglePass = true;
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }
  setMusic(signal: Readonly<MusicSignal>, dt: number) {
    const music = this.mesh.material.uniforms.music.value as THREE.Vector3;
    music.x = THREE.MathUtils.damp(music.x, signal.energy, 2.4, dt);
    music.y = THREE.MathUtils.damp(music.y, signal.low, 1.8, dt);
    music.z = THREE.MathUtils.damp(music.z, signal.high, 2, dt);
    const u = this.mesh.material.uniforms;
    if (dt > 0 && signal.energy > 0.005) u.beat.value = signal.beat ?? 0;
    u.melody.value = THREE.MathUtils.damp(
      u.melody.value,
      Math.max(0, Math.min(1, ((signal.note ?? 62) - 50) / 24)),
      0.7,
      dt,
    );
    return music;
  }
  setLivingTexture(
    texture: THREE.Texture | null,
    previous: THREE.Texture | null = texture,
    blend = 1,
  ) {
    const u = this.mesh.material.uniforms;
    u.livingEnabled.value = texture ? 1 : 0;
    u.living.value = texture ?? u.paper.value;
    u.livingPrevious.value = previous ?? u.paper.value;
    u.livingBlend.value = blend;
  }
  setPalette(ids: string[]) {
    const score = composeWeather(ids),
      u = this.mesh.material.uniforms;
    const identity = universeIdentity(ids);
    u.worldMode.value = identity.mode;
    u.partnerModes.value.set(
      identity.modes[0],
      identity.modes[1] ?? identity.modes[0],
      identity.modes[2] ?? identity.modes[0],
    );
    u.space.value.fromArray(identity.space);
    u.worldStyle.value.set(
      identity.mass,
      identity.opacity,
      identity.void * identity.hand,
      identity.speed,
    );
    u.layers.value = score.entries.length;
    u.kinds.value.set(
      ...([0, 1, 2].map((i) => identity.modes[i % identity.modes.length]) as [
        number,
        number,
        number,
      ]),
    );
    u.encounters.value.fromArray(score.encounters);
    ["a", "b", "c"].forEach((key, i) =>
      u[key].value.set(identity.colors[i % identity.colors.length]),
    );
  }
  update(time: number, dt: number, paused: boolean, inside: boolean) {
    this.mesh.visible = inside;
    const u = this.mesh.material.uniforms;
    u.time.value = time;
    u.presence.value = paused
      ? 0.85
      : THREE.MathUtils.damp(u.presence.value, 0.85, 1.2, dt);
  }
  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
