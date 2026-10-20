import { spatialBrushPoint } from "./spatialBrushFrame.js";
import { createPigmentPlate } from "./createPigmentPlate.js";
import {
  pictorialVertex,
  pictorialFragment,
  pigmentParticleVertex,
  pigmentParticleFragment,
} from "./pictorialShaders.js";
import * as THREE from "three";
import { SENSORY_EMOJIS } from "./sensoryEmojiCatalog.js";
import { paintingToWorld } from "./paintingToWorld.js";
function pictorialPoint(point, layer = 0, frame = null) {
  if (frame) return spatialBrushPoint(point, frame);
  return paintingToWorld(
    { u: point.x + 0.5, v: point.y + 0.5 },
    layer,
    80,
    0.04,
  ).toArray();
}

/** A single ribbon batch retains every painted gesture; bounded local motion lives on the GPU. */
export function createPictorialLandscape() {
  const group = new THREE.Group(),
    bounds = new THREE.Box3();
  let mesh = null,
    energy = new Float32Array(6),
    active = false;
  let accent = 0,
    previousLevel = 0;
  const plates = [];
  const uniforms = {
    time: { value: 0 },
    bands: { value: energy },
    accent: { value: 0 },
    wetPlate: { value: null },
    dryPlate: { value: null },
    pixelRatio: { value: Math.min(globalThis.devicePixelRatio || 1, 2) },
  };
  function clear() {
    for (const child of group.children) {
      child.geometry.dispose();
      child.material.dispose();
    }
    mesh = null;
    group.clear();
    bounds.makeEmpty();
    active = false;
    energy.fill(0);
    accent = previousLevel = 0;
    uniforms.accent.value = 0;
  }
  return {
    group,
    bounds,
    get active() {
      return active;
    },
    setDocument(doc) {
      clear();
      if (doc.kind !== "emoji-painting") return;
      active = true;
      if (!plates.length) {
        for (const [i, kind] of ["wash", "dry"].entries()) {
          const map = new THREE.CanvasTexture(
            createPigmentPlate(kind, 7193 + i * 953, 256, true),
          );
          map.colorSpace = THREE.NoColorSpace;
          map.wrapT = THREE.RepeatWrapping;
          plates.push(map);
        }
        uniforms.wetPlate.value = plates[0];
        uniforms.dryPlate.value = plates[1];
      }
      const positions = [],
        colors = [],
        data = [],
        motifs = [],
        centers = [],
        indices = [],
        uv = [];
      const tint = new THREE.Color();
      for (const path of doc.paths) {
        tint.set(path.color);
        const offset = positions.length / 3;
        for (let i = 0; i < path.points.length; i++) {
          const p = path.points[i],
            prev = path.points[Math.max(0, i - 1)],
            next = path.points[Math.min(path.points.length - 1, i + 1)];
          const dx = next.x - prev.x,
            dy = next.y - prev.y,
            len = Math.hypot(dx, dy) || 1;
          for (let edge = 0; edge < 2; edge++) {
            const sign = edge ? 1 : -1,
              world = pictorialPoint(
                {
                  x: p.x - (dy / len) * path.width * sign * 0.75,
                  y: p.y + (dx / len) * path.width * sign * 0.75,
                },
                path.layer,
                path.frame,
              );
            positions.push(...world);
            centers.push(...pictorialPoint(p, path.layer, path.frame));
            bounds.expandByPoint(new THREE.Vector3(...world));
            colors.push(tint.r, tint.g, tint.b);
            data.push(path.band, path.opacity, path.layer);
            motifs.push(
              Math.max(
                0,
                SENSORY_EMOJIS.findIndex((e) => e.id === path.emojiId),
              ),
            );
            uv.push(i / (path.points.length - 1), edge);
          }
          if (i < path.points.length - 1) {
            const k = offset + i * 2;
            indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
          }
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      g.setAttribute(
        "centerLine",
        new THREE.Float32BufferAttribute(centers, 3),
      );
      g.setAttribute("data", new THREE.Float32BufferAttribute(data, 3));
      g.setAttribute("motif", new THREE.Float32BufferAttribute(motifs, 1));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(indices);
      mesh = new THREE.Mesh(
        g,
        new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          vertexColors: true,
          uniforms,
          vertexShader: pictorialVertex,
          fragmentShader: pictorialFragment,
        }),
      );
      mesh.frustumCulled = false;
      group.add(mesh);
      // Pigment deposits from the paper remain present in the landscape.
      const dots = new THREE.BufferGeometry(),
        dp = [],
        dc = [],
        pd = [],
        pm = [],
        seeds = [];
      const source = doc.dots.slice(0, 2048);
      for (let i = 0; i < source.length; i++) {
        const dot = source[i],
          motif = Math.max(
            0,
            SENSORY_EMOJIS.findIndex(
              (e) =>
                e.id === (dot.emojiId || doc.strokes?.[dot.layer]?.emojiId),
            ),
          );
        for (let copy = 0; copy < 2; copy++) {
          dp.push(...pictorialPoint(dot, dot.layer || 0, dot.frame));
          tint.set(dot.color);
          if (motif === 2 && copy === 1)
            tint.lerp(new THREE.Color("#ed893d"), 0.65);
          dc.push(tint.r, tint.g, tint.b);
          pd.push(
            dot.band,
            dot.opacity ?? 0.6,
            Math.min(0.35, Math.max(0.12, dot.size * 140)),
          );
          pm.push(motif);
          seeds.push((i * 0.618034 + copy * 0.37) % 1);
        }
      }
      dots.setAttribute("position", new THREE.Float32BufferAttribute(dp, 3));
      dots.setAttribute("color", new THREE.Float32BufferAttribute(dc, 3));
      dots.setAttribute(
        "particleData",
        new THREE.Float32BufferAttribute(pd, 3),
      );
      dots.setAttribute("motif", new THREE.Float32BufferAttribute(pm, 1));
      dots.setAttribute("seed", new THREE.Float32BufferAttribute(seeds, 1));
      const particles = new THREE.Points(
        dots,
        new THREE.ShaderMaterial({
          uniforms,
          vertexColors: true,
          transparent: true,
          depthWrite: false,
          vertexShader: pigmentParticleVertex,
          fragmentShader: pigmentParticleFragment,
        }),
      );
      particles.frustumCulled = false;
      group.add(particles);
    },
    update(time, audio, dt) {
      if (!active) return;
      uniforms.time.value = time;
      const delta = THREE.MathUtils.clamp(dt || 0, 0, 0.1);
      const finite = (value) =>
        Number.isFinite(value) ? THREE.MathUtils.clamp(value, 0, 1) : 0;
      const level = finite(audio.energy);
      const onset = Math.max(
        finite(audio.flux) * 0.6,
        Math.max(0, level - previousLevel) * 4,
      );
      previousLevel = level;
      accent +=
        (onset - accent) * (1 - Math.exp(-delta * (onset > accent ? 12 : 2.4)));
      uniforms.accent.value = accent;
      for (let i = 0; i < 6; i++) {
        const target = Math.pow(finite(audio.bands?.[i] ?? audio.energy), 0.72);
        energy[i] +=
          (target - energy[i]) *
          (1 - Math.exp(-delta * (target > energy[i] ? 5.5 : 1.7)));
      }
    },
    clear,
    dispose() {
      this.clear();
      for (const map of plates) map.dispose();
      plates.length = 0;
    },
  };
}
