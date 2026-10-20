import * as THREE from "three";
import { createPigmentEnvelope } from "../chill/createPigmentEnvelope.js";
export const ANIMATION_STYLES = [
  ["flow", "Courants · fluide"],
  ["breath", "Respiration · ample"],
  ["ripple", "Résonances · ondulantes"],
];
export function createResonantWorld() {
  const group = new THREE.Group(),
    envelope = createPigmentEnvelope();
  const uniforms = {
    drawing: { value: null },
    time: { value: 0 },
    energy: { value: 0 },
    style: { value: 0 },
  };
  let texture = null;
  const geometry = new THREE.SphereGeometry(12, 128, 80);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms,
    vertexShader: `uniform sampler2D drawing;uniform float time,energy,style;varying vec2 U;
    void main(){U=uv;vec4 ink=texture2D(drawing,uv);vec3 p=position;
    float phase=uv.x*18.+uv.y*11.;float motion=sin(phase-time*.35)*.5+sin(phase*1.7+time*.23)*.25;
    if(style>.5&&style<1.5)motion=sin(time*.3+uv.y*4.)*.65;
    if(style>1.5)motion=sin(length(uv-.5)*35.-time*.65)*.55;
    float density=dot(ink.rgb,vec3(.299,.587,.114));
    p*=.72+density*.22+motion*(.025+energy*.12);
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `uniform sampler2D drawing;varying vec2 U;
    void main(){vec4 ink=texture2D(drawing,U);if(ink.a<.005)discard;gl_FragColor=ink;
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = 20;
  mesh.frustumCulled = false;
  group.add(mesh);
  group.visible = false;
  return {
    group,
    setCanvas(canvas) {
      if (!texture) {
        texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        uniforms.drawing.value = texture;
      } else texture.image = canvas;
      texture.needsUpdate = true;
      group.visible = true;
    },
    setStyle(id) {
      uniforms.style.value = Math.max(
        0,
        ANIMATION_STYLES.findIndex((s) => s[0] === id),
      );
    },
    update(time, audio, dt) {
      envelope.update(audio, dt);
      uniforms.time.value = time;
      uniforms.energy.value =
        envelope.bands[0] * 0.55 + envelope.bands[2] * 0.45;
    },
    dispose() {
      texture?.dispose();
      geometry.dispose();
      material.dispose();
      group.clear();
    },
  };
}
