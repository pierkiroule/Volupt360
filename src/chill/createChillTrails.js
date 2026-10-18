import * as THREE from "three";
export function createChillTrails(mobile) {
  const count = mobile ? 640 : 1280,
    positions = new Float32Array(count * 3),
    colors = new Float32Array(count * 3),
    ages = new Float32Array(count),
    velocities = new Float32Array(count * 3),
    seeds = new Float32Array(count);
  ages.fill(1);
  let cursor = 0,
    serial = 0;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
  );
  geometry.setAttribute(
    "color",
    new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage),
  );
  geometry.setAttribute(
    "age",
    new THREE.BufferAttribute(ages, 1).setUsage(THREE.DynamicDrawUsage),
  );
  geometry.setAttribute(
    "style",
    new THREE.BufferAttribute(seeds, 1).setUsage(THREE.DynamicDrawUsage),
  );
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexColors: true,
    uniforms: { energy: { value: 0 } },
    vertexShader: `attribute float age,style;varying vec3 c;varying float a,kind;uniform float energy;void main(){kind=style;c=color;a=(1.-age)*smoothstep(0.,.04,age);vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp((22.+energy*20.)/max(1.,-p.z),1.,8.);}`,
    fragmentShader: `varying vec3 c;varying float a,kind;void main(){vec2 q=(gl_PointCoord-.5)*2.;if(kind>.5&&kind<1.5)q*=vec2(2.,.7);if(kind>1.5&&kind<2.5)q*=vec2(.65,2.5);float r=length(q);float alpha=(1.-smoothstep(.05,1.,r))*a*.7;if(kind>4.5)alpha*=smoothstep(.18,.5,r);if(alpha<.002)discard;gl_FragColor=vec4(c,alpha);
 #include <colorspace_fragment>
 }`,
  });
  const object = new THREE.Points(geometry, material);
  object.frustumCulled = false;
  return {
    object,
    emit(position, color, style = 0) {
      for (let j = 0; j < 3; j++) {
        const i = cursor++ % count,
          k = i * 3,
          s = ++serial * 2.399963;
        seeds[i] = style;
        positions[k] = position.x;
        positions[k + 1] = position.y;
        positions[k + 2] = position.z;
        colors[k] = color.r;
        colors[k + 1] = color.g;
        colors[k + 2] = color.b;
        ages[i] = 0;
        const spread = [0.09, 0.025, 0.035, 0.22, 0.11, 0.16][style % 6];
        velocities[k] = Math.sin(s) * spread;
        velocities[k + 1] = Math.cos(s * 1.7) * spread;
        velocities[k + 2] = Math.cos(s) * spread;
      }
    },
    update(dt, time, audio) {
      const e = Math.min(1, audio.energy || 0),
        pulse = Math.min(1, audio.flux || 0);
      material.uniforms.energy.value = e;
      for (let i = 0; i < count; i++) {
        if (ages[i] >= 1) continue;
        ages[i] = Math.min(1, ages[i] + dt / (36 + seeds[i] * 5));
        const k = i * 3,
          phase = i * 0.71 + time * 0.3;
        positions[k] +=
          dt * (velocities[k] + Math.sin(phase) * (0.025 + e * 0.11));
        positions[k + 1] +=
          dt * (velocities[k + 1] + Math.cos(phase * 0.8) * (0.03 + e * 0.1));
        positions[k + 2] +=
          dt *
          (velocities[k + 2] + Math.sin(phase * 0.6) * (0.025 + pulse * 0.12));
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
      geometry.attributes.age.needsUpdate = true;
      geometry.attributes.style.needsUpdate = true;
    },
    dispose() {
      object.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}
