import * as THREE from "three";

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
        time: { value: 0 },
        a: { value: new THREE.Color("#519b9e") },
        b: { value: new THREE.Color("#c77868") },
        c: { value: new THREE.Color("#a49bb9") },
      },
      vertexShader: `varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform sampler2D paper;uniform float time;uniform vec3 a,b,c;varying vec3 direction;
      void main(){vec3 d=normalize(direction);float t=time*.008;
        // Continuous 3D coordinates projected onto two planes: no longitude seam.
        vec2 uv=d.xz*.24+vec2(d.y*.18,t);
        vec4 wash=texture2D(paper,uv+vec2(.5));
        vec4 grain=texture2D(paper,d.xy*.21+vec2(.5-t*.3,.5));
        float clouds=smoothstep(.19,.79,wash.a)*(.65+grain.a*.35);
        float veil=.5+.5*sin(d.x*3.+d.z*2.+sin(d.y*4.+t)*1.5+t);
        vec3 pigment=mix(a,b,veil);pigment=mix(pigment,c,smoothstep(-.3,.8,d.y)*.4);
        vec3 ivory=vec3(.91,.90,.86);
        vec3 color=mix(ivory,pigment,.18+clouds*.4);
        color+=vec3(.035)*grain.r;
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
        ratio: { value: 1 },
        a: { value: new THREE.Color() },
        b: { value: new THREE.Color() },
        c: { value: new THREE.Color() },
      },
      vertexShader: `uniform float time,ratio;attribute vec3 seed;varying vec3 particle;varying float fade;
      void main(){particle=seed;float t=time*(.025+seed.y*.025)+seed.x*6.28318;vec3 p=position;
        p.x+=sin(t+p.y*.3)*1.6;p.y+=sin(t*.71+p.z*.2)*1.2;p.z+=cos(t*.82+p.x*.16)*1.5;
        vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
        gl_PointSize=clamp((48.+seed.z*90.)*ratio/max(2.,-view.z),2.,18.*ratio);
        fade=smoothstep(.4,2.,-view.z)*(.45+.25*sin(t*.7+seed.z*6.));}`,
      fragmentShader: `uniform vec3 a,b,c;varying vec3 particle;varying float fade;
      void main(){vec2 p=gl_PointCoord-.5;float theta=particle.x*6.28318;mat2 rotation=mat2(cos(theta),-sin(theta),sin(theta),cos(theta));p=rotation*p;
        float kind=particle.y;
        float r=kind<.65?length(p*vec2(1.,2.7)):length(p);
        float alpha=1.-smoothstep(.05,.48,r);
        if(kind>.87){float cross=exp(-abs(p.x)*32.)*exp(-abs(p.y)*6.)+exp(-abs(p.y)*32.)*exp(-abs(p.x)*6.);alpha=min(1.,cross)*.5;}
        if(alpha<.015)discard;
        vec3 color=mix(a,b,particle.z);color=mix(color,c,particle.y*.35);
        gl_FragColor=vec4(color,alpha*fade*.75);\n#include <colorspace_fragment>\n}`,
    });
    this.particles = new THREE.Points(geometry, material);
    this.particles.frustumCulled = false;
  }
  setPalette(colors: string[]) {
    const values = colors.length ? colors : ["#519b9e"];
    for (const material of [this.sky.material, this.particles.material]) {
      ["a", "b", "c"].forEach((name, i) =>
        material.uniforms[name].value.set(values[i % values.length]),
      );
    }
  }
  update(time: number, camera: THREE.Camera, ratio: number) {
    this.sky.position.copy(camera.position);
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
