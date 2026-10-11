import * as THREE from "three";

export const NATURAL_VIEW = { contrast: 1, saturation: 1, threshold: 0 };
const clamp = (v, min, max, fallback) =>
  Number.isFinite(Number(v))
    ? Math.min(max, Math.max(min, Number(v)))
    : fallback;

/** One reusable fullscreen pass. Neutral settings bypass all extra rendering. */
export function createViewEffects(renderer) {
  const size = new THREE.Vector2();
  renderer.getDrawingBufferSize(size);
  const target = new THREE.WebGLRenderTarget(size.x, size.y, {
    depthBuffer: true,
    stencilBuffer: false,
  });
  target.samples = renderer.capabilities.isWebGL2 ? 2 : 0;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3),
  );
  const material = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    uniforms: {
      image: { value: target.texture },
      contrast: { value: 1 },
      saturation: { value: 1 },
      threshold: { value: 0 },
    },
    vertexShader: `varying vec2 vUv; void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position,1.);}`,
    fragmentShader: `uniform sampler2D image;
      uniform float contrast,saturation,threshold;varying vec2 vUv;
      void main(){
        vec3 linear=texture2D(image,vUv).rgb;
        vec3 original=pow(max(linear,vec3(0.)),vec3(1./2.2));
        float luma=dot(original,vec3(.2126,.7152,.0722));
        vec3 color=mix(vec3(luma),original,saturation);
        color=(color-.5)*contrast+.5;
        float ink=smoothstep(.42,.58,dot(color,vec3(.2126,.7152,.0722)));
        color=mix(color,mix(vec3(.055,.045,.06),vec3(.96,.94,.9),ink),threshold);
        // Preserve pale paper and distant washes; concentrate edits on pigment.
        color=mix(original,clamp(color,0.,1.),1.-smoothstep(.8,.96,luma));
        gl_FragColor=vec4(pow(max(color,vec3(0.)),vec3(2.2)),1.);
        #include <colorspace_fragment>
      }`,
  });
  const scene = new THREE.Scene();
  const quad = new THREE.Mesh(geometry, material);
  quad.frustumCulled = false;
  scene.add(quad);
  const camera = new THREE.Camera();
  let settings = { ...NATURAL_VIEW };
  return {
    set(next) {
      settings = {
        contrast: clamp(next.contrast, 0.6, 1.8, 1),
        saturation: clamp(next.saturation, 0, 1.8, 1),
        threshold: clamp(next.threshold, 0, 1, 0),
      };
      Object.entries(settings).forEach(([key, value]) => {
        material.uniforms[key].value = value;
      });
      return { ...settings };
    },
    render(world, view) {
      if (
        settings.contrast === 1 &&
        settings.saturation === 1 &&
        settings.threshold === 0
      ) {
        renderer.render(world, view);
        return;
      }
      renderer.setRenderTarget(target);
      renderer.render(world, view);
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    },
    resize() {
      renderer.getDrawingBufferSize(size);
      target.setSize(size.x, size.y);
    },
    dispose() {
      target.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}
