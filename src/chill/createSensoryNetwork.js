import { createSensoryCurrents } from "./createSensoryCurrents.js";
import { createSensoryAtmosphere } from "./createSensoryAtmosphere.js";
import * as THREE from "three";
import { emojiById } from "./sensoryEmojiCatalog.js";
import { MAX_SENSORY_NODES, MAX_SENSORY_LINKS } from "./sensoryGraph.js";
import { paintingToWorld } from "./paintingToWorld.js";

/** Bounded, local network: volumetric pearl bodies, emoji faces and two batched flows. */
export function createSensoryNetwork() {
  const group = new THREE.Group(),
    bounds = new THREE.Box3(),
    textures = new Map();
  const atmosphere = createSensoryAtmosphere();
  const currents = createSensoryCurrents();
  group.add(atmosphere.group, currents.group);
  const sphereGeometry = new THREE.SphereGeometry(1, 16, 12);
  const nodes = [],
    links = [],
    particlesPerNode = 48,
    segments = 24,
    sparksPerLink = 8;
  let atmosphericTime = 0;
  let dust,
    threads,
    sparks,
    ribbons,
    dynamicMeshes = [];
  const p = new THREE.Vector3(),
    q = new THREE.Vector3(),
    side = new THREE.Vector3(),
    axis = new THREE.Vector3(0, 1, 0);
  const c = new THREE.Color(),
    d = new THREE.Color();
  function emojiTexture(entry) {
    if (textures.has(entry.id)) return textures.get(entry.id);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.font =
      '186px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(entry.emoji, 128, 138);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.set(entry.id, texture);
    return texture;
  }
  const stainCanvas = document.createElement("canvas");
  stainCanvas.width = stainCanvas.height = 32;
  const stainCtx = stainCanvas.getContext("2d"),
    gradient = stainCtx.createRadialGradient(16, 16, 1, 16, 16, 15);
  gradient.addColorStop(0, "#ffffffdd");
  gradient.addColorStop(0.45, "#ffffff99");
  gradient.addColorStop(1, "#ffffff00");
  stainCtx.fillStyle = gradient;
  stainCtx.fillRect(0, 0, 32, 32);
  const stain = new THREE.CanvasTexture(stainCanvas);
  function clear() {
    for (const n of nodes) {
      n.body.material.dispose();
      n.face.material.dispose();
    }
    for (const mesh of [dust, threads, sparks, ribbons]) {
      mesh?.geometry.dispose();
      mesh?.material.dispose();
    }
    atmosphere.clear();
    currents.clear();
    atmosphericTime = 0;
    group.clear();
    group.add(atmosphere.group, currents.group);
    nodes.length = links.length = 0;
    bounds.makeEmpty();
    dust = threads = sparks = ribbons = null;
    dynamicMeshes = [];
  }
  function points(count, size) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    const mesh = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size,
        vertexColors: true,
        map: stain,
        transparent: true,
        opacity: 0.68,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    mesh.frustumCulled = false;
    group.add(mesh);
    return mesh;
  }
  function curve(link, t, time, out) {
    const a = link.a.object.position,
      b = link.b.object.position;
    side.subVectors(b, a).cross(axis);
    if (side.lengthSq() < 0.01) side.set(1, 0, 0);
    side.normalize();
    out
      .lerpVectors(a, b, t)
      .addScaledVector(
        side,
        Math.sin(Math.PI * t) *
          (link.bend + Math.sin(time * 0.3 + link.phase) * 0.15),
      );
    out.y += Math.sin(Math.PI * t) * Math.sin(time * 0.4 + link.phase) * 0.24;
    return out;
  }
  return {
    group,
    bounds,
    get count() {
      return nodes.length;
    },
    get stats() {
      return {
        nodes: nodes.length,
        links: links.length,
        particles:
          nodes.length * particlesPerNode + links.length * sparksPerLink,
        textures: textures.size,
        atmosphere: atmosphere.stats,
        currents: currents.stats,
      };
    },
    setDocument(document) {
      clear();
      const byId = new Map();
      for (const [i, n] of document.nodes
        .slice(0, MAX_SENSORY_NODES)
        .entries()) {
        const entry = emojiById(n.emojiId),
          object = new THREE.Group(),
          origin = paintingToWorld(n, i, document.nodes.length, n.size),
          size = THREE.MathUtils.clamp(n.size * 9, 0.55, 2.4);
        object.position.copy(origin);
        const body = new THREE.Mesh(
          sphereGeometry,
          new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            uniforms: {
              tint: { value: new THREE.Color(entry.color) },
              presence: { value: n.opacity },
            },
            vertexShader:
              "varying vec3 N; varying vec3 V; void main(){vec4 p=modelViewMatrix*vec4(position,1.);N=normalize(normalMatrix*normal);V=normalize(-p.xyz);gl_Position=projectionMatrix*p;}",
            fragmentShader:
              "uniform vec3 tint; uniform float presence; varying vec3 N; varying vec3 V; void main(){float rim=pow(1.-abs(dot(normalize(N),normalize(V))),2.);gl_FragColor=vec4(tint*(.75+.25*rim),presence*(.055+rim*.2));}",
          }),
        );
        const face = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: emojiTexture(entry),
            transparent: true,
            opacity: n.opacity,
            depthWrite: false,
            toneMapped: false,
          }),
        );
        face.scale.setScalar(size * 1.65);
        body.scale.setScalar(size);
        object.add(body, face);
        group.add(object);
        const runtime = {
          id: n.id,
          entry,
          object,
          origin,
          size,
          body,
          face,
          opacity: n.opacity,
          energy: 0,
          phase: i * 2.399,
        };
        nodes.push(runtime);
        byId.set(n.id, runtime);
        bounds.expandByPoint(origin);
      }
      bounds.expandByScalar(2.5);
      for (const [i, l] of document.links
        .slice(0, MAX_SENSORY_LINKS)
        .entries()) {
        const a = byId.get(l.a),
          b = byId.get(l.b);
        if (!a || !b || a === b) continue;
        links.push({
          a,
          b,
          phase: i * 1.37,
          bend: Math.min(2, a.origin.distanceTo(b.origin) * 0.14),
          energy: 0,
        });
      }
      dust = points(nodes.length * particlesPerNode, 0.13);
      sparks = points(links.length * sparksPerLink, 0.18);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(
          new Float32Array(links.length * segments * 6),
          3,
        ).setUsage(THREE.DynamicDrawUsage),
      );
      geometry.setAttribute(
        "color",
        new THREE.BufferAttribute(
          new Float32Array(links.length * segments * 6),
          3,
        ).setUsage(THREE.DynamicDrawUsage),
      );
      threads = new THREE.LineSegments(
        geometry,
        new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.4,
          depthWrite: false,
        }),
      );
      threads.frustumCulled = false;
      group.add(threads);
      const ribbonGeometry = new THREE.BufferGeometry(),
        count = links.length * (segments + 1) * 2;
      ribbonGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(
          THREE.DynamicDrawUsage,
        ),
      );
      ribbonGeometry.setAttribute(
        "color",
        new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(
          THREE.DynamicDrawUsage,
        ),
      );
      ribbonGeometry.setAttribute(
        "aEnergy",
        new THREE.BufferAttribute(new Float32Array(count), 1).setUsage(
          THREE.DynamicDrawUsage,
        ),
      );
      const uv = new Float32Array(count * 2),
        indices = [];
      for (let i = 0; i < links.length; i++)
        for (let j = 0; j <= segments; j++) {
          const k = (i * (segments + 1) + j) * 2;
          uv[k * 2] = uv[(k + 1) * 2] = j / segments;
          uv[k * 2 + 1] = 0;
          uv[(k + 1) * 2 + 1] = 1;
          if (j < segments) indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
        }
      ribbonGeometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      ribbonGeometry.setIndex(indices);
      ribbons = new THREE.Mesh(
        ribbonGeometry,
        new THREE.ShaderMaterial({
          vertexColors: true,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          uniforms: { uTime: { value: 0 } },
          vertexShader:
            "attribute float aEnergy; varying vec2 U; varying vec3 C; varying float E; void main(){U=uv;C=color;E=aEnergy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
          fragmentShader:
            "uniform float uTime; varying vec2 U; varying vec3 C; varying float E; void main(){float edge=1.-abs(U.y*2.-1.);float wave=.5+.5*sin(U.x*23.-uTime*(.8+E*1.5));float grain=.85+.15*sin(U.x*137.+sin(U.y*37.));float ends=smoothstep(0.,.08,U.x)*(1.-smoothstep(.92,1.,U.x));gl_FragColor=vec4(C,edge*edge*ends*grain*(.15+wave*.35+E*.15));}",
        }),
      );
      ribbons.frustumCulled = false;
      group.add(ribbons);
      dynamicMeshes = [dust, threads, sparks];
      atmosphere.setNodes(nodes, links);
      currents.setNodes(nodes);
      this.update(0, {}, 0);
    },
    update(time, audio, dt) {
      if (!dust) return;
      const positions = dust.geometry.attributes.position.array,
        colors = dust.geometry.attributes.color.array;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const target = audio.bands?.[n.entry.band] ?? audio.energy ?? 0;
        n.energy += (target - n.energy) * (1 - Math.exp(-dt * 2.8));
        n.object.position.copy(n.origin);
        n.object.position.y +=
          Math.sin(time * 0.36 + n.phase) * (0.12 + n.energy * 0.2);
        n.object.scale.setScalar(1 + n.energy * 0.065);
        c.set(n.entry.color);
        for (let j = 0; j < particlesPerNode; j++) {
          const phase = j * 2.399 + n.phase,
            turn = time * (0.12 + n.energy * 0.22) + phase,
            spread = n.size * (1.1 + (j % 7) * 0.13 + n.energy * 0.5);
          p.set(
            Math.cos(turn) * spread,
            Math.sin(turn * 0.73 + phase) * spread * 0.7,
            Math.sin(turn) * spread,
          );
          if (n.entry.motion === "rise")
            p.y =
              (((time * 0.16 + j / particlesPerNode) % 1) - 0.5) * spread * 3;
          else if (n.entry.motion === "wave")
            p.y = Math.sin(turn * 1.5) * spread * 0.3;
          else if (n.entry.motion === "grain") p.multiplyScalar(0.72);
          else if (n.entry.motion === "crystal") p.y = Math.sin(phase) * spread;
          else if (n.entry.motion === "pulse")
            p.multiplyScalar(1 + Math.sin(time * 0.8 + phase) * n.energy * 0.2);
          p.add(n.object.position);
          const k = (i * particlesPerNode + j) * 3;
          p.toArray(positions, k);
          d.copy(c).multiplyScalar((0.45 + n.energy * 0.45) * n.opacity);
          d.toArray(colors, k);
        }
      }
      const linePositions = threads.geometry.attributes.position.array,
        lineColors = threads.geometry.attributes.color.array,
        sparkPositions = sparks.geometry.attributes.position.array,
        sparkColors = sparks.geometry.attributes.color.array;
      for (let i = 0; i < links.length; i++) {
        const l = links[i];
        l.energy = (l.a.energy + l.b.energy) * 0.5;
        c.set(l.a.entry.color);
        d.set(l.b.entry.color);
        for (let j = 0; j < segments; j++) {
          for (let end = 0; end < 2; end++) {
            const t = (j + end) / segments,
              k = (i * segments * 2 + j * 2 + end) * 3;
            curve(l, t, time, p).toArray(linePositions, k);
            const flow =
              0.35 +
              0.35 *
                (0.5 +
                  0.5 *
                    Math.sin(t * 11 - time * (0.7 + l.energy * 1.5) + l.phase));
            q.set(
              c.r + (d.r - c.r) * t,
              c.g + (d.g - c.g) * t,
              c.b + (d.b - c.b) * t,
            ).multiplyScalar(flow + Math.min(0.25, l.energy * 0.3));
            q.toArray(lineColors, k);
          }
        }
        const rp = ribbons.geometry.attributes.position.array,
          rc = ribbons.geometry.attributes.color.array,
          re = ribbons.geometry.attributes.aEnergy.array;
        for (let j = 0; j <= segments; j++) {
          const t = j / segments;
          curve(l, t, time, p);
          for (let edge = 0; edge < 2; edge++) {
            const k = (i * (segments + 1) + j) * 2 + edge;
            q.copy(p).addScaledVector(
              side,
              (edge ? 1 : -1) *
                (0.14 + l.energy * 0.24) *
                Math.sin(Math.PI * t),
            );
            q.toArray(rp, k * 3);
            q.set(
              c.r + (d.r - c.r) * t,
              c.g + (d.g - c.g) * t,
              c.b + (d.b - c.b) * t,
            ).toArray(rc, k * 3);
            re[k] = l.energy;
          }
        }
        for (let j = 0; j < sparksPerLink; j++) {
          const t =
              (j / sparksPerLink + time * (0.025 + l.energy * 0.09) + l.phase) %
              1,
            k = (i * sparksPerLink + j) * 3;
          curve(l, t, time, p).toArray(sparkPositions, k);
          q.set(
            c.r + (d.r - c.r) * t,
            c.g + (d.g - c.g) * t,
            c.b + (d.b - c.b) * t,
          ).multiplyScalar(0.5 + l.energy * 0.5);
          q.toArray(sparkColors, k);
        }
      }
      ribbons.material.uniforms.uTime.value = time;
      ribbons.geometry.attributes.position.needsUpdate = true;
      ribbons.geometry.attributes.color.needsUpdate = true;
      ribbons.geometry.attributes.aEnergy.needsUpdate = true;
      atmosphericTime += dt;
      atmosphere.update(atmosphericTime);
      currents.update(atmosphericTime);
      for (const mesh of dynamicMeshes) {
        mesh.geometry.attributes.position.needsUpdate = true;
        mesh.geometry.attributes.color.needsUpdate = true;
      }
    },
    clear,
    dispose() {
      clear();
      atmosphere.dispose();
      currents.dispose();
      group.clear();
      sphereGeometry.dispose();
      stain.dispose();
      for (const texture of textures.values()) texture.dispose();
      textures.clear();
    },
  };
}
