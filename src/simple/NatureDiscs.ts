import * as THREE from "three";
import type { NaturePhoto } from "./naturePhotos";
/** Six cropped photographs, one modest atlas, one draw, no external scene assets. */
export class NatureDiscs {
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private canvas = document.createElement("canvas");
  private texture: THREE.CanvasTexture;
  private count = 0;
  private right = new THREE.Vector3();
  private up = new THREE.Vector3();
  private center = new THREE.Vector3();
  private corner = new THREE.Vector3();
  constructor(paper: THREE.Texture) {
    this.canvas.width = 768;
    this.canvas.height = 512;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.generateMipmaps = false;
    this.texture.minFilter = THREE.LinearFilter;
    const geometry = new THREE.BufferGeometry(),
      uv: number[] = [],
      local: number[] = [],
      indices: number[] = [];
    for (let i = 0; i < 6; i++) {
      const x = (i % 3) / 3,
        y = Math.floor(i / 3) / 2;
      uv.push(
        x,
        1 - y - 0.5,
        x + 1 / 3,
        1 - y - 0.5,
        x,
        1 - y,
        x + 1 / 3,
        1 - y,
      );
      local.push(0, 0, 1, 0, 0, 1, 1, 1);
      const k = i * 4;
      indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(72), 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geometry.setAttribute("local", new THREE.Float32BufferAttribute(local, 2));
    geometry.setIndex(indices);
    geometry.setDrawRange(0, 0);
    this.mesh = new THREE.Mesh(
      geometry,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          map: { value: this.texture },
          paper: { value: paper },
          presence: { value: 0 },
        },
        vertexShader: `attribute vec2 local;varying vec2 vUv,disc;void main(){vUv=uv;disc=local;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `uniform sampler2D map,paper;uniform float presence;varying vec2 vUv,disc;
        void main(){vec4 grain=texture2D(paper,disc*.47+vec2(.015,.51));float radius=length(disc-.5)*2.;
          float mask=1.-smoothstep(.7,.99,radius+(grain.b-.5)*.09);if(mask<.01)discard;
          vec2 texel=vec2(1./768.,1./512.);
          vec2 cellOrigin=vUv-disc*vec2(1./3.,.5);
          vec2 uv=clamp(vUv+(grain.gb-.5)*texel*1.6,cellOrigin+texel*3.,cellOrigin+vec2(1./3.,.5)-texel*3.);
          vec3 center=texture2D(map,uv).rgb;
          vec3 left=texture2D(map,uv-vec2(texel.x*1.8,0.)).rgb,right=texture2D(map,uv+vec2(texel.x*1.8,0.)).rgb;
          vec3 top=texture2D(map,uv+vec2(0.,texel.y*1.8)).rgb,bottom=texture2D(map,uv-vec2(0.,texel.y*1.8)).rgb;
          vec3 wash=center*.5+(left+right+top+bottom)*.125;
          vec3 bands=floor(wash*8.+.5)/8.;wash=mix(wash,bands,.32);
          float contour=clamp(length(left-right)+length(top-bottom),0.,1.);
          float pool=exp(-abs(grain.b-.5)*30.);
          vec3 image=wash*(1.-contour*.25-pool*.07+(grain.g-.5)*.1);
          float light=dot(image,vec3(.2126,.7152,.0722));image=mix(vec3(light),image,.88);
          image=mix(image,vec3(.88,.84,.74),.08+(1.-grain.a)*.07);
          gl_FragColor=vec4(image,mask*presence*(.82+grain.a*.18));\n#include <colorspace_fragment>\n}`,
      }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }
  get size() {
    return this.count;
  }
  setPhotos(photos: NaturePhoto[]) {
    const ctx = this.canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 768, 512);
    this.count = Math.min(6, photos.length);
    for (let i = 0; i < this.count; i++) {
      const image = photos[i].bitmap,
        side = Math.min(image.width, image.height);
      ctx.drawImage(
        image,
        (image.width - side) / 2,
        (image.height - side) / 2,
        side,
        side,
        (i % 3) * 256,
        Math.floor(i / 3) * 256,
        256,
        256,
      );
    }
    this.texture.needsUpdate = true;
    this.mesh.geometry.setDrawRange(0, this.count * 6);
    this.mesh.material.uniforms.presence.value = 0;
  }
  update(
    time: number,
    dt: number,
    camera: THREE.Camera,
    paused: boolean,
    inside: boolean,
  ) {
    this.mesh.visible = inside && this.count > 0;
    if (!this.mesh.visible) return;
    const presence = this.mesh.material.uniforms.presence;
    presence.value = paused
      ? 0.4
      : THREE.MathUtils.damp(presence.value, 0.4, 1.1, dt);
    this.right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    this.up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    const buffer = this.mesh.geometry.attributes
      .position as THREE.BufferAttribute;
    for (let i = 0; i < this.count; i++) {
      const angle = i * 2.39996 + 0.25 + time * 0.008;
      this.center.set(
        Math.sin(angle) * (7 + i * 0.6),
        18 + Math.sin(time * 0.08 + i * 1.7) * 1.5,
        -5 - Math.cos(angle) * (5 + i * 0.4),
      );
      const size = 2.2 + (i % 3) * 0.5;
      for (let j = 0; j < 4; j++) {
        this.corner
          .copy(this.center)
          .addScaledVector(this.right, ((j % 2) - 0.5) * size)
          .addScaledVector(this.up, (Math.floor(j / 2) - 0.5) * size);
        buffer.setXYZ(i * 4 + j, this.corner.x, this.corner.y, this.corner.z);
      }
    }
    buffer.needsUpdate = true;
  }
  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.texture.dispose();
    this.canvas.width = this.canvas.height = 0;
  }
}
