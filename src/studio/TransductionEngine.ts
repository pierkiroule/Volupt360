import * as THREE from "three";
import { type Project, type Stroke } from "./model";
import { strokeLayer } from "./Renderer2D";
import { marks } from "./BrushRegistry";
import { samples } from "./StrokeGeometry";
import { motion } from "./EffectBrushEngine";
export function transduce(x: number, y: number, depth: number, index = 0) {
  const px = (x / 1200 - 0.5) * 16,
    py = (0.5 - y / 900) * 12,
    angle = (px / 8) * Math.PI * 0.94;
  return {
    x: THREE.MathUtils.lerp(px, Math.sin(angle) * 6, depth),
    y: py + depth * Math.sin(px * 0.4 + index) * 0.3,
    z:
      depth *
      (Math.cos(angle) * 5 +
        Math.sin(py * 0.6 + index) * 0.7 +
        (index % 5) * 0.12),
  };
}
interface Dynamic {
  geometry: THREE.BufferGeometry;
  base: Float32Array;
  sources: Float32Array;
  stroke: Stroke;
  index: number;
  opacity?: THREE.BufferAttribute;
}
export class TransductionEngine {
  group = new THREE.Group();
  private dynamic: Dynamic[] = [];
  private lastDepth = -1;
  private lastEffects: Project["effects"] | null = null;
  private lastOriginal = false;
  private dummy = new THREE.Object3D();
  private textures: THREE.Texture[] = [];
  private ownedMaterials: THREE.Material[] = [];
  private layers: HTMLCanvasElement[] = [];
  private accents: { material: THREE.Material; opacity: number }[] = [];
  private dissolveMaterials: {
    material: THREE.PointsMaterial;
    stroke: Stroke;
  }[] = [];
  private pointMap: THREE.CanvasTexture | null = null;
  private spheres: {
    mesh: THREE.InstancedMesh;
    marks: ReturnType<typeof marks>;
    stroke: Stroke;
    index: number;
  }[] = [];
  constructor(project: Project, quality = false) {
    project.strokes.forEach((stroke, index) => {
      if (!this.pointMap) {
        const c = document.createElement("canvas");
        c.width = c.height = 32;
        const ctx = c.getContext("2d")!,
          gradient = ctx.createRadialGradient(16, 16, 1, 16, 16, 16);
        gradient.addColorStop(0, "#fff");
        gradient.addColorStop(1, "#ffffff00");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);
        this.pointMap = new THREE.CanvasTexture(c);
        this.textures.push(this.pointMap);
      }
      const flakes = samples(stroke).filter(
        (_, i, a) => i % Math.max(1, Math.floor(a.length / 90)) === 0,
      );
      const flakeGeometry = new THREE.BufferGeometry();
      flakeGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(flakes.length * 3), 3),
      );
      const flakeMaterial = new THREE.PointsMaterial({
        map: this.pointMap,
        color: stroke.color,
        transparent: true,
        depthWrite: false,
        opacity: 0,
        size: 0.055,
      });
      this.ownedMaterials.push(flakeMaterial);
      this.dissolveMaterials.push({ material: flakeMaterial, stroke });
      this.group.add(new THREE.Points(flakeGeometry, flakeMaterial));
      this.dynamic.push({
        geometry: flakeGeometry,
        base: new Float32Array(flakes.flatMap((p) => [p.x, p.y])),
        sources: new Float32Array(flakes.map((p) => p.source)),
        stroke,
        index,
      });
      const layer = strokeLayer(stroke);
      const budget =
        (quality ? 4e6 : 10e6) / Math.max(1, project.strokes.length);
      const ratio = Math.min(
        1,
        Math.sqrt(budget / (layer.canvas.width * layer.canvas.height)),
        (quality ? 480 : 900) /
          Math.max(layer.canvas.width, layer.canvas.height),
      );
      if (ratio < 1) {
        const resized = document.createElement("canvas");
        resized.width = Math.max(1, Math.round(layer.canvas.width * ratio));
        resized.height = Math.max(1, Math.round(layer.canvas.height * ratio));
        resized
          .getContext("2d")!
          .drawImage(layer.canvas, 0, 0, resized.width, resized.height);
        layer.canvas.width = 1;
        layer.canvas = resized;
      }
      this.layers.push(layer.canvas);
      const texture = new THREE.CanvasTexture(layer.canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      this.textures.push(texture);
      const geometry = new THREE.PlaneGeometry(
        (layer.width / 1200) * 16,
        (layer.height / 900) * 12,
        quality ? 10 : 18,
        quality ? 8 : 14,
      );
      const position = geometry.attributes.position;
      const base = new Float32Array(position.count * 2),
        sources = new Float32Array(position.count);
      for (let i = 0; i < position.count; i++) {
        const x =
          layer.x +
          (position.getX(i) / ((layer.width / 1200) * 16) + 0.5) * layer.width;
        const y =
          layer.y +
          (0.5 - position.getY(i) / ((layer.height / 900) * 12)) * layer.height;
        base[i * 2] = x;
        base[i * 2 + 1] = y;
        let nearest = Infinity,
          source = 0;
        const step = Math.max(1, Math.floor(stroke.points.length / 48));
        for (let j = 0; j < stroke.points.length; j += step) {
          const p = stroke.points[j],
            d = (p.x * 1200 - x) ** 2 + (p.y * 900 - y) ** 2;
          if (d < nearest) {
            nearest = d;
            source = j;
          }
        }
        sources[i] = source;
      }
      const opacity = new THREE.BufferAttribute(
        new Float32Array(position.count).fill(1),
        1,
      );
      geometry.setAttribute("inkOpacity", opacity);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        forceSinglePass: true,
      });
      material.onBeforeCompile = (shader) => {
        shader.vertexShader =
          "attribute float inkOpacity;varying float inkAlpha;\n" +
          shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\ninkAlpha=inkOpacity;",
        );
        shader.fragmentShader =
          "varying float inkAlpha;\n" + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <color_fragment>",
          "#include <color_fragment>\ndiffuseColor.a*=inkAlpha;",
        );
      };
      this.ownedMaterials.push(material);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.renderOrder = index;
      this.group.add(mesh);
      this.dynamic.push({ geometry, base, sources, stroke, index, opacity });
      const sourceMarks = marks(stroke),
        type = stroke.brush;
      if (type === "ink") {
        const path = samples(stroke)
          .filter(
            (_, i, a) => i % Math.max(1, Math.floor(a.length / 100)) === 0,
          )
          .map((p) => new THREE.Vector3(p.x, p.y, 0));
        if (path.length === 1)
          path.push(path[0].clone().add(new THREE.Vector3(0.1, 0, 0)));
        const curve = new THREE.CatmullRomCurve3(path);
        const tube = new THREE.TubeGeometry(
          curve,
          Math.min(100, path.length * 2),
          Math.max(0.5, stroke.size * 0.12),
          5,
          false,
        );
        const p = tube.attributes.position,
          b = new Float32Array(p.count * 2),
          s = new Float32Array(p.count);
        for (let i = 0; i < p.count; i++) {
          b[i * 2] = p.getX(i);
          b[i * 2 + 1] = p.getY(i);
          s[i] = (i / p.count) * (stroke.points.length - 1);
        }
        const m = new THREE.MeshBasicMaterial({
          color: stroke.color,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        });
        this.ownedMaterials.push(m);
        this.accents.push({ material: m, opacity: stroke.opacity });
        this.group.add(new THREE.Mesh(tube, m));
        this.dynamic.push({
          geometry: tube,
          base: b,
          sources: s,
          stroke,
          index,
        });
      } else if (type === "bubbles") {
        const circles = sourceMarks
          .filter((m) => m.kind === "ring" && m.color === stroke.color)
          .slice(0, 100);
        const geo = new THREE.SphereGeometry(1, 12, 8),
          mat = new THREE.MeshBasicMaterial({
            color: stroke.color,
            transparent: true,
            opacity: 0,
            wireframe: true,
            depthWrite: false,
          });
        const mesh = new THREE.InstancedMesh(geo, mat, circles.length);
        this.group.add(mesh);
        this.ownedMaterials.push(mat);
        this.accents.push({ material: mat, opacity: stroke.opacity });
        this.spheres.push({ mesh, marks: circles, stroke, index });
      } else {
        const pointMode = type === "dust" || type === "charcoal";
        const vertices: number[] = [],
          refs: number[] = [];
        for (const mark of sourceMarks) {
          if (pointMode && mark.kind === "dot") {
            vertices.push(mark.points[0].x, mark.points[0].y);
            refs.push(mark.points[0].source);
          } else if (
            !pointMode &&
            (mark.kind === "line" ||
              mark.kind === "ring" ||
              mark.kind === "polygon")
          ) {
            const ps =
              mark.kind === "ring"
                ? Array.from({ length: 17 }, (_, k) => ({
                    x:
                      mark.points[0].x +
                      Math.cos((k / 16) * Math.PI * 2) * mark.size,
                    y:
                      mark.points[0].y +
                      Math.sin((k / 16) * Math.PI * 2) * mark.size,
                    source: mark.points[0].source,
                  }))
                : mark.points;
            for (let j = 1; j < ps.length; j++) {
              vertices.push(ps[j - 1].x, ps[j - 1].y, ps[j].x, ps[j].y);
              refs.push(ps[j - 1].source, ps[j].source);
            }
          }
        }
        if (vertices.length) {
          const geo = new THREE.BufferGeometry();
          geo.setAttribute(
            "position",
            new THREE.BufferAttribute(
              new Float32Array((vertices.length / 2) * 3),
              3,
            ),
          );
          const mat = pointMode
            ? new THREE.PointsMaterial({
                color: stroke.color,
                size: type === "dust" ? 0.045 : 0.065,
                map: this.pointMap,
                transparent: true,
                opacity: 0,
                depthWrite: false,
              })
            : new THREE.LineBasicMaterial({
                color: stroke.color,
                transparent: true,
                opacity: 0,
                depthWrite: false,
              });
          this.ownedMaterials.push(mat);
          this.accents.push({ material: mat, opacity: stroke.opacity });
          this.group.add(
            pointMode
              ? new THREE.Points(geo, mat)
              : new THREE.LineSegments(geo, mat),
          );
          this.dynamic.push({
            geometry: geo,
            base: new Float32Array(vertices),
            sources: new Float32Array(refs),
            stroke,
            index,
          });
        }
      }
    });
    this.group.traverse((object) => {
      object.frustumCulled = false;
    });
  }
  update(project: Project, time: number, depth: number, original: boolean) {
    const changed =
      this.lastDepth !== depth ||
      this.lastEffects !== project.effects ||
      this.lastOriginal !== original;
    this.lastDepth = depth;
    this.lastEffects = project.effects;
    this.lastOriginal = original;
    for (const flake of this.dissolveMaterials) {
      const effect = original
        ? undefined
        : project.effects.find(
            (e) =>
              e.enabled &&
              e.type === "dissolve" &&
              e.weights[flake.stroke.id] &&
              (!e.duration || time <= e.referenceTime + e.duration),
          );
      const age = effect ? Math.max(0, time - effect.referenceTime) : 0;
      flake.material.opacity = effect
        ? depth *
          (1 - Math.cos(age * effect.speed * 0.65)) *
          0.5 *
          effect.intensity *
          flake.stroke.opacity
        : 0;
    }
    for (const entry of this.accents) {
      if ("opacity" in entry.material)
        entry.material.opacity = depth * 0.5 * entry.opacity;
    }
    for (const entry of this.dynamic) {
      const attr = entry.geometry.attributes.position,
        arr = attr.array;
      const effects = original ? [] : project.effects;
      const active = effects.some(
        (e) => e.enabled && e.weights[entry.stroke.id],
      );
      if (!active && !changed) continue;
      for (let i = 0; i < attr.count; i++) {
        const x = entry.base[i * 2],
          y = entry.base[i * 2 + 1],
          move = active
            ? motion(effects, entry.stroke, entry.sources[i], x, y, time)
            : { x, y, alpha: 1, scale: 1 };
        const anchor =
          entry.stroke.points[
            Math.min(
              entry.stroke.points.length - 1,
              Math.round(entry.sources[i]),
            )
          ];
        const p = transduce(
          move.x + (x - anchor.x * 1200) * (move.scale - 1),
          move.y + (y - anchor.y * 900) * (move.scale - 1),
          depth,
          entry.index,
        );
        arr[i * 3] = p.x;
        arr[i * 3 + 1] = p.y;
        arr[i * 3 + 2] = p.z;
        if (entry.opacity) entry.opacity.setX(i, move.alpha);
      }
      attr.needsUpdate = true;
      if (entry.opacity) entry.opacity.needsUpdate = true;
    }
    const dummy = this.dummy;
    for (const entry of this.spheres) {
      entry.marks.forEach((m, i) => {
        const point = m.points[0],
          v = motion(
            original ? [] : project.effects,
            entry.stroke,
            point.source,
            point.x,
            point.y,
            time,
          ),
          p = transduce(v.x, v.y, depth, entry.index);
        dummy.position.set(p.x, p.y, p.z);
        dummy.scale.setScalar((m.size / 1200) * 16 * depth * v.scale);
        dummy.updateMatrix();
        entry.mesh.setMatrixAt(i, dummy.matrix);
      });
      entry.mesh.instanceMatrix.needsUpdate = true;
    }
  }
  dispose() {
    this.group.traverse((o) => {
      if ("geometry" in o) (o as THREE.Mesh).geometry?.dispose();
    });
    for (const m of this.ownedMaterials) m.dispose();
    for (const t of this.textures) t.dispose();
    for (const c of this.layers) c.width = 1;
    this.group.clear();
    this.dynamic = [];
    this.textures = [];
    this.layers = [];
    this.ownedMaterials = [];
    this.accents = [];
    this.spheres = [];
    this.dissolveMaterials = [];
    this.pointMap = null;
    this.lastEffects = null;
  }
}
