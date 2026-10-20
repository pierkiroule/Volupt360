import * as THREE from "three";
/** Pigment-born particles and current filaments: fixed buffers, GPU-only motion. */
export function createResonantEffects(uniforms, mobile) {
  const group = new THREE.Group(),
    capacity = mobile ? 1400 : 3200;
  const positions = new Float32Array(capacity * 3),
    colors = new Float32Array(capacity * 3),
    seeds = new Float32Array(capacity);
  const particleGeometry = new THREE.BufferGeometry();
  for (const [name, array, size] of [
    ["position", positions, 3],
    ["color", colors, 3],
    ["seed", seeds, 1],
  ])
    particleGeometry.setAttribute(
      name,
      new THREE.BufferAttribute(array, size).setUsage(THREE.DynamicDrawUsage),
    );
  const common = `uniform float time,energy,style,accent,pixelRatio;uniform float bands[6];
  vec3 current(vec3 p,float seed,float along){
    vec3 n=normalize(p);vec3 tangent=normalize(cross(n,abs(n.y)>.9?vec3(1.,0.,0.):vec3(0.,1.,0.)));
    vec3 side=cross(n,tangent);float phase=seed*31.+along*4.;
    float flow=max(0.,1.-style),breath=max(0.,1.-abs(style-1.)),ripple=max(0.,style-1.);
    float low=bands[0],high=bands[4];
    float drift=sin(time*.32+phase)*(flow*.8+breath*.2)+sin(time*.48-phase)*ripple*.6;
    return p+n*sin(phase-time*.4)*(.12+low*.9)+tangent*drift*(.3+energy*1.6)+side*cos(phase*.7+time*.24)*(.2+high*.8);
  }`;
  const particleMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    vertexShader: `${common} attribute float seed;varying vec3 C;varying float A;
    void main(){vec3 p=current(position,seed,0.);float life=.5+.5*sin(time*(.18+seed*.12)+seed*39.);
      vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
      float detail=bands[4]*.6+bands[5]*.4;
      gl_PointSize=clamp((2.+seed*5.+detail*6.+accent*12.)*pixelRatio*9./max(2.,-view.z),1.,24.);
      C=color;A=(.26+energy*.52+detail*.2)*(.4+life*.6);
    }`,
    fragmentShader: `varying vec3 C;varying float A;void main(){vec2 q=gl_PointCoord-.5;float r=length(q)*2.;
      float grain=.68+.32*sin(q.x*43.+sin(q.y*37.));float alpha=(1.-smoothstep(.12,1.,r))*grain*A;
      if(alpha<.008)discard;gl_FragColor=vec4(C,alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const points = new THREE.Points(particleGeometry, particleMaterial);
  points.frustumCulled = false;
  group.add(points);
  const strands = mobile ? 32 : 64,
    steps = 12,
    count = strands * steps * 2;
  const linePositions = new Float32Array(count * 3),
    lineColors = new Float32Array(count * 3),
    lineSeeds = new Float32Array(count),
    along = new Float32Array(count);
  const lineGeometry = new THREE.BufferGeometry();
  for (const [name, array, size] of [
    ["position", linePositions, 3],
    ["color", lineColors, 3],
    ["seed", lineSeeds, 1],
    ["along", along, 1],
  ])
    lineGeometry.setAttribute(
      name,
      new THREE.BufferAttribute(array, size).setUsage(THREE.DynamicDrawUsage),
    );
  const lineMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    vertexShader: `${common} attribute float seed,along;varying vec3 C;varying float A;
    void main(){vec3 p=current(position,seed,along);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
      C=color;A=sin(along*3.14159)*(.2+bands[2]*.4+accent*.4);
    }`,
    fragmentShader: `varying vec3 C;varying float A;void main(){gl_FragColor=vec4(C,A);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
  lines.frustumCulled = false;
  group.add(lines);
  group.position.z = 20;
  particleGeometry.setDrawRange(0, 0);
  lineGeometry.setDrawRange(0, 0);
  return {
    group,
    setCanvas(canvas) {
      const sample = document.createElement("canvas");
      sample.width = 192;
      sample.height = 128;
      const ctx = sample.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(canvas, 0, 0, 192, 128);
      const pixels = ctx.getImageData(0, 0, 192, 128).data;
      let state = 83197,
        used = 0;
      const random = () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
      };
      const color = new THREE.Color();
      for (
        let attempt = 0;
        attempt < capacity * 18 && used < capacity;
        attempt++
      ) {
        const u = random(),
          v = random(),
          k =
            (Math.min(127, Math.floor(v * 128)) * 192 +
              Math.min(191, Math.floor(u * 192))) *
            4;
        if (pixels[k + 3] < 24 || random() > pixels[k + 3] / 255) continue;
        const theta = v * Math.PI,
          phi = u * Math.PI * 2,
          radius = 6.5 + random() * 5;
        positions.set(
          [
            -Math.cos(phi) * Math.sin(theta) * radius,
            Math.cos(theta) * radius,
            Math.sin(phi) * Math.sin(theta) * radius,
          ],
          used * 3,
        );
        color.setRGB(
          pixels[k] / 255,
          pixels[k + 1] / 255,
          pixels[k + 2] / 255,
          THREE.SRGBColorSpace,
        );
        color.multiplyScalar(0.35 + random() * 0.65);
        colors.set([color.r, color.g, color.b], used * 3);
        seeds[used] = random();
        used++;
      }
      particleGeometry.setDrawRange(0, used);
      const vector = new THREE.Vector3(),
        tangent = new THREE.Vector3(),
        side = new THREE.Vector3(),
        axis = new THREE.Vector3();
      let vertices = 0;
      for (let strand = 0; strand < Math.min(strands, used); strand++) {
        const i = Math.floor((strand * used) / Math.min(strands, used));
        vector.fromArray(positions, i * 3);
        axis.copy(vector).normalize();
        tangent
          .crossVectors(
            axis,
            Math.abs(axis.y) > 0.9
              ? new THREE.Vector3(1, 0, 0)
              : new THREE.Vector3(0, 1, 0),
          )
          .normalize();
        side.crossVectors(axis, tangent);
        for (let segment = 0; segment < steps; segment++)
          for (let endpoint = 0; endpoint < 2; endpoint++) {
            const t = (segment + endpoint) / steps,
              phase = t * Math.PI * 2;
            linePositions.set(
              [
                vector.x +
                  tangent.x * (t - 0.5) * 2.4 +
                  side.x * Math.sin(phase) * 0.22,
                vector.y +
                  tangent.y * (t - 0.5) * 2.4 +
                  side.y * Math.sin(phase) * 0.22,
                vector.z +
                  tangent.z * (t - 0.5) * 2.4 +
                  side.z * Math.sin(phase) * 0.22,
              ],
              vertices * 3,
            );
            lineColors.set(colors.subarray(i * 3, i * 3 + 3), vertices * 3);
            lineSeeds[vertices] = seeds[i];
            along[vertices] = t;
            vertices++;
          }
      }
      lineGeometry.setDrawRange(0, vertices);
      for (const g of [particleGeometry, lineGeometry])
        for (const attribute of Object.values(g.attributes))
          attribute.needsUpdate = true;
      sample.width = sample.height = 1;
    },
    dispose() {
      particleGeometry.dispose();
      particleMaterial.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      group.clear();
    },
  };
}
