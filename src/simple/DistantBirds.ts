import * as THREE from "three";
/** Five small ink silhouettes, batched. Slow passage, no spawned objects. */
export class DistantBirds {
  readonly mesh: THREE.LineSegments<THREE.BufferGeometry, THREE.ShaderMaterial>;
  constructor() {
    const points: number[] = [],
      birds: number[] = [];
    for (let bird = 0; bird < 5; bird++) {
      // Three segments per wing produce a curved, articulated silhouette.
      for (const side of [-1, 1])
        for (let joint = 0; joint < 3; joint++)
          for (const end of [joint, joint + 1]) {
            points.push((side * end) / 3, 0, 0);
            birds.push(bird);
          }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(points, 3),
    );
    geometry.setAttribute("bird", new THREE.Float32BufferAttribute(birds, 1));
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { time: { value: 0 } },
      vertexShader: `uniform float time;attribute float bird;varying float opacity;
      void main(){float cycle=mod(time*.008,1.);float passage=smoothstep(.07,.2,cycle)*(1.-smoothstep(.65,.85,cycle));
        vec3 p=position;float wing=abs(p.x);float flap=sin(time*2.1+bird*.7)*.15;
        p.y+=wing*wing*(.22+flap);p.z+=wing*.1;p*=.25+bird*.015;
        p.x+=(cycle-.5)*48.+bird*.65;p.y+=18.+sin(time*.04+bird*.15)*.65+bird*.13;p.z-=24.+bird*.3;
        opacity=passage*.48;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader: `varying float opacity;void main(){gl_FragColor=vec4(.22,.27,.31,opacity);\n#include <colorspace_fragment>\n}`,
    });
    this.mesh = new THREE.LineSegments(geometry, material);
    this.mesh.frustumCulled = false;
  }
  update(time: number) {
    this.mesh.material.uniforms.time.value = time;
  }
  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
