import * as THREE from "three";
import { composeWeather } from "./composition";

/** Six spatial pigment membranes, one draw, shared grain and static buffers.
 * All deformation is reconstructed from the original parameter grid on the GPU. */
export class AbstractResonances {
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  constructor(paper: THREE.Texture) {
    const points: number[] = [],
      slots: number[] = [],
      indices: number[] = [];
    const along = 64,
      across = 8;
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
          livingEnabled: { value: 0 },
          time: { value: 0 },
          presence: { value: 0 },
          kinds: { value: new THREE.Vector3() },
          layers: { value: 1 },
          a: { value: new THREE.Color() },
          b: { value: new THREE.Color() },
          c: { value: new THREE.Color() },
          encounters: { value: new THREE.Vector3() },
        },
        vertexShader: `attribute float slot;uniform float time,layers;uniform vec3 kinds;varying vec2 inkUV;varying float family,kind,fold,membrane;
      void main(){membrane=slot;float u=position.x,v=position.y;inkUV=position.xy;family=mod(slot,layers);
        kind=family<.5?kinds.x:family<1.5?kinds.y:kinds.z;
        float seed=slot*2.39996,t=time*.055+seed;
        float angle=(u-.5)*5.2+t*.32;
        float radius=1.6+sin(u*4.+t)*.35;
        vec3 p=vec3(cos(angle)*radius,sin(angle)*radius*.65,(v-.5)*2.);
        if(kind<.5||abs(kind-5.)<.1){p=vec3((u-.5)*5.,sin(u*5.+t)*.7+(v-.5)*1.5,cos(u*4.+t)*.8+sin(v*3.14)*.6);}
        else if(abs(kind-1.)<.1||kind>10.5){p=vec3((v-.5)*1.8+sin(u*7.+t)*.3,(u-.5)*5.,cos(u*6.+t)*.65);}
        else if(abs(kind-2.)<.1||abs(kind-7.)<.1){p=vec3((u-.5)*6.,sin(u*8.-t)*.55+(v-.5)*1.2,cos(u*5.+t+v)*.9);}
        else if(abs(kind-3.)<.1||kind>9.5){p=vec3((u-.5)*4.8,(v-.5)*2.8+sin(u*4.+t)*.5,sin(u*5.+v*3.+t)*.85);}
        else if(abs(kind-8.)<.1){p=vec3((u-.5)*5.,sin(u*7.+t)*1.2+(v-.5)*2.,cos(u*4.-t)*.8);}
        p.z+=sin(v*6.+u*8.+t)*.18;
        fold=.5+.5*sin(u*8.+v*5.+t);
        float az=seed*.75;float x=p.x;p.x=x*cos(az)+p.z*sin(az);p.z=-x*sin(az)+p.z*cos(az);
        p+=vec3(sin(seed)*5.5,18.+cos(seed)*1.5,-5.+cos(seed*.9)*4.5);
        p.y+=sin(time*.021+seed)*.6;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
      }`,
        fragmentShader: `uniform sampler2D paper,living;uniform float time,presence,livingEnabled;uniform vec3 a,b,c,encounters;varying vec2 inkUV;varying float family,kind,fold,membrane;
      void main(){vec2 uv=inkUV;vec4 grain=texture2D(paper,uv*.46+vec2(.015,.515));
        vec4 pool=texture2D(paper,uv*.43+vec2(.515,.015));
        float edge=smoothstep(0.,.15,uv.x)*smoothstep(0.,.15,1.-uv.x)*smoothstep(0.,.22,uv.y)*smoothstep(0.,.22,1.-uv.y);
        float holes=smoothstep(.1,.36,grain.a+pool.a*.45);
        float rim=exp(-abs(grain.b-.5)*32.);
        vec3 pigment=family<.5?a:family<1.5?b:c;
        pigment=mix(pigment,vec3(.86,.72,.43),encounters.x*fold*.22);
        pigment=mix(pigment,vec3(.85,.9,.94),encounters.y*.3+encounters.z*.2);
        if(abs(kind-6.)<.1) pigment=mix(pigment,.62+.18*cos(vec3(0.,2.1,4.2)+uv.x*4.),.6);
        float wet=.5+.5*sin(time*.025+family*2.+uv.x*3.);
        vec3 color=pigment*(.65+grain.g*.28+fold*.12-rim*.12);
        float alpha=edge*holes*(.25+pool.a*.4+rim*.13)*presence*(.8+wet*.2);
        if(livingEnabled>.5 && membrane<.5){
          vec3 paint=texture2D(living,uv).rgb;
          float deposit=smoothstep(.035,.24,1.-dot(paint,vec3(.2126,.7152,.0722)));
          color=mix(color,paint,.82*deposit);
          alpha=max(alpha,edge*deposit*presence*.86);
        }
        if(alpha<.005)discard;gl_FragColor=vec4(color,alpha);
        #include <colorspace_fragment>
      }`,
      }),
    );
    this.mesh.material.forceSinglePass = true;
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }
  setLivingTexture(texture: THREE.Texture | null) {
    const u = this.mesh.material.uniforms;
    u.livingEnabled.value = texture ? 1 : 0;
    u.living.value = texture ?? u.paper.value;
  }
  setPalette(ids: string[]) {
    const score = composeWeather(ids),
      u = this.mesh.material.uniforms;
    u.layers.value = score.entries.length;
    u.kinds.value.set(
      ...([0, 1, 2].map((i) => score.kinds[i % score.kinds.length]) as [
        number,
        number,
        number,
      ]),
    );
    u.encounters.value.fromArray(score.encounters);
    ["a", "b", "c"].forEach((key, i) =>
      u[key].value.set(score.palettes[i % score.palettes.length].color),
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
