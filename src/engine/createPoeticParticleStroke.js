import * as THREE from "three";

/** Four moving motifs per deposit, batched into one bounded mesh per stroke. */
export function createPoeticParticleStroke(
  brush,
  { seed = 0, texture = null },
) {
  const capacity = 52,
    particles = 4,
    vertices = capacity * particles * 6;
  const group = new THREE.Group(),
    geometry = new THREE.BufferGeometry();
  for (const [name, size] of [
    ["position", 3],
    ["aOffset", 3],
    ["aTint", 3],
    ["uv", 2],
    ["aSeed", 1],
    ["aBirth", 1],
  ])
    geometry.setAttribute(
      name,
      new THREE.BufferAttribute(
        new Float32Array(vertices * size),
        size,
      ).setUsage(THREE.DynamicDrawUsage),
    );
  geometry.setDrawRange(0, 0);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uParticleTime: { value: 0 },
      uTime: { value: 0 },
      uAge: { value: 0 },
      uFade: { value: 1 },
      uOpacity: { value: 0.92 },
      uBrushMask: { value: texture?.texture || null },
      uHasMask: { value: texture?.photograph ? 1 : 0 },
      uKind: { value: brush.particle },
      uAudioEnergy: { value: 0 },
      uAudioLow: { value: 0 },
      uAudioPulse: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      attribute vec3 aOffset; attribute vec3 aTint; attribute float aSeed; attribute float aBirth;
      uniform float uParticleTime; uniform float uKind; uniform float uAudioEnergy; uniform float uAudioLow;
      varying vec2 vUv; varying vec3 vTint; varying float vPhase;
      void main() {
        float age = max(0.0, uParticleTime - aBirth);
        float phase = age * (uKind == 2.0 ? 1.2 : 0.7) + aSeed;
        vec3 drift = vec3(sin(phase), cos(phase * 0.83), sin(phase * 0.61 + aSeed)) * min(age * 0.3, 0.7);
        if (uKind == 3.0) drift *= 0.15;
        float flutter = sin(phase * 2.3) * (uKind == 1.0 ? 0.65 : 0.2);
        vec3 offset = aOffset * (0.85 + uAudioEnergy * 0.5 + uAudioLow * 0.15);
        offset.xz = mat2(cos(flutter), -sin(flutter), sin(flutter), cos(flutter)) * offset.xz;
        vUv = uv; vTint = aTint; vPhase = phase;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position + offset + drift, 1.0);
      }`,
    fragmentShader: `
      uniform sampler2D uBrushMask; uniform float uHasMask;
      uniform float uKind; uniform float uFade; uniform float uOpacity; uniform float uAudioEnergy; uniform float uAudioPulse;
      varying vec2 vUv; varying vec3 vTint; varying float vPhase;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float alpha = 0.0; float highlight = 0.0;
        if (uKind < 0.5) {
          float spine = p.x - 0.2 * sin(p.y * 2.7);
          float width = (1.0 - p.y * p.y) * 0.55;
          float vanes = 0.55 + 0.45 * smoothstep(-0.4, 0.5, sin(p.y * 42.0 + abs(spine) * 16.0));
          alpha = (1.0 - smoothstep(width - 0.04, width + 0.03, abs(spine))) * vanes;
          alpha = max(alpha, (1.0 - smoothstep(0.015, 0.04, abs(spine))) * (1.0 - smoothstep(0.92, 1.0, abs(p.y))));
        } else if (uKind < 1.5) {
          float shape = abs(p.x) / max(0.01, 0.65 * sin((p.y + 1.0) * 1.5708));
          alpha = 1.0 - smoothstep(0.9, 1.0, shape);
          float vein = 1.0 - smoothstep(0.01, 0.035, abs(p.x));
          float veins = 1.0 - smoothstep(0.02, 0.06, abs(sin(p.y * 18.0 - abs(p.x) * 20.0)));
          alpha *= 0.75 + 0.25 * max(vein, veins); highlight = vein * 0.18;
        } else if (uKind < 2.5) {
          float radius = length(p); alpha = exp(-radius * radius * 7.0) * (0.6 + 0.4 * sin(vPhase * 2.0) * sin(vPhase * 2.0));
          highlight = exp(-radius * radius * 45.0) * 0.65;
        } else if (uKind < 3.5) {
          float trunk = p.x - sin(p.y * 5.0) * 0.12;
          alpha = 1.0 - smoothstep(0.025, 0.065, abs(trunk));
          float branch = abs(p.x) - (1.0 - fract((p.y + 1.0) * 2.5)) * 0.6;
          alpha = max(alpha, (1.0 - smoothstep(0.02, 0.05, abs(branch))) * (1.0 - smoothstep(0.55, 0.8, abs(p.x))));
        } else if (uKind < 4.5) {
          for (int i = 0; i < 3; i++) {
            float thread = p.x - sin(p.y * 5.0 + float(i) * 2.1 + vPhase * 0.25) * 0.48;
            alpha = max(alpha, 1.0 - smoothstep(0.016, 0.05, abs(thread)));
          }
        } else {
          float hatch = abs(sin((p.x + p.y * 0.55) * 14.0 + sin(vPhase) * 0.5));
          alpha = (1.0 - smoothstep(0.12, 0.3, hatch)) * (1.0 - smoothstep(0.55, 1.0, length(p)));
        }
        alpha *= (1.0 - smoothstep(0.94, 1.0, abs(p.y))) * uFade * uOpacity * (0.65 + uAudioEnergy * 0.35 + uAudioPulse * 0.25);
        if (alpha < 0.01) discard;
        vec3 color=mix(vTint, vec3(1.0, 0.8, 0.3), highlight);
        if(uHasMask>.5){vec4 photo=texture2D(uBrushMask,clamp(vUv,vec2(.001),vec2(.999)));color=mix(color,photo.rgb,.92);alpha*=photo.a;}
        gl_FragColor = vec4(color, alpha);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  group.add(mesh);
  const base = new THREE.Color(brush.color),
    tint = new THREE.Color();
  const center = new THREE.Vector3(),
    offset = new THREE.Vector3();
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, -1],
    [1, 1],
    [-1, 1],
  ];
  let count = 0,
    used = 0,
    closed = false;
  return {
    group,
    padding: 3,
    append(sample) {
      if (closed || count >= capacity) return;
      const energy = THREE.MathUtils.clamp(sample.energy || 0.3, 0, 1);
      const scale = 0.45 + energy * 0.8;
      for (let i = 0; i < particles; i++) {
        const phase = seed * 1.7 + count * 2.399 + i * 1.57;
        center
          .copy(sample.position)
          .addScaledVector(sample.side, Math.cos(phase) * scale * 1.5)
          .addScaledVector(sample.up, Math.sin(phase) * scale * 1.5)
          .addScaledVector(sample.direction, Math.sin(phase * 1.3) * 0.4);
        const width =
          scale *
          (brush.particle === 2 ? 0.4 : brush.particle === 5 ? 1 : 0.65);
        const height = scale * (brush.particle === 2 ? 0.4 : 1.4);
        const angle = Math.sin(phase) * 0.9;
        tint
          .copy(base)
          .offsetHSL(Math.sin(phase) * 0.045, 0, Math.cos(phase) * 0.07);
        for (const [x, y] of corners) {
          offset
            .copy(sample.side)
            .multiplyScalar(
              x * width * Math.cos(angle) - y * height * Math.sin(angle),
            )
            .addScaledVector(
              sample.up,
              x * width * Math.sin(angle) + y * height * Math.cos(angle),
            );
          center.toArray(geometry.attributes.position.array, used * 3);
          offset.toArray(geometry.attributes.aOffset.array, used * 3);
          tint.toArray(geometry.attributes.aTint.array, used * 3);
          geometry.attributes.uv.setXY(used, (x + 1) / 2, (y + 1) / 2);
          geometry.attributes.aSeed.setX(used, phase);
          geometry.attributes.aBirth.setX(
            used,
            material.uniforms.uParticleTime.value,
          );
          used++;
        }
      }
      count++;
      geometry.setDrawRange(0, used);
      for (const attribute of Object.values(geometry.attributes))
        attribute.needsUpdate = true;
    },
    update(dt, features = {}) {
      material.uniforms.uAudioEnergy.value = features.energy || 0;
      material.uniforms.uAudioLow.value = features.low || 0;
      material.uniforms.uAudioPulse.value = features.pulse || 0;
      material.uniforms.uParticleTime.value +=
        dt * (1 + (features.energy || 0) * 1.2 + (features.high || 0) * 0.6);
    },
    finish() {
      closed = true;
    },
    setTexture(binding) {
      material.uniforms.uBrushMask.value = binding?.texture || null;
      material.uniforms.uHasMask.value = binding?.photograph ? 1 : 0;
    },
    get full() {
      return count >= capacity;
    },
    get count() {
      return count;
    },
  };
}
