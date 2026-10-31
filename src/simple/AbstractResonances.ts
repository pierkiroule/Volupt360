import { ProjectiveComposition } from "./ProjectiveComposition";
import { universeIdentity } from "./UniverseIdentity";
import * as THREE from "three";
import type { MusicSignal } from "./MusicSignal";
import { composeWeather } from "./composition";

// Stable per-veil projections: one field, different orientations, no repeated UV seam.
const reactionCoordinates = `vec2 reactionUV(vec2 p,float m){
 vec2 q=mod(m,2.)<.5?p:vec2(1.-p.y,p.x);
 return clamp(q*.82+vec2(.06+mod(m,3.)*.035,.07+mod(m,2.)*.04),.005,.995);
}`;

/** Six spatial pigment membranes, one draw, shared grain and static buffers.
 * All deformation is reconstructed from the original parameter grid on the GPU. */
export class AbstractResonances {
  private lastNote = -1;
  private noteAge = 3;
  private composition = new ProjectiveComposition();
  get encounterSeed() {
    return this.composition.seed;
  }
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
          reaction: { value: paper },
          reactionEnabled: { value: 0 },
          centers: { value: this.composition.centers },
          neighbors: { value: this.composition.neighbors },
          neighborColors: { value: this.composition.colors },
          contactWeights: { value: this.composition.contact },
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
          soundLane: { value: 0 },
          soundBloom: { value: 0 },
          beat: { value: 0 },
          presence: { value: 0 },
          kinds: { value: new THREE.Vector3() },
          layers: { value: 1 },
          a: { value: new THREE.Color() },
          b: { value: new THREE.Color() },
          c: { value: new THREE.Color() },
          encounters: { value: new THREE.Vector3() },
        },
        vertexShader: `attribute float slot;uniform float time,layers,melody,beat,worldMode,soundLane,soundBloom;uniform vec3 kinds,music,space,partnerModes;uniform vec4 worldStyle;varying vec2 inkUV;varying float family,kind,fold,membrane;varying vec3 worldPoint,meetingPoint,meetingColor;varying float meetingStrength;uniform vec3 centers[6],neighbors[6],neighborColors[6];uniform float contactWeights[6];uniform sampler2D reaction;uniform float reactionEnabled;
      ${reactionCoordinates}
      void main(){membrane=slot;float u=position.x,v=position.y;inkUV=position.xy;family=mod(slot,layers);
        kind=family<.5?kinds.x:family<1.5?kinds.y:kinds.z;
        float seed=slot*2.39996,t=time*.035*worldStyle.w+seed;
        float mode=family<.5?partnerModes.x:family<1.5?partnerModes.y:partnerModes.z;
        float x=(u-.5)*8.,y=(v-.5)*5.1;
        float warp=sin(x*.61+sin(y*.83+t*.19)+seed)+.45*sin(y*1.39-x*.37-t*.13);
        float foldField=sin(y*.69+sin(x*.53+seed)+t*.17);
        vec3 p=vec3(x+foldField*.65,y+warp*.7,warp*.95+foldField*.8);
        // Distinct expressive proportions; no fixed rings, arches or silhouettes.
        if(abs(mode-1.)<.1){p.x*=.8;p.y*=1.35;}
        if(abs(mode-2.)<.1){p.z*=1.3;p.x*=.9;}
        if(abs(mode-3.)<.1){p.z+=sin(x*.9+y*.6+t*.2)*.65;}
        if(abs(mode-4.)<.1){p.z*=1.4;}
        if(abs(mode-7.)<.1){p.xy*=.9+.1*sin(t*.3+seed);}
        if(abs(mode-8.)<.1){p.x+=sin(y*.9+t*.2)*.8;}
        if(abs(mode-9.)<.1){p.x*=1.2;p.y*=.55;}
        if(abs(mode-10.)<.1){p.z*=.65;}
        if(abs(mode-11.)<.1){p.y+=sin(x*.8+t*.15)*.5;}
        p*=worldStyle.x;p.x*=worldStyle.z<0.?-1.:1.;
        float localSound=.12+.88*exp(-abs(slot-soundLane)*2.)*soundBloom;
        p.z+=sin(v*6.+u*8.+t)*(.22+(1.-exp(-music.x*localSound*2.5))*1.25)*sin(u*3.14159);
        p.y+=sin(u*9.-t*.7+seed)*music.y*localSound*.85*sin(v*3.14159);
        p.z+=sin(u*5.+v*3.+seed)*melody*music.x*localSound*.35;
        p.z+=sin(u*7.+seed)*(.5-.5*cos(beat*6.283185+u*1.5+seed))*.12*music.x*localSound*sin(u*3.14159);
        if(reactionEnabled>.5){
          float pigmentHeight=texture2D(reaction,reactionUV(position.xy,slot)).g;
          p.z+=(pigmentHeight-.1)*1.1*sin(u*3.14159)*sin(v*3.14159);
        }
        fold=.5+.5*sin(u*8.+v*5.+t);
        float az=seed*.75;float rotatedX=p.x;p.x=rotatedX*cos(az)+p.z*sin(az);p.z=-rotatedX*sin(az)+p.z*cos(az);
        int index=int(slot+.1);
        p+=centers[index];
        worldPoint=p;meetingPoint=neighbors[index];meetingColor=neighborColors[index];meetingStrength=contactWeights[index];
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
      }`,
        fragmentShader: `uniform sampler2D paper,living,livingPrevious,reaction;uniform float reactionEnabled,soundLane,soundBloom;uniform float time,presence,livingEnabled,livingBlend,melody,beat;uniform vec3 a,b,c,encounters,music;uniform vec4 worldStyle;varying vec2 inkUV;varying float family,kind,fold,membrane;varying vec3 worldPoint,meetingPoint,meetingColor;varying float meetingStrength;
      ${reactionCoordinates}
      void main(){vec2 uv=inkUV;vec4 grain=texture2D(paper,uv*.46+vec2(.015,.515));
        vec4 pool=texture2D(paper,uv*.43+vec2(.515,.015));
        // Large asymmetrical lobes, medium capillaries, then fine paper grain.
        vec4 macro=texture2D(paper,uv*.29+vec2(.1+mod(membrane,2.)*.5,.06));
        vec4 micro=texture2D(paper,uv*1.7+vec2(.13,.52));
        vec2 p=uv-.5;
        float contour=length(p*vec2(1.65,1.75))+(macro.b-.5)*.52+(pool.b-.5)*.18;
        float edge=1.-smoothstep(.38,.92,contour);
        edge*=smoothstep(0.,.08,uv.x)*smoothstep(0.,.08,1.-uv.x)*smoothstep(0.,.1,uv.y)*smoothstep(0.,.1,1.-uv.y);
        if(edge<.005)discard;
        float meeting=meetingStrength*(1.-smoothstep(.5,3.2,distance(worldPoint,meetingPoint)));
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
        float localSound=.12+.88*exp(-abs(membrane-soundLane)*2.)*soundBloom;
        pigment=mix(pigment,iridescence,music.x*localSound*(.1+fold*.12));
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
        if(reactionEnabled>.5){
          vec2 fieldUV=reactionUV(uv,membrane);
          // Local contact bends the pigment field and opens a water reserve.
          fieldUV+=vec2(macro.b-.5,pool.b-.5)*meeting*.045;
          float density=texture2D(reaction,fieldUV).g;
          vec2 gradient=vec2(texture2D(reaction,fieldUV+vec2(.008,0.)).g-density,
                             texture2D(reaction,fieldUV+vec2(0.,.008)).g-density);
          float rimInk=smoothstep(.006,.065,length(gradient));
          float poolInk=smoothstep(.018,.22,density);
          // Reaction-diffusion is the primary pigment, with clear water reserves.
          vec3 ink=max(vec3(.018),pigment*.36);
          vec3 wash=mix(pigment,vec3(.97,.95,.9),.28);
          vec3 matter=mix(wash,ink,clamp(poolInk*.65+rimInk*.65,0.,1.));
          matter*=.8+grain.g*.18+micro.g*.12;
          matter=mix(matter,meetingColor*.58,meeting*poolInk*.48);
          float ghost=smoothstep(.35,.7,macro.a)*(.5+.5*sin(time*.018+membrane*1.9));
          float medium=smoothstep(.18,.66,pool.a)*.2;
          float coverage=edge*(.14+poolInk*.62+rimInk*.14+medium);
          coverage*=1.-ghost*(1.-poolInk)*.45;
          coverage*=1.-meeting*(1.-poolInk)*.3;
          float wetEdge=edge*rimInk*.12;
          color=mix(color,matter,.88);
          color+=vec3(wetEdge*.12);
          alpha=mix(alpha,coverage*presence,.92);
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
    this.noteAge += dt;
    if (
      dt > 0 &&
      signal.energy > 0.02 &&
      signal.note !== undefined &&
      signal.note !== this.lastNote &&
      this.noteAge > 1.8
    ) {
      this.lastNote = signal.note;
      this.noteAge = 0;
      u.soundLane.value = ((signal.note % 6) + 6) % 6;
      u.soundBloom.value = 1;
    }
    u.soundBloom.value = THREE.MathUtils.damp(u.soundBloom.value, 0, 0.35, dt);
    if (dt > 0 && signal.energy > 0.005) u.beat.value = signal.beat ?? 0;
    u.melody.value = THREE.MathUtils.damp(
      u.melody.value,
      Math.max(0, Math.min(1, ((signal.note ?? 62) - 50) / 24)),
      0.7,
      dt,
    );
    return music;
  }
  setReactionTexture(texture: THREE.Texture | null) {
    const u = this.mesh.material.uniforms;
    u.reaction.value = texture ?? u.paper.value;
    u.reactionEnabled.value = texture ? 1 : 0;
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
    this.composition.setPalette(ids);
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
    this.composition.update(time, paused ? 0 : dt);
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
