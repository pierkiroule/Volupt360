import { createResonantEffects } from "./createResonantEffects.js";
import * as THREE from "three";
import { createPigmentEnvelope } from "../chill/createPigmentEnvelope.js";
export const ANIMATION_STYLES = [
  ["flow", "Courants · fluide"],
  ["breath", "Respiration · ample"],
  ["ripple", "Résonances · ondulantes"],
];
export function createResonantWorld({ autonomous = false } = {}) {
  const group = new THREE.Group(),
    envelope = createPigmentEnvelope();
  const uniforms = {
    drawing: { value: null },
    time: { value: 0 },
    energy: { value: 0 },
    style: { value: 0 },
    bands: { value: envelope.bands },
    accent: { value: 0 },
    pixelRatio: { value: Math.min(globalThis.devicePixelRatio || 1, 2) },
  };
  let texture = null,
    targetStyle = 0;
  const reduced = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
  const effects = createResonantEffects(
    uniforms,
    globalThis.matchMedia?.("(pointer: coarse)").matches ||
      globalThis.innerWidth < 600,
  );
  const geometry = new THREE.SphereGeometry(12, 128, 80);
  const autonomousBands = new Float32Array(6),
    autonomousAudio = { bands: autonomousBands, energy: 0.3, flux: 0 };
  const rates = [0.21, 0.17, 0.27, 0.19, 0.31, 0.14],
    offsets = [0, 1, 2, 0, 4, 2];
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms,
    vertexShader: `uniform sampler2D drawing;uniform float time,energy,style;uniform float bands[6];varying vec2 U;
    void main(){U=uv;vec4 ink=texture2D(drawing,uv);vec3 p=position;
    float phase=uv.x*18.+uv.y*11.;float motion=sin(phase-time*.35)*.5+sin(phase*1.7+time*.23)*.25;
    float breathing=sin(time*.3+uv.y*4.)*.65;
    float ripple=sin(length(uv-.5)*35.-time*.65)*.55;
    motion=motion*max(0.,1.-style)+breathing*max(0.,1.-abs(style-1.))+ripple*max(0.,style-1.);
    float density=dot(ink.rgb,vec3(.299,.587,.114));
    p*=.72+density*.22+motion*(.045+bands[0]*.22);
    p.x+=sin(phase*1.3+time*.28)*ink.a*bands[2]*.32;
    p.y+=cos(phase*2.1-time*.36)*ink.a*bands[4]*.22;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `uniform sampler2D drawing;uniform float time,energy,accent;uniform float bands[6];varying vec2 U;
    void main(){vec2 drift=vec2(sin(U.y*17.+time*.27),cos(U.x*23.-time*.21))*(.0015+bands[2]*.006);
    vec4 original=texture2D(drawing,U),ink=texture2D(drawing,vec2(fract(U.x+drift.x),clamp(U.y+drift.y,0.,1.)));
    ink=mix(original,ink,.42);if(ink.a<.005)discard;
    float pool=.5+.5*sin(U.x*31.+U.y*19.-time*.42);
    ink.rgb*=1.-pool*(.025+energy*.13+accent*.2);gl_FragColor=ink;
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = 20;
  mesh.frustumCulled = false;
  group.add(mesh, effects.group);
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
      effects.setCanvas(canvas);
      group.visible = true;
    },
    setStyle(id) {
      targetStyle = Math.max(
        0,
        ANIMATION_STYLES.findIndex((s) => s[0] === id),
      );
    },
    update(time, audio, dt) {
      if (autonomous) {
        for (let i = 0; i < 6; i++)
          autonomousBands[i] =
            0.27 + Math.sin(time * rates[i] + offsets[i]) * 0.11;
        envelope.update(autonomousAudio, dt);
      } else envelope.update(audio, dt);
      uniforms.style.value +=
        (targetStyle - uniforms.style.value) *
        (1 - Math.exp(-Math.max(0, dt) / 0.8));
      uniforms.time.value = reduced?.matches ? 0 : time;
      uniforms.accent.value = reduced?.matches ? 0 : envelope.accent;
      if (reduced?.matches) envelope.bands.fill(0);
      uniforms.energy.value =
        envelope.bands[0] * 0.55 + envelope.bands[2] * 0.45;
    },
    dispose() {
      effects.dispose();
      texture?.dispose();
      geometry.dispose();
      material.dispose();
      group.clear();
    },
  };
}
