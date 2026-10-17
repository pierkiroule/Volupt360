import * as THREE from "three";

/** Shared lightweight spheres; swept relative motion detects actual volume entry. */
export function createVocalBubbles({ fragments, collide }) {
  const group = new THREE.Group();
  const geometry = new THREE.SphereGeometry(2.1, 24, 16);
  const previous = new THREE.Vector3(),
    relative = new THREE.Vector3(),
    delta = new THREE.Vector3();
  let time = 0,
    initialized = false,
    collisions = 0,
    silence = 0,
    pending = false,
    disposed = false;
  const rings = fragments.map((fragment, i) => {
    const angle = i * 2.3999632297;
    const radius = 12 + (i % 4) * 5;
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.ShaderMaterial({
        uniforms: {
          color: {
            value: new THREE.Color().setHSL((i * 0.061 + 0.55) % 1, 0.32, 0.52),
          },
          resonance: { value: 0 },
          burst: { value: 0 },
        },
        vertexShader: `varying vec3 n,v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
        fragmentShader: `varying vec3 n,v;uniform vec3 color;uniform float resonance,burst;void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(v))),2.2);float sheen=pow(max(0.,dot(normalize(n),normalize(vec3(-.4,.65,1.)))),18.);vec3 tint=mix(color,vec3(1.),sheen*.6);float tear=sin(n.x*19.+n.y*13.)*sin(n.z*17.-n.y*11.);if(burst>0. && tear<burst*2.-1.)discard;gl_FragColor=vec4(tint,(.055+rim*.28+sheen*.14+resonance*.13)*(1.-burst));
        #include <colorspace_fragment>
        }`,
        transparent: true,
        depthWrite: false,
      }),
    );
    mesh.position.set(
      Math.cos(angle) * radius,
      Math.sin(i * 1.7) * 10,
      Math.sin(angle) * radius,
    );
    group.add(mesh);
    return {
      id: fragment.id,
      mesh,
      anchor: mesh.position.clone(),
      previous: mesh.position.clone(),
      cooldown: 0,
      resonance: 0,
      burstAge: -1,
      removed: false,
    };
  });
  return {
    group,
    get count() {
      return rings.length;
    },
    get remaining() {
      return rings.filter((ring) => ring.burstAge < 0).length;
    },
    get collisionCount() {
      return collisions;
    },
    update(dt, pose, enabled = true) {
      time += dt;
      silence = Math.max(0, silence - dt);
      if (!initialized || !enabled) {
        previous.copy(pose.position);
        initialized = true;
      }
      for (let i = 0; i < rings.length; i++) {
        const ring = rings[i],
          mesh = ring.mesh;
        if (ring.removed) continue;
        if (ring.burstAge >= 0) {
          ring.burstAge += dt;
          const progress = Math.min(1, ring.burstAge / 0.7);
          mesh.scale.setScalar(1 + progress * 0.45);
          mesh.material.uniforms.burst.value = progress;
          if (progress === 1) {
            mesh.removeFromParent();
            mesh.material.dispose();
            ring.removed = true;
          }
          continue;
        }
        ring.previous.copy(mesh.position);
        mesh.position
          .copy(ring.anchor)
          .add(
            relative.set(
              Math.sin(time * 0.11 + i) * 0.65,
              Math.sin(time * 0.17 + i * 1.3) * 0.85,
              Math.cos(time * 0.09 + i) * 0.65,
            ),
          );
        ring.cooldown = Math.max(0, ring.cooldown - dt);
        ring.resonance *= Math.exp(-dt * 0.65);
        mesh.scale.setScalar(
          1 + Math.sin(time * 0.21 + i) * 0.025 + ring.resonance * 0.12,
        );
        mesh.material.uniforms.resonance.value = ring.resonance;
        relative.copy(previous).sub(ring.previous);
        delta.copy(pose.position).sub(mesh.position).sub(relative);
        const radius = 2.1 * mesh.scale.x;
        if (
          !enabled ||
          pending ||
          silence ||
          ring.cooldown ||
          relative.lengthSq() <= radius * radius
        )
          continue;
        const closest = THREE.MathUtils.clamp(
          -relative.dot(delta) / Math.max(1e-9, delta.lengthSq()),
          0,
          1,
        );
        relative.addScaledVector(delta, closest);
        if (relative.lengthSq() > radius * radius) continue;
        pending = true;
        ring.cooldown = 24;
        Promise.resolve()
          .then(() => (disposed ? false : collide(ring.id)))
          .then((played) => {
            if (!disposed && played) {
              collisions++;
              ring.resonance = 1;
              ring.burstAge = 0;
              silence = 10;
            }
          })
          .catch(() => {})
          .finally(() => {
            pending = false;
          });
      }
      previous.copy(pose.position);
    },
    dispose() {
      disposed = true;
      group.removeFromParent();
      geometry.dispose();
      rings.forEach((ring) => {
        if (!ring.removed) ring.mesh.material.dispose();
      });
    },
  };
}
