import * as THREE from "three";

/** One optional, bounded five-tap optical pass. No bloom, temporal history or camera roll. */
export class CameraPoetics {
  private target: THREE.WebGLRenderTarget | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.Camera();
  private width = 1;
  private height = 1;
  private reduced = false;
  private amount = 0;
  private mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  calls = 0;
  constructor() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3),
    );
    this.mesh = new THREE.Mesh(
      geometry,
      new THREE.ShaderMaterial({
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
          image: { value: null },
          texel: { value: new THREE.Vector2(1, 1) },
          time: { value: 0 },
          presence: { value: 0 },
        },
        vertexShader: `varying vec2 vUv;void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position,1.);}`,
        fragmentShader: `uniform sampler2D image;uniform vec2 texel;uniform float time,presence;varying vec2 vUv;
      void main(){
        // Long, overlapping optical windows, independent from musical attacks.
        float opening=smoothstep(.72,.98,.5+.5*sin(time*.057-.9));
        float ink=smoothstep(.78,.99,.5+.5*sin(time*.043+1.1));
        vec2 edge=abs(vUv-.5)*2.;float periphery=smoothstep(.3,.95,max(edge.x,edge.y));
        vec2 delta=texel*(.7+opening*2.2*periphery);
        vec3 center=texture2D(image,vUv).rgb;
        vec3 left=texture2D(image,clamp(vUv-vec2(delta.x,0.),vec2(0.),vec2(1.))).rgb;
        vec3 right=texture2D(image,clamp(vUv+vec2(delta.x,0.),vec2(0.),vec2(1.))).rgb;
        vec3 top=texture2D(image,clamp(vUv+vec2(0.,delta.y),vec2(0.),vec2(1.))).rgb;
        vec3 bottom=texture2D(image,clamp(vUv-vec2(0.,delta.y),vec2(0.),vec2(1.))).rgb;
        vec3 wash=mix(center,(center*2.+left+right+top+bottom)/6.,opening*periphery*.55);
        float contour=clamp(length(left-right)+length(top-bottom),0.,1.);
        wash*=1.-contour*ink*.2;
        // Keep the central gaze sharp; the effect never obscures words or controls.
        vec3 color=mix(center,wash,presence);
        gl_FragColor=vec4(color,1.);
        #include <colorspace_fragment>
      }`,
      }),
    );
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }
  resize(width: number, height: number) {
    this.width = Math.max(1, Math.round(width));
    this.height = Math.max(1, Math.round(height));
    this.target?.setSize(this.width, this.height);
    this.mesh.material.uniforms.texel.value.set(
      1 / this.width,
      1 / this.height,
    );
  }
  setReducedQuality() {
    this.reduced = true;
  }
  update(time: number, dt: number, enabled: boolean, paused: boolean) {
    if (!paused)
      this.amount = THREE.MathUtils.damp(
        this.amount,
        enabled && !this.reduced ? 1 : 0,
        1.4,
        dt,
      );
    this.mesh.material.uniforms.time.value = time;
    this.mesh.material.uniforms.presence.value = this.amount;
  }
  render(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
  ) {
    if (this.amount < 0.002) {
      renderer.render(scene, camera);
      this.calls = renderer.info.render.calls;
      return;
    }
    if (!this.target) {
      this.target = new THREE.WebGLRenderTarget(this.width, this.height, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        generateMipmaps: false,
      });
      this.mesh.material.uniforms.image.value = this.target.texture;
    }
    const previous = renderer.getRenderTarget();
    renderer.setRenderTarget(this.target);
    renderer.render(scene, camera);
    const sceneCalls = renderer.info.render.calls;
    renderer.setRenderTarget(previous);
    renderer.render(this.scene, this.camera);
    this.calls = sceneCalls + renderer.info.render.calls;
  }
  reset() {
    this.amount = 0;
    this.mesh.material.uniforms.presence.value = 0;
  }
  inspect() {
    return {
      amount: this.amount,
      width: this.width,
      height: this.height,
      reduced: this.reduced,
      allocated: !!this.target,
    };
  }
  dispose() {
    this.target?.dispose();
    this.target = null;
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
