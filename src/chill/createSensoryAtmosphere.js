import * as THREE from "three";
import { createPigmentPlate } from "./createPigmentPlate.js";
import { SENSORY_LANGUAGE } from "./sensoryLanguage.js";

const MAX_CLOUDS = 18,
  TEXT_SLOTS = 3;
/** One instanced wash layer and three reusable word sprites. Nothing is rasterized per frame. */
export function createSensoryAtmosphere() {
  const group = new THREE.Group(),
    anchors = [],
    textMaps = new Map(),
    slots = [];
  let nodes = [];
  const geometry = new THREE.InstancedBufferGeometry();
  const plane = new THREE.PlaneGeometry(1, 1);
  geometry.index = plane.index.clone();
  for (const name of ["position", "uv"])
    geometry.setAttribute(name, plane.attributes[name].clone());
  plane.dispose();
  const centers = new Float32Array(MAX_CLOUDS * 3),
    colors = new Float32Array(MAX_CLOUDS * 3),
    sizes = new Float32Array(MAX_CLOUDS * 2),
    seeds = new Float32Array(MAX_CLOUDS),
    energies = new Float32Array(MAX_CLOUDS);
  for (const [name, array, size] of [
    ["aCenter", centers, 3],
    ["aTint", colors, 3],
    ["aSize", sizes, 2],
    ["aSeed", seeds, 1],
    ["aEnergy", energies, 1],
  ])
    geometry.setAttribute(
      name,
      new THREE.InstancedBufferAttribute(array, size).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
  geometry.instanceCount = 0;
  const maps = [];
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uWet: { value: null },
      uDry: { value: null },
    },
    vertexShader: `attribute vec3 aCenter,aTint; attribute vec2 aSize; attribute float aSeed,aEnergy; uniform float uTime; varying vec2 U; varying vec3 C; varying float S,E;
    void main(){U=uv;C=aTint;S=aSeed;E=aEnergy;float angle=sin(aSeed*3.)*.8+sin(uTime*.08+aSeed)*.08;vec2 p=position.xy; p=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*p;vec4 center=modelViewMatrix*vec4(aCenter,1.);center.xy+=p*aSize*(1.+sin(uTime*.12+aSeed)*.035+aEnergy*.12);gl_Position=projectionMatrix*center;}`,
    fragmentShader: `uniform sampler2D uWet,uDry; uniform float uTime; varying vec2 U; varying vec3 C; varying float S,E;
    void main(){vec2 uv=U+vec2(sin(U.y*9.+S+uTime*.06),cos(U.x*8.+S-uTime*.05))*.018;vec4 wet=texture2D(uWet,uv),dry=texture2D(uDry,uv);vec4 p=mix(wet,dry,fract(S*.37)*.65);float edge=1.-smoothstep(.25,.52,length(U-.5));float deposits=p.b;float grain=.72+.28*p.g;float alpha=edge*p.a*grain*(.18+deposits*.25+E*.1);vec3 col=C*mix(1.05,.57,p.r*.6+deposits*.35);gl_FragColor=vec4(col,alpha);}`,
  });
  const clouds = new THREE.Mesh(geometry, material);
  clouds.frustumCulled = false;
  clouds.renderOrder = -1;
  group.add(clouds);
  function textTexture(text, metaphor) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    let size = metaphor ? 42 : 62;
    do {
      ctx.font = `${size--}px "Caveat", "Segoe Print", cursive`;
    } while (ctx.measureText(text).width > 470 && size > 20);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#faf7eecc";
    ctx.strokeText(text, 256, 68);
    ctx.fillStyle = "#40554f";
    ctx.fillText(text, 256, 68);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
  for (let i = 0; i < TEXT_SLOTS; i++) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    sprite.visible = false;
    sprite.renderOrder = 2;
    group.add(sprite);
    slots.push({ sprite, cycle: -1, index: i, opacity: 0, text: "" });
  }
  const color = new THREE.Color(),
    center = new THREE.Vector3();
  function clear() {
    nodes = [];
    anchors.length = 0;
    geometry.instanceCount = 0;
    for (const slot of slots) {
      slot.sprite.visible = false;
      slot.sprite.material.map = null;
      slot.cycle = -1;
      slot.opacity = 0;
      slot.text = "";
    }
    for (const map of textMaps.values()) map.dispose();
    textMaps.clear();
  }
  return {
    group,
    get stats() {
      return {
        clouds: anchors.length,
        visibleTexts: slots.filter((s) => s.sprite.visible).length,
        textTextures: textMaps.size,
      };
    },
    setNodes(source, links) {
      clear();
      if (!maps.length) {
        for (const [i, kind] of ["wash", "dry"].entries()) {
          const texture = new THREE.CanvasTexture(
            createPigmentPlate(kind, 46031 + i * 953, 256, false),
          );
          texture.colorSpace = THREE.NoColorSpace;
          maps.push(texture);
        }
        material.uniforms.uWet.value = maps[0];
        material.uniforms.uDry.value = maps[1];
      }
      nodes = source;
      const entries = new Map(nodes.map((n) => [n.entry.id, n.entry]));
      for (const id of entries.keys())
        for (const [index, text] of (
          SENSORY_LANGUAGE[id] || SENSORY_LANGUAGE.mist
        ).entries())
          textMaps.set(text, textTexture(text, index === 1));
      for (let i = 0; i < Math.min(12, nodes.length); i++)
        anchors.push({
          a: nodes[Math.floor((i * nodes.length) / Math.min(12, nodes.length))],
          b: null,
          phase: i * 2.39,
        });
      for (let i = 0; i < Math.min(6, links.length); i++) {
        const l =
          links[Math.floor((i * links.length) / Math.min(6, links.length))];
        anchors.push({ a: l.a, b: l.b, phase: i * 3.13 + 1.5 });
      }
      for (let i = 0; i < anchors.length; i++) {
        const anchor = anchors[i],
          size = anchor.a.size;
        color.set(anchor.a.entry.color);
        if (anchor.b) color.lerp(new THREE.Color(anchor.b.entry.color), 0.5);
        color.toArray(colors, i * 3);
        sizes[i * 2] = 4.5 + size * 2.2;
        sizes[i * 2 + 1] = 2.7 + size * 1.7;
        seeds[i] = anchor.phase;
      }
      geometry.instanceCount = anchors.length;
      geometry.attributes.aTint.needsUpdate =
        geometry.attributes.aSize.needsUpdate =
        geometry.attributes.aSeed.needsUpdate =
          true;
      this.update(0);
    },
    update(time) {
      material.uniforms.uTime.value = time;
      for (let i = 0; i < anchors.length; i++) {
        const a = anchors[i],
          pos = a.a.object.position,
          b = a.b?.object.position;
        centers[i * 3] = b ? (pos.x + b.x) / 2 : pos.x;
        centers[i * 3 + 1] =
          (b ? (pos.y + b.y) / 2 : pos.y) +
          Math.sin(time * 0.11 + a.phase) * 0.4;
        centers[i * 3 + 2] =
          (b ? (pos.z + b.z) / 2 : pos.z) +
          Math.cos(time * 0.09 + a.phase) * 0.25;
        energies[i] = a.b ? (a.a.energy + a.b.energy) * 0.5 : a.a.energy;
      }
      geometry.attributes.aCenter.needsUpdate =
        geometry.attributes.aEnergy.needsUpdate = true;
      if (!nodes.length) return;
      center.set(0, 0, 0);
      for (const node of nodes) center.add(node.object.position);
      center.divideScalar(nodes.length);
      for (const slot of slots) {
        const period = 21 + slot.index * 2.7,
          elapsed = time - slot.index * 6.5 - 1.3;
        if (elapsed < 0) {
          slot.sprite.visible = false;
          continue;
        }
        const cycle = Math.floor(elapsed / period),
          age = elapsed - cycle * period;
        if (age > 11) {
          slot.sprite.visible = false;
          slot.opacity = 0;
          continue;
        }
        const host = nodes[(cycle + slot.index * 3) % nodes.length],
          phrases = SENSORY_LANGUAGE[host.entry.id] || SENSORY_LANGUAGE.mist;
        // A metaphor is an occasional gift, rather than a permanent caption.
        const metaphor = (cycle + slot.index) % 3 === 2,
          text = phrases[metaphor ? 1 : 0];
        if (slot.cycle !== cycle) {
          slot.sprite.material.map = textMaps.get(text);
          slot.sprite.material.needsUpdate = true;
          slot.cycle = cycle;
          slot.text = text;
          slot.sprite.userData.sensoryText = text;
        }
        const fadeIn = THREE.MathUtils.smoothstep(age, 0, 2.4),
          fadeOut = 1 - THREE.MathUtils.smoothstep(age, 7.5, 11);
        slot.opacity = fadeIn * fadeOut * 0.78;
        slot.sprite.material.opacity = slot.opacity;
        slot.sprite.visible = slot.opacity > 0.005;
        slot.sprite.position
          .copy(host.object.position)
          .lerp(center, metaphor ? 0.72 : 0.35);
        slot.sprite.position.x +=
          Math.sin(slot.index * 2.4 + cycle) * 1.3 +
          Math.sin(age * 0.13 + slot.index) * 0.55;
        slot.sprite.position.y += host.size * 1.15 + 0.5 + age * 0.065;
        slot.sprite.position.z += Math.cos(slot.index + cycle) * 0.7;
        const size = metaphor ? 7.5 : 4.8;
        slot.sprite.scale.set(size, size / 4, 1);
      }
    },
    clear,
    dispose() {
      clear();
      for (const slot of slots) slot.sprite.material.dispose();
      geometry.dispose();
      material.dispose();
      for (const map of maps) map.dispose();
      group.clear();
    },
  };
}
