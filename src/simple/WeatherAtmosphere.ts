import * as THREE from "three";
import { makeCloudAtlas } from "./CloudAtlas";
import { weatherClimate } from "./WeatherClimate";
export const ATMOSPHERIC_WEATHER = true;

/** Layered, lit cloud impostors, not a volumetric ray marcher. Three bounded draws. */
export class WeatherAtmosphere {
  readonly group = new THREE.Group();
  private texture = makeCloudAtlas();
  private sky: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private clouds: THREE.Mesh<
    THREE.InstancedBufferGeometry,
    THREE.ShaderMaterial
  >;
  private precipitation: THREE.Points<
    THREE.BufferGeometry,
    THREE.ShaderMaterial
  >;
  private climate = weatherClimate(["warm", "water"]);
  private readonly count: number;
  private centers: Float32Array;
  private sizes: Float32Array;
  private styles: Float32Array;
  private ordered: Float32Array;
  private orderedSizes: Float32Array;
  private orderedStyles: Float32Array;
  private order: number[];
  private depths: Float32Array;
  private moving: Float32Array;
  private movingSizes: Float32Array;
  private direction = new THREE.Vector3();
  private mist = 0;
  private lastTime = 0;
  constructor(mobile: boolean) {
    this.count = mobile ? 112 : 176;
    this.centers = new Float32Array(this.count * 3);
    this.sizes = new Float32Array(this.count * 2);
    this.styles = new Float32Array(this.count);
    this.ordered = new Float32Array(this.count * 3);
    this.orderedSizes = new Float32Array(this.count * 2);
    this.orderedStyles = new Float32Array(this.count);
    this.depths = new Float32Array(this.count);
    this.moving = new Float32Array(this.count * 3);
    this.movingSizes = new Float32Array(this.count * 2);
    this.order = Array.from({ length: this.count }, (_, i) => i);
    const plane = new THREE.PlaneGeometry(1, 1);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setIndex(plane.index);
    geometry.setAttribute("position", plane.attributes.position);
    geometry.setAttribute("uv", plane.attributes.uv);
    geometry.setAttribute(
      "center",
      new THREE.InstancedBufferAttribute(this.ordered, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    geometry.setAttribute(
      "size",
      new THREE.InstancedBufferAttribute(this.orderedSizes, 2).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    geometry.setAttribute(
      "style",
      new THREE.InstancedBufferAttribute(this.orderedStyles, 1).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    geometry.instanceCount = this.count;
    this.clouds = new THREE.Mesh(
      geometry,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          atlas: { value: this.texture },
          base: { value: new THREE.Color() },
          lit: { value: new THREE.Color() },
          horizon: { value: new THREE.Color() },
          haze: { value: 0 },
          mist: { value: 0 },
          night: { value: 0 },
        },
        vertexShader: `attribute vec3 center;attribute vec2 size;attribute float style;varying vec2 vUv;varying float family,range,height;
   void main(){vec4 view=modelViewMatrix*vec4(center,1.);range=-view.z;height=center.y;view.xy+=position.xy*size;vUv=uv;family=style;gl_Position=projectionMatrix*view;}`,
        fragmentShader: `uniform sampler2D atlas;uniform vec3 base,lit,horizon;uniform float haze,night,mist;varying vec2 vUv;varying float family,range,height;
   void main(){vec2 tile=vec2(mod(family,2.),floor(family/2.));vec4 puff=texture2D(atlas,(vUv*.98+.01+tile)*.5);
    float alpha=puff.a*smoothstep(.5,2.8,range);if(alpha<.008)discard;
    float light=clamp((puff.r-.4)*1.45+(height-19.)*.035,0.,1.);vec3 color=mix(base,lit,light);
    color=mix(color,horizon,smoothstep(12.,48.,range)*(.25+haze*.35));
    color=mix(color,lit,mist*.7);
    gl_FragColor=vec4(color,alpha*.92);\n#include <colorspace_fragment>\n}`,
      }),
    );
    this.clouds.name = "cloud-field";
    this.clouds.frustumCulled = false;
    this.clouds.renderOrder = 1;
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(55, 32, 20),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          zenith: { value: new THREE.Color() },
          horizon: { value: new THREE.Color() },
          sunColor: { value: new THREE.Color() },
          sun: { value: new THREE.Vector3() },
          night: { value: 0 },
          haze: { value: 0 },
          rainbow: { value: 0 },
          cover: { value: 0.5 },
          mist: { value: 0 },
          mistColor: { value: new THREE.Color() },
        },
        vertexShader: `varying vec3 ray;void main(){ray=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `uniform vec3 zenith,horizon,sunColor,sun,mistColor;uniform float night,haze,rainbow,cover,mist;varying vec3 ray;
    float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
    void main(){vec3 d=normalize(ray);float up=smoothstep(-.25,1.,d.y);
     vec3 color=mix(horizon,zenith,pow(up,.65+haze*.2));
     float mu=max(0.,dot(d,sun));float scatter=pow(mu,18.)*.36+pow(mu,3.)*.08;
     color=mix(color,sunColor,scatter*(1.-night)*(1.-cover*cover*cover*.85));
     color=mix(color,sunColor,smoothstep(.99992,.99997,mu)*(1.-night)*.9*(1.-cover*cover*cover*.92));
     color=mix(color,horizon,(1.-smoothstep(-.55,.0,d.y))*.6);
     float angle=acos(clamp(dot(d,-sun),-1.,1.));float band=exp(-pow((angle-.733)*65.,2.));
     vec3 spectrum=.52+.24*cos(vec3(0.,2.,4.)+(angle-.715)*120.);
     color=mix(color,spectrum,band*rainbow*smoothstep(-.1,.12,d.y)*.32);
     vec3 cell=floor(d*720.);float stars=step(.99925,hash(cell))*smoothstep(.08,.4,d.y)*night*.5;
     color+=stars;
     color=mix(color,mistColor,mist);gl_FragColor=vec4(color,1.);\n#include <colorspace_fragment>\n}`,
      }),
    );
    this.sky.renderOrder = -10;
    const count = mobile ? 640 : 1100,
      positions = new Float32Array(count * 3),
      seed = new Float32Array(count * 3);
    let state = 17913;
    const random = () =>
      (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
    for (let i = 0; i < count; i++) {
      const curtain = i % 2;
      positions[i * 3] = (curtain ? 7 : -8) + (random() - 0.5) * 5;
      positions[i * 3 + 1] = 10 + random() * 18;
      positions[i * 3 + 2] = -5 + (curtain ? -10 : 4) + (random() - 0.5) * 5;
      seed[i * 3] = random();
      seed[i * 3 + 1] = random();
      seed[i * 3 + 2] = random();
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    pg.setAttribute("seed", new THREE.BufferAttribute(seed, 3));
    this.precipitation = new THREE.Points(
      pg,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          time: { value: 0 },
          rain: { value: 0 },
          snow: { value: 0 },
          wind: { value: 0 },
          ratio: { value: 1 },
          color: { value: new THREE.Color("#b6c9d5") },
        },
        vertexShader: `attribute vec3 seed;uniform float time,rain,snow,wind,ratio;varying float alpha,flake;
    void main(){flake=step(seed.x,snow/(rain+snow+.0001));float speed=mix(8.+seed.y*4.,.35+seed.y*.4,flake);
     vec3 p=position;p.y=10.+mod(position.y-10.-time*speed,18.);p.x+=sin(time*.15+seed.z*6.)*flake+wind*(28.-p.y)*.3;
     vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
     gl_PointSize=clamp(mix(55.,100.,flake)*ratio/max(1.,-view.z),1.,12.*ratio);
     alpha=mix(rain,snow,flake)*smoothstep(10.,12.,p.y)*(1.-smoothstep(26.,28.,p.y))*smoothstep(.6,3.,-view.z)*(1.-smoothstep(20.,48.,-view.z));
    }`,
        fragmentShader: `uniform vec3 color;varying float alpha,flake;void main(){vec2 p=gl_PointCoord-.5;
    float drop=(1.-smoothstep(.025,.12,abs(p.x)))*(1.-smoothstep(.1,.5,abs(p.y)));
    float snow=exp(-dot(p,p)*24.);float mask=mix(drop,snow,flake);
    if(mask*alpha<.008)discard;gl_FragColor=vec4(mix(color,vec3(.96,.98,1.),flake),mask*alpha*.4);\n#include <colorspace_fragment>\n}`,
      }),
    );
    this.precipitation.frustumCulled = false;
    this.precipitation.renderOrder = 2;
    this.group.add(this.sky, this.clouds, this.precipitation);
    this.setPalette(["warm", "water"]);
  }
  setPalette(ids: string[]) {
    this.climate = weatherClimate(ids);
    const c = this.climate;
    let state = c.seed;
    const rand = () =>
      (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
    const groups = 14;
    for (let i = 0; i < this.count; i++) {
      const group = i % groups,
        a = group * 2.39996,
        sea = group > 9;
      const r = sea ? 24 : group < 2 ? 6 : 11 + (group % 3) * 3;
      const theta = rand() * 6.283,
        radius = Math.sqrt(rand()) * (sea ? 6 : 3.4);
      this.centers[i * 3] = Math.sin(a) * r + Math.cos(theta) * radius;
      this.centers[i * 3 + 1] =
        (sea ? 10.5 : 19 + Math.sin(a * 1.4) * 3.2) +
        rand() * (sea ? 1.3 : 3.5);
      this.centers[i * 3 + 2] = -5 + Math.cos(a) * r + Math.sin(theta) * radius;
      const scale = sea ? 8 : (3 + rand() * 2.6) * (0.8 + c.cover * 0.8);
      this.sizes[i * 2] = scale * (1 + c.haze * 0.6);
      this.sizes[i * 2 + 1] = scale * (sea ? 0.6 : 0.65 + rand() * 0.35);
      this.styles[i] = Math.floor(rand() * 4);
    }
    const horizon = new THREE.Color("#ccdeeb")
      .lerp(new THREE.Color("#9cabb7"), c.cover * 0.65)
      .lerp(new THREE.Color("#292c45"), c.night);
    const zenith = new THREE.Color("#3d8bc2")
      .lerp(new THREE.Color("#88949e"), c.cover * c.cover)
      .lerp(new THREE.Color("#091329"), c.night);
    const sunColor = new THREE.Color(c.warmth ? "#ffe2b6" : "#fff7e8");
    if (c.elevation < 0.25)
      horizon.lerp(new THREE.Color("#dbaf99"), c.warmth * 0.35 * (1 - c.night));
    const u = this.sky.material.uniforms;
    u.zenith.value.copy(zenith);
    u.horizon.value.copy(horizon);
    u.sunColor.value.copy(sunColor);
    u.sun.value.set(-0.55, c.elevation, -0.8).normalize();
    u.night.value = c.night;
    u.haze.value = c.haze;
    u.rainbow.value = c.rainbow;
    u.cover.value = c.cover;
    const v = this.clouds.material.uniforms;
    v.horizon.value.copy(horizon);
    v.haze.value = c.haze;
    v.night.value = c.night;
    v.base.value
      .set("#718497")
      .lerp(new THREE.Color("#364355"), c.rain * 0.6 + c.night * 0.3);
    v.lit.value
      .set("#fffaf2")
      .lerp(new THREE.Color("#c4ced8"), c.cover * 0.5)
      .lerp(new THREE.Color("#53627a"), c.night);
    u.mistColor.value.copy(v.lit.value);
    if (c.warmth && c.elevation < 0.3)
      v.lit.value.lerp(new THREE.Color("#edc1ab"), 0.22);
    this.precipitation.material.uniforms.rain.value = c.rain;
    this.precipitation.material.uniforms.snow.value = c.snow;
    this.precipitation.material.uniforms.wind.value = c.wind;
  }
  private compare = (a: number, b: number) => this.depths[b] - this.depths[a];
  update(time: number, camera: THREE.Camera, ratio: number) {
    camera.getWorldDirection(this.direction);
    this.sky.position.copy(camera.position);
    const c = this.climate;
    let density = 0;
    for (let i = 0; i < this.count; i++) {
      const group = i % 14,
        visible = group > 9 || group / 10 < c.cover + 0.13;
      const billow = 0.94 + 0.06 * Math.sin(time * 0.055 + i * 1.71);
      this.moving[i * 3] =
        this.centers[i * 3] + Math.sin(time * 0.015 + group) * c.wind * 3;
      this.moving[i * 3 + 1] =
        this.centers[i * 3 + 1] + Math.sin(time * 0.025 + i * 0.63) * 0.2;
      this.moving[i * 3 + 2] =
        this.centers[i * 3 + 2] + Math.cos(time * 0.011 + group) * c.wind * 2;
      this.movingSizes[i * 2] = this.sizes[i * 2] * billow;
      this.movingSizes[i * 2 + 1] = this.sizes[i * 2 + 1] * (2 - billow);
      if (visible) {
        const x =
            (this.moving[i * 3] - camera.position.x) /
            (this.movingSizes[i * 2] * 0.5),
          y =
            (this.moving[i * 3 + 1] - camera.position.y) /
            (this.movingSizes[i * 2 + 1] * 0.5),
          z =
            (this.moving[i * 3 + 2] - camera.position.z) /
            (this.movingSizes[i * 2] * 0.5);
        density += Math.max(0, 1 - Math.hypot(x, y, z)) * 0.32;
      }
      this.depths[i] =
        (this.moving[i * 3] - camera.position.x) * this.direction.x +
        (this.moving[i * 3 + 1] - camera.position.y) * this.direction.y +
        (this.moving[i * 3 + 2] - camera.position.z) * this.direction.z;
    }
    this.mist = THREE.MathUtils.damp(
      this.mist,
      Math.min(0.85, density),
      2,
      Math.max(0, Math.min(0.04, time - this.lastTime)),
    );
    this.lastTime = time;
    this.sky.material.uniforms.mist.value = this.mist;
    this.clouds.material.uniforms.mist.value = this.mist;
    this.order.sort(this.compare);
    for (let j = 0; j < this.count; j++) {
      const i = this.order[j],
        group = i % 14,
        visible = group > 9 || group / 10 < c.cover + 0.13;
      this.ordered[j * 3] = this.moving[i * 3];
      this.ordered[j * 3 + 1] = this.moving[i * 3 + 1];
      this.ordered[j * 3 + 2] = this.moving[i * 3 + 2];
      this.orderedSizes[j * 2] = visible ? this.movingSizes[i * 2] : 0;
      this.orderedSizes[j * 2 + 1] = visible ? this.movingSizes[i * 2 + 1] : 0;
      this.orderedStyles[j] = this.styles[i];
    }
    this.clouds.geometry.attributes.center.needsUpdate = true;
    this.clouds.geometry.attributes.size.needsUpdate = true;
    this.clouds.geometry.attributes.style.needsUpdate = true;
    this.precipitation.visible = c.rain > 0.02 || c.snow > 0.02;
    this.precipitation.material.uniforms.time.value = time;
    this.precipitation.material.uniforms.ratio.value = ratio;
  }
  inspect() {
    return {
      clouds: this.count,
      mist: this.mist,
      climate: this.climate,
      precipitation: this.precipitation.visible,
    };
  }
  dispose() {
    this.clouds.geometry.dispose();
    this.clouds.material.dispose();
    this.sky.geometry.dispose();
    this.sky.material.dispose();
    this.precipitation.geometry.dispose();
    this.precipitation.material.dispose();
    this.texture.dispose();
  }
}
