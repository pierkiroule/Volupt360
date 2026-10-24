import * as THREE from "three";
import {
  PaintEngine,
  Kind,
  type Segment,
  type Drop,
} from "../vendor/pigment-drift/paint/engine";
import { composeWeather } from "./composition";
import type { MusicSignal } from "./MusicSignal";

/** One small GPU painting shared with the 3D renderer through a canvas texture.
 * Lazy initialization, bounded inputs, no readback, no history snapshots or RAF. */
export class PigmentMusic {
  private readonly size: number;
  private canvas = document.createElement("canvas");
  private engine: PaintEngine | null = null;
  texture: THREE.CanvasTexture | null = null;
  previousTexture: THREE.CanvasTexture | null = null;
  blend = 1;
  private inkCount = 2;
  private ids = ["warm", "water"];
  private time = 0;
  private accumulator = 0;
  private sinceDrop = 0;
  private index = 0;
  private deposited = 0;
  private updates = 0;
  private failed = false;
  private reduced = false;
  private disposed = false;
  private segments: Segment[] = [];
  private drops: Drop[] = [];
  private drop: Drop = {
    x: 0,
    y: 0,
    r0: 0,
    r1: 0,
    ink: 0.7,
    kind: Kind.Paint,
    slot: 0,
  };
  private segment: Segment = {
    ax: 0,
    ay: 0,
    bx: 0,
    by: 0,
    radius: 10,
    target: 0.3,
    strength: 0.2,
    kind: Kind.Water,
    slot: 0,
    fx: 0,
    fy: 0,
    coupling: 0.3,
  };
  constructor(coarse = false) {
    this.size = coarse ? 128 : 192;
    this.canvas.addEventListener("webglcontextlost", this.lost);
  }
  private lost = (event: Event) => {
    event.preventDefault();
    this.disable();
  };
  private initialize() {
    try {
      this.engine = new PaintEngine(this.canvas, {
        coarse: true,
        pressureIterations: this.size === 128 ? 4 : 6,
      });
      this.engine.newSheet({
        width: this.size,
        height: this.size,
        unit: this.size,
        seed: [17.3, 39.1],
      });
      this.engine.setView(this.size, this.size, this.size, this.size);
      this.setPalette(this.ids);
      this.engine.render(0);
      this.texture = new THREE.CanvasTexture(this.canvas);
      this.texture.colorSpace = THREE.SRGBColorSpace;
      this.texture.generateMipmaps = false;
      this.texture.minFilter = THREE.LinearFilter;
      // Independent Source objects are essential: Texture.clone() shares its Source
      // and Three.js may otherwise share the same GPU storage for both states.
      this.previousTexture = new THREE.CanvasTexture(this.canvas);
      this.previousTexture.colorSpace = THREE.SRGBColorSpace;
      this.previousTexture.generateMipmaps = false;
      this.previousTexture.minFilter = THREE.LinearFilter;
    } catch {
      this.disable();
    }
  }
  setPalette(ids: string[]) {
    this.ids = [...ids];
    this.inkCount = composeWeather(ids).entries.length;
    if (!this.engine) return;
    const score = composeWeather(ids);
    const inks = score.palettes.map((p) => {
      const base = new THREE.Color(p.color),
        paper = new THREE.Color("#fff9ee");
      return [0.45, 0.75, 1, 1.35, 1.7].map(
        (amount) =>
          "#" +
          base
            .clone()
            .multiplyScalar(Math.min(1, amount))
            .lerp(paper, Math.max(0, amount - 1))
            .getHexString(),
      );
    });
    this.engine.setLook({
      paper: "#ffffff",
      inks,
      layers: 5,
      bleed: 0.4 + score.weather[1] * 0.25,
      drift: 0.08,
      texture: 0.8,
      edges: 0.65,
      hueDrift: 0.08,
      mist: 0.2,
      ridge: 0.4,
      feather: 0.6,
      density: 1.05,
    });
  }
  setReducedQuality() {
    this.reduced = true;
  }
  update(dt: number, signal: Readonly<MusicSignal>, paused: boolean) {
    if (this.disposed || this.failed || paused) return;
    if (!this.engine) {
      if (signal.energy < 0.012) return;
      this.initialize();
    }
    if (!this.engine || !this.texture || this.engine.isContextLost) {
      if (this.engine?.isContextLost) this.disable();
      return;
    }
    this.time += dt;
    this.sinceDrop += dt;
    this.accumulator += dt;
    const interval = this.reduced ? 1 / 8 : 1 / 12;
    // Display interpolates the last two completed states at the screen refresh rate.
    // Keep the remainder so 60 Hz does not quantize 12 Hz updates into uneven steps.
    this.blend = Math.min(1, this.accumulator / interval);
    if (this.accumulator < interval) return;
    this.accumulator = Math.min(this.accumulator - interval, interval);

    const scale = this.size / 192;
    this.segments.length = 0;
    this.drops.length = 0;
    if (
      signal.energy > 0.012 &&
      this.sinceDrop > (signal.onset > 0.025 ? 0.4 : 1.2)
    ) {
      const phase = this.index++ * 2.39996,
        radius = (24 + ((this.index * 29) % 54)) * scale;
      this.drop.x = this.size / 2 + Math.cos(phase) * radius;
      this.drop.y = this.size / 2 + Math.sin(phase) * radius;
      this.drop.r1 = (7 + signal.low * 18 + signal.energy * 9) * scale;
      this.drop.ink = 0.5 + signal.energy * 0.35;
      this.drop.slot = this.index % this.inkCount;
      // Occasional water blooms displace pigment; older pigment remains in the field.
      this.drop.kind = this.index % 5 === 0 ? Kind.Water : Kind.Paint;
      this.drops.push(this.drop);
      this.deposited++;
      this.sinceDrop = 0;
    }
    if (signal.energy > 0.008) {
      const t = this.time * 0.5;
      this.segment.ax = this.size / 2 + Math.sin(t) * 48 * scale;
      this.segment.ay = this.size / 2 + Math.cos(t * 0.73) * 50 * scale;
      this.segment.bx = this.segment.ax + Math.cos(t) * 10 * scale;
      this.segment.by = this.segment.ay + Math.sin(t) * 10 * scale;
      this.segment.fx = Math.cos(t) * signal.low * 28 * scale;
      this.segment.fy = Math.sin(t) * signal.high * 24 * scale;
      this.segment.coupling = 0.15 + signal.energy * 0.4;
      this.segment.radius = (14 + signal.low * 12) * scale;
      this.segments.push(this.segment);
    }
    try {
      const changed = this.engine.step(
        1 / 30,
        this.time * 1000,
        this.segments,
        this.drops,
      );
      if (changed) {
        this.engine.render(this.time);
        const previous = this.texture;
        this.texture = this.previousTexture!;
        this.previousTexture = previous;
        // Only the new state is uploaded; the other texture retains its GPU image.
        this.texture.needsUpdate = true;
        this.blend = Math.min(1, this.accumulator / interval);
        this.updates++;
      }
    } catch {
      this.disable();
    }
  }
  inspect() {
    return {
      state: this.failed ? "fallback" : this.engine ? "active" : "idle",
      deposits: this.deposited,
      updates: this.updates,
      size: this.size,
    };
  }
  private disable() {
    this.failed = true;
    this.texture?.dispose();
    this.previousTexture?.dispose();
    this.previousTexture = null;
    this.texture = null;
    try {
      this.engine?.dispose();
    } catch {}
    this.engine = null;
    this.canvas
      .getContext("webgl2")
      ?.getExtension("WEBGL_lose_context")
      ?.loseContext();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.canvas.removeEventListener("webglcontextlost", this.lost);
    this.disable();
    this.canvas.width = this.canvas.height = 0;
  }
}
