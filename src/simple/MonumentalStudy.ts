import * as THREE from "three";
import type { MusicSignal } from "./MusicSignal";

/** One authored study before any further emotional variants. Flip to restore the previous composition. */
export const MONUMENTAL_STUDY = true;
export const STUDY_PALETTE = ["water", "longing"];

/** One batched formation and a quiet paper vault. No additive effects or decorative emitters. */
export class MonumentalStudy {
  readonly group = new THREE.Group();
  readonly material: THREE.ShaderMaterial;
  private geometry: THREE.BufferGeometry;
  private sky: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private energy = 0;
  constructor(paper: THREE.Texture, mobile: boolean) {
    const positions: number[] = [],
      slots: number[] = [],
      indices: number[] = [];
    const nx = mobile ? 48 : 80,
      ny = mobile ? 28 : 40;
    for (let id = 0; id < 3; id++) {
      const start = positions.length / 3;
      for (let y = 0; y <= ny; y++)
        for (let x = 0; x <= nx; x++) {
          positions.push(x / nx, y / ny, 0);
          slots.push(id);
        }
      for (let y = 0; y < ny; y++)
        for (let x = 0; x < nx; x++) {
          const a = start + y * (nx + 1) + x,
            b = a + nx + 1;
          indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
    }
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    this.geometry.setAttribute(
      "slot",
      new THREE.Float32BufferAttribute(slots, 1),
    );
    this.geometry.setIndex(indices);
    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        paper: { value: paper },
        reaction: { value: paper },
        reactionEnabled: { value: 0 },
        time: { value: 0 },
        energy: { value: 0 },
        indigo: { value: new THREE.Color("#172d48") },
        slate: { value: new THREE.Color("#587e87") },
        earth: { value: new THREE.Color("#b55d40") },
        ivory: { value: new THREE.Color("#f1eadf") },
      },
      vertexShader: `attribute float slot;uniform float time,energy;varying vec2 inkUV;varying vec3 worldPoint;varying float layer;
    void main(){inkUV=position.xy;layer=slot;float u=position.x,v=position.y;
     float x=(u-.5)*16.,y=(v-.5)*11.;
     float slow=time*.018;
     float fold=sin(x*.28+sin(y*.37+slot))*1.1+sin(y*.46+x*.13+slot)*.65;
     vec3 p=vec3(x+sin(y*.31+slot)*.7,y+sin(x*.24+slot)*.65,fold);
     p.z+=sin(x*.4+y*.29-slow+slot)*(.15+energy*.16);
     if(slot<.5){p.z-=5.;p.y+=18.;}
     else if(slot<1.5){p.x=p.x*.56-6.;p.y=p.y*.8+17.;p.z=p.z*.7-8.+x*.3;}
     else {p.x=p.x*.32+2.7+sin(v*3.14159)*.8;p.y=p.y*.8+17.3;p.z=p.z*.65-12.-x*.24;}
     worldPoint=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
    }`,
      fragmentShader: `uniform sampler2D paper,reaction;uniform float reactionEnabled,time,energy;uniform vec3 indigo,slate,earth,ivory;varying vec2 inkUV;varying vec3 worldPoint;varying float layer;
    void main(){vec2 uv=inkUV;vec2 p=uv-.5;
     vec4 broad=texture2D(paper,uv*.29+vec2(.08,.53));
     vec4 middle=texture2D(paper,uv*.44+vec2(.52,.02));
     vec4 fine=texture2D(paper,uv*.44+vec2(.03,.53));
     float contour=length(p*vec2(1.45,1.8))+(broad.b-.5)*.42+(middle.b-.5)*.15;
     float silhouette=1.-smoothstep(.48,.88,contour);
     silhouette*=smoothstep(0.,.06,uv.x)*smoothstep(0.,.06,1.-uv.x)*smoothstep(0.,.06,uv.y)*smoothstep(0.,.06,1.-uv.y);
     // One generous, irregular passage. No cellular motifs punched across the surface.
     vec2 opening=uv-vec2(.55,.46);
     float passage=length(opening*vec2(2.8,4.2))+(broad.b-.5)*.4+sin(uv.y*9.)*.06;
     float reserve=1.-smoothstep(.34,.63,passage);
     if(layer>.5)reserve*=.25;
     silhouette*=1.-reserve;
     if(silhouette<.008)discard;
     float rd=0.;if(reactionEnabled>.5)rd=texture2D(reaction,uv*.86+.07).g;
     float tide=middle.b*.48+broad.a*.32+fine.r*.2;
     float veins=smoothstep(.3,.58,tide+rd*.24);
     float dry=exp(-abs(middle.b-.48)*32.);
     float terra=smoothstep(.38,.57,uv.x*.72+broad.b*.22+uv.y*.06);
     if(layer>1.5)terra*=.4;
     vec3 pigment=mix(indigo,earth,terra);
     pigment=mix(pigment,slate,(1.-veins)*.2);
     // Dense pooled ink, translucent washes and dry paper breaks share the same body.
     float saturation=.86+veins*.12+dry*.05+rd*.04;
     vec3 color=mix(ivory,pigment,clamp(saturation,.2,.98));
     color*=.83+fine.g*.2;
     vec3 normal=normalize(cross(dFdx(worldPoint),dFdy(worldPoint)));
     float light=.85+.15*abs(dot(normal,normalize(vec3(-.45,.75,.6))));
     color*=light;
     float paperBreak=smoothstep(.68,.94,fine.g)*smoothstep(.3,.65,middle.a);
     color=mix(color,ivory,paperBreak*.2);
     float edgePool=exp(-abs(contour-.66)*35.)*.22;
     color=mix(color,pigment*.58,edgePool);
     float alpha=silhouette*(.88+veins*.11)*(1.-paperBreak*.14);
     if(layer>.5)alpha*=.8;
     float distanceToEye=distance(cameraPosition,worldPoint);
     color=mix(color,ivory,smoothstep(28.,50.,distanceToEye)*.3);
     gl_FragColor=vec4(color,alpha);
     #include <colorspace_fragment>
    }`,
    });
    this.material.forceSinglePass = true;
    const formation = new THREE.Mesh(this.geometry, this.material);
    formation.frustumCulled = false;
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(42, 24, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          paper: { value: paper },
          ivory: { value: new THREE.Color("#eee8dd") },
        },
        vertexShader: `varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `uniform sampler2D paper;uniform vec3 ivory;varying vec3 direction;void main(){vec3 d=normalize(direction);float grain=texture2D(paper,d.xy*.41+vec2(.04,.52)).g;vec3 color=ivory*(.97+grain*.035);color+=vec3(.015)*smoothstep(-.3,.6,d.y);gl_FragColor=vec4(color,1.);\n#include <colorspace_fragment>\n}`,
      }),
    );
    this.sky.position.set(0, 18, -5);
    this.sky.renderOrder = -10;
    this.group.add(this.sky, formation);
  }
  update(
    time: number,
    dt: number,
    signal: Readonly<MusicSignal>,
    texture: THREE.Texture | null,
  ) {
    this.energy = THREE.MathUtils.damp(this.energy, signal.energy, 1.2, dt);
    this.material.uniforms.time.value = time;
    this.material.uniforms.energy.value = this.energy;
    this.material.uniforms.reactionEnabled.value = texture ? 1 : 0;
    this.material.uniforms.reaction.value =
      texture ?? this.material.uniforms.paper.value;
  }
  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.sky.geometry.dispose();
    this.sky.material.dispose();
  }
}

const points = [
  new THREE.Vector3(6, 20, 13),
  new THREE.Vector3(2, 19, 4),
  new THREE.Vector3(0.6, 17.8, -4.7),
  new THREE.Vector3(0.3, 18, -11),
  new THREE.Vector3(9, 21, -16),
  new THREE.Vector3(14, 23, -2),
  new THREE.Vector3(8, 22, 12),
];
const path = new THREE.CatmullRomCurve3(points, true, "centripetal");
const position = new THREE.Vector3();
const gazeTargets = [
  new THREE.Vector3(-1, 18, -5),
  new THREE.Vector3(0.6, 18, -5),
  new THREE.Vector3(0.3, 18, -12),
  new THREE.Vector3(6, 19, -14),
  new THREE.Vector3(2, 18, -7),
  new THREE.Vector3(0, 18, -5),
  new THREE.Vector3(0, 18, -5),
];
const yaw: number[] = [],
  pitch: number[] = [];
for (let i = 0; i < points.length; i++) {
  const d = gazeTargets[i].clone().sub(points[i]);
  let angle = Math.atan2(d.x, -d.z);
  if (i) {
    while (angle - yaw[i - 1] > Math.PI) angle -= Math.PI * 2;
    while (angle - yaw[i - 1] < -Math.PI) angle += Math.PI * 2;
  }
  yaw.push(angle);
  pitch.push(Math.atan2(d.y, Math.hypot(d.x, d.z)));
}
function cubic(a: number, b: number, c: number, d: number, t: number) {
  return (
    0.5 *
    (2 * b +
      (-a + c) * t +
      (2 * a - 5 * b + 4 * c - d) * t * t +
      (-a + 3 * b - 3 * c + d) * t * t * t)
  );
}
function heading(values: number[], index: number, turns: boolean) {
  const n = values.length,
    cycle = Math.floor(index / n);
  return values[((index % n) + n) % n] + (turns ? cycle * Math.PI * 2 : 0);
}
export const STUDY_PERIOD = 210;
export function sampleStudyTravel(time: number, out: Float64Array) {
  const t = (((time / STUDY_PERIOD) % 1) + 1) % 1;
  path.getPoint(t, position);
  const phase = t * points.length,
    index = Math.floor(phase),
    u = phase - index;
  const a = cubic(
    heading(yaw, index - 1, true),
    heading(yaw, index, true),
    heading(yaw, index + 1, true),
    heading(yaw, index + 2, true),
    u,
  );
  const b = cubic(
    heading(pitch, index - 1, false),
    heading(pitch, index, false),
    heading(pitch, index + 1, false),
    heading(pitch, index + 2, false),
    u,
  );
  out[0] = position.x;
  out[1] = position.y;
  out[2] = position.z;
  out[3] = position.x + Math.sin(a) * Math.cos(b) * 8;
  out[4] = position.y + Math.sin(b) * 8;
  out[5] = position.z - Math.cos(a) * Math.cos(b) * 8;
  return out;
}
