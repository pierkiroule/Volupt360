import * as THREE from "three";
import { createBubbleEmergence } from "../chill/createBubbleEmergence.js";

/** Shared lightweight spheres; swept relative motion detects actual volume entry. */
export function createVocalBubbles({
  fragments,
  collide,
  onScore = () => {},
  watercolor = false,
  staged = false,
  emergence = null,
  constellation = false,
}) {
  const group = new THREE.Group();
  const geometry = new THREE.SphereGeometry(2.1, 24, 16);
  const previous = new THREE.Vector3(),
    relative = new THREE.Vector3(),
    delta = new THREE.Vector3();
  const emerging =
    !constellation && emergence
      ? createBubbleEmergence(fragments.length, emergence)
      : null;
  let samples = 0,
    held = false,
    heldId = null;
  const pigmentPoint = new THREE.Vector3();
  const pigmentColor = new THREE.Color("#a0b9c4"),
    newColor = new THREE.Color("#dde7e2");
  let elapsed = 0;
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
          presence: { value: constellation ? 1 : staged ? 0 : 1 },
          visited: { value: 0 },
          constellation: { value: constellation ? 1 : 0 },
          watercolor: { value: watercolor ? 1 : 0 },
        },
        vertexShader: `varying vec3 n,v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
        fragmentShader: `varying vec3 n,v;uniform vec3 color;uniform float resonance,burst,watercolor,presence,visited,constellation;void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(v))),2.2);float sheen=pow(max(0.,dot(normalize(n),normalize(vec3(-.4,.65,1.)))),18.);vec3 tint=mix(color,vec3(1.),sheen*.6*(1.-watercolor));float tear=sin(n.x*19.+n.y*13.)*sin(n.z*17.-n.y*11.);if(burst>0. && tear<burst*2.-1.)discard;float wash=.55+.45*sin(n.x*21.+sin(n.y*17.)+n.z*13.);float alpha=mix(.055+rim*.28+sheen*.14+resonance*.13,.025+rim*(.12+wash*.1)+wash*.045,watercolor);alpha=mix(alpha,.12+rim*.58,constellation);tint=mix(tint,mix(color+vec3(.23),color*.45,visited),constellation);gl_FragColor=vec4(tint,alpha*(1.-burst)*presence*mix(1.,.28,visited));
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
    mesh.visible = constellation || (!staged && !emerging);
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
      released: !emerging,
      entered: false,
      visited: false,
      appearAt:
        !constellation && staged
          ? i < 4
            ? i * 12
            : i < 12
              ? 60 + (i - 4) * 14
              : 180 + (i - 12) * 14
          : 0,
    };
  });
  return {
    group,
    setElapsed(value) {
      elapsed = value;
    },
    notifyPaint(point, count, color) {
      if (color) pigmentColor.set(color);
      pigmentPoint.copy(point);
      samples = count;
    },
    resume() {
      held = false;
      if (constellation && heldId) {
        const ring = rings.find((r) => r.id === heldId);
        if (ring) {
          ring.visited = true;
          ring.entered = false;
          ring.mesh.material.uniforms.visited.value = 1;
        }
        heldId = null;
      }
      const index = emerging?.active ?? -1;
      if (index >= 0) {
        rings[index].burstAge = 0;
        emerging.release(elapsed, samples);
      }
    },
    get activeCount() {
      return rings.filter(
        (ring) =>
          !ring.removed && !ring.visited && ring.released && ring.burstAge < 0,
      ).length;
    },
    get visitedCount() {
      return rings.filter((r) => r.visited).length;
    },
    get states() {
      return rings.map((r) => ({
        id: r.id,
        visible: r.mesh.visible,
        visited: r.visited,
      }));
    },
    get count() {
      return rings.length;
    },
    get remaining() {
      return rings.filter((ring) => ring.burstAge < 0).length;
    },
    getNearest(position, result) {
      if (disposed || pending || held || (!constellation && silence > 0))
        return false;
      let nearest = null,
        distance = Infinity;
      for (const ring of rings) {
        if (
          !ring.released ||
          ring.entered ||
          ring.visited ||
          ring.removed ||
          ring.burstAge >= 0 ||
          ring.cooldown > 0 ||
          elapsed < ring.appearAt
        )
          continue;
        const d = ring.mesh.position.distanceToSquared(position);
        if (d < distance) {
          distance = d;
          nearest = ring;
        }
      }
      if (!nearest) return false;
      result.copy(nearest.mesh.position);
      return true;
    },
    get collisionCount() {
      return collisions;
    },
    update(dt, pose, enabled = true) {
      time += dt;
      const proposal =
        enabled && !held ? emerging?.propose(elapsed, samples) : -1;
      if (proposal >= 0) {
        const ring = rings[proposal];
        ring.released = true;
        ring.mesh.material.uniforms.color.value
          .copy(pigmentColor)
          .lerp(newColor, 0.32);
        ring.appearAt = elapsed;
        // Emerge alongside recent pigment, ahead of the flight rather than on it.
        const anchor = ring.anchor;
        anchor.copy(pigmentPoint);
        if (anchor.distanceTo(pose.position) > 12) anchor.copy(pose.position);
        anchor.lerp(pose.position, 0.6).addScaledVector(pose.direction, 9);
        anchor.y += 2;
        if (anchor.distanceTo(pose.position) < 6)
          anchor.copy(pose.position).addScaledVector(pose.direction, 9);
        ring.mesh.position.copy(anchor);
        ring.previous.copy(anchor);
      }
      silence = Math.max(0, silence - dt);
      if (!initialized || !enabled) {
        previous.copy(pose.position);
        initialized = true;
      }
      for (let i = 0; i < rings.length; i++) {
        const ring = rings[i],
          mesh = ring.mesh;
        mesh.visible =
          ring.released && !ring.removed && elapsed >= ring.appearAt;
        if (!ring.removed)
          mesh.material.uniforms.presence.value =
            !constellation && (staged || emerging)
              ? THREE.MathUtils.smoothstep(
                  elapsed,
                  ring.appearAt,
                  ring.appearAt + (emerging?.settings.fadeSeconds ?? 4),
                )
              : 1;
        if (ring.removed || !mesh.visible) continue;
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
        if (emerging) mesh.position.lerp(ring.anchor, 0.8);
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
          held ||
          ring.entered ||
          (constellation && ring.visited && !pose.guided) ||
          (emerging &&
            elapsed < ring.appearAt + emerging.settings.fadeSeconds) ||
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
              onScore(collisions, fragments.length);
              ring.resonance = 1;
              if (emerging || constellation) {
                held = true;
                heldId = ring.id;
                ring.entered = true;
              } else ring.burstAge = 0;
              silence = constellation ? 2 : 10;
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
