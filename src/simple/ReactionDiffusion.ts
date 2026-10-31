import * as THREE from "three";
import type { MusicSignal } from "./MusicSignal";
import { reactionProfiles } from "./ReactionDiffusionProfiles";

/** Immediate rollback: false leaves the existing watercolor pipeline untouched. */
export const ENABLE_REACTION_DIFFUSION = true;

/** One same-context field, two half-float targets. No readback, RAF or frame allocations.
 * Fixed time steps cap catch-up work; no expensive work before entering the world. */
export class ReactionDiffusion {
  readonly size: number;
  private targets: THREE.WebGLRenderTarget[] = [];
  private scene = new THREE.Scene();
  private camera = new THREE.Camera();
  private mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private initial: THREE.DataTexture | null = null;
  private cursor = 0;
  private accumulator = 0;
  private clock = 0;
  private lastDeposit = -10;
  private count = 0;
  private encounters = 0;
  private lastEncounter = -10;
  private pending = new THREE.Vector3(0.5, 0.5, 0);
  private steps = 0;
  private ready = false;
  private failed = false;
  private disposed = false;
  private reduced = false;
  private random = 9173;
  private audioEnergy = 0;
  private audioHigh = 0;
  private audioLow = 0;
  private u = {
    state: { value: null as THREE.Texture | null },
    initial: { value: 0 },
    texel: { value: new THREE.Vector2() },
    feed: { value: new THREE.Vector3() },
    kill: { value: new THREE.Vector3() },
    layers: { value: 1 },
    seed: { value: new THREE.Vector4(-1, -1, 0, 0) },
    motion: { value: 0 },
  };
  constructor(
    mobile = false,
    private enabled = ENABLE_REACTION_DIFFUSION,
  ) {
    this.size = mobile ? 128 : 192;
    this.u.texel.value.set(1 / this.size, 1 / this.size);
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms: this.u,
        depthTest: false,
        depthWrite: false,
        vertexShader: `varying vec2 uvField;void main(){uvField=uv;gl_Position=vec4(position.xy,0.,1.);}`,
        fragmentShader: `uniform sampler2D state;uniform vec2 texel;uniform vec3 feed,kill;uniform vec4 seed;uniform float layers,initial,motion;varying vec2 uvField;
      vec2 field(vec2 p){return texture2D(state,clamp(p,texel*.5,1.-texel*.5)).rg;}
      void main(){vec2 p=uvField;vec2 c=field(p);
        if(initial>.5){gl_FragColor=vec4(c,0.,1.);return;}
        vec2 lap=-c;
        lap+=(field(p+vec2(texel.x,0.))+field(p-vec2(texel.x,0.))+field(p+vec2(0.,texel.y))+field(p-vec2(0.,texel.y)))*.2;
        lap+=(field(p+texel)+field(p-texel)+field(p+vec2(texel.x,-texel.y))+field(p+vec2(-texel.x,texel.y)))*.05;
        // Spatial regimes remain separate. Only narrow borders interpolate parameters.
        vec3 w=vec3(1.,0.,0.);
        if(layers>1.5){float b=smoothstep(1./layers-.055,1./layers+.055,p.x);w=vec3(1.-b,b,0.);}
        if(layers>2.5){float b=smoothstep(2./3.-.055,2./3.+.055,p.x);w=vec3(w.x,w.y*(1.-b),b);}
        float f=dot(feed,w),k=dot(kill,w),reaction=c.x*c.y*c.y;
        vec2 next=c+vec2(.16*lap.x-reaction+f*(1.-c.x),.08*lap.y+reaction-(f+k)*c.y)*(1.+motion*.12);
        float drop=(1.-smoothstep(seed.z*.4,seed.z,length(p-seed.xy)))*seed.w;
        next=mix(next,vec2(.45,.65),drop);
        gl_FragColor=vec4(clamp(next,0.,1.),0.,1.);
      }`,
      }),
    );
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
    this.setPalette(["warm"]);
  }
  setPalette(ids: string[]) {
    const profiles = reactionProfiles(ids);
    this.u.layers.value = profiles.length;
    this.u.feed.value.set(
      ...([0, 1, 2].map((i) => profiles[i % profiles.length].feed) as [
        number,
        number,
        number,
      ]),
    );
    this.u.kill.value.set(
      ...([0, 1, 2].map((i) => profiles[i % profiles.length].kill) as [
        number,
        number,
        number,
      ]),
    );
    // Keep existing material when the palette changes, like changing ink on wet paper.
  }
  private rand() {
    this.random = (Math.imul(this.random, 1664525) + 1013904223) >>> 0;
    return this.random / 4294967296;
  }
  private initialize(renderer: THREE.WebGLRenderer) {
    if (
      !renderer.capabilities.isWebGL2 ||
      !renderer.extensions.has("EXT_color_buffer_float")
    ) {
      this.failed = true;
      return;
    }
    const pixels = new Uint8Array(this.size * this.size * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 255;
      pixels[i + 3] = 255;
    }
    // Broad irregular deposits make the living matter readable immediately.
    // Same UV scale on mobile and desktop; no expensive warm-up burst.
    for (let n = 0; n < 34; n++) {
      const x = Math.floor((0.1 + this.rand() * 0.8) * this.size),
        y = Math.floor((0.1 + this.rand() * 0.8) * this.size),
        radius = ((3.5 + this.rand() * 3.5) * this.size) / 128,
        extent = Math.ceil(radius * 1.2),
        phase = this.rand() * 6.28;
      for (let j = -extent; j <= extent; j++)
        for (let i = -extent; i <= extent; i++) {
          const r = Math.hypot(i, j * 0.85) / radius,
            border = 1 + Math.sin(Math.atan2(j, i) * 3 + phase) * 0.14;
          if (
            r > border ||
            x + i < 0 ||
            x + i >= this.size ||
            y + j < 0 ||
            y + j >= this.size
          )
            continue;
          const k = ((y + j) * this.size + x + i) * 4,
            amount = 1 - THREE.MathUtils.smoothstep(r, border * 0.65, border);
          pixels[k] = Math.min(pixels[k], Math.round(255 - amount * 125));
          pixels[k + 1] = Math.max(pixels[k + 1], Math.round(amount * 165));
        }
    }
    this.initial = new THREE.DataTexture(pixels, this.size, this.size);
    this.initial.needsUpdate = true;
    for (let i = 0; i < 2; i++)
      this.targets.push(
        new THREE.WebGLRenderTarget(this.size, this.size, {
          type: THREE.HalfFloatType,
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          depthBuffer: false,
          stencilBuffer: false,
          generateMipmaps: false,
        }),
      );
    this.u.state.value = this.initial;
    this.u.initial.value = 1;
    for (const target of this.targets) {
      renderer.setRenderTarget(target);
      if (
        renderer
          .getContext()
          .checkFramebufferStatus(renderer.getContext().FRAMEBUFFER) !==
        renderer.getContext().FRAMEBUFFER_COMPLETE
      )
        throw Error("Reaction field unavailable");
      renderer.render(this.scene, this.camera);
    }
    this.initial.dispose();
    this.initial = null;
    this.u.initial.value = 0;
    this.ready = true;
  }
  get texture(): THREE.Texture | null {
    return this.ready &&
      !this.failed &&
      !this.disposed &&
      this.targets.length === 2
      ? this.targets[this.cursor].texture
      : null;
  }
  suggestEncounter(seed: Readonly<{ u: number; v: number; strength: number }>) {
    if (seed.strength > 0.35 && this.clock - this.lastEncounter > 5)
      this.pending.set(
        THREE.MathUtils.clamp(seed.u, 0.06, 0.94),
        THREE.MathUtils.clamp(seed.v, 0.06, 0.94),
        Math.min(0.8, seed.strength),
      );
  }
  setReducedQuality() {
    this.reduced = true;
  }
  update(
    renderer: THREE.WebGLRenderer,
    dt: number,
    signal: Readonly<MusicSignal>,
    paused: boolean,
  ) {
    if (!this.enabled || this.failed || this.disposed || paused || dt <= 0)
      return;
    const target = renderer.getRenderTarget();
    try {
      if (!this.ready) this.initialize(renderer);
      if (!this.ready) return;
      const elapsed = Math.min(dt, 0.1);
      this.clock += elapsed;
      this.audioEnergy = THREE.MathUtils.damp(
        this.audioEnergy,
        signal.energy,
        2,
        elapsed,
      );
      this.audioLow = THREE.MathUtils.damp(
        this.audioLow,
        signal.low,
        1.2,
        elapsed,
      );
      this.audioHigh = THREE.MathUtils.damp(
        this.audioHigh,
        signal.high,
        1.4,
        elapsed,
      );
      this.u.motion.value = this.audioEnergy;
      this.accumulator += elapsed;
      const interval = this.reduced ? 1 / 12 : 1 / 20;
      if (this.accumulator < interval) return;
      this.accumulator %= interval;
      // At most one musical seed per second; silence only evolves the existing field.
      const encounter =
        this.pending.z > 0.35 && this.clock - this.lastEncounter > 5;
      const deposit =
        ((signal.onset > 0.1 && this.audioEnergy > 0.025) || encounter) &&
        this.clock - this.lastDeposit > 1.2;
      const passes = this.reduced ? 2 : 4;
      for (let i = 0; i < passes; i++) {
        this.u.seed.value.set(-1, -1, 0, 0);
        if (i === 0 && deposit) {
          this.u.seed.value.set(
            encounter
              ? this.pending.x
              : signal.note !== undefined
                ? 0.16 + (((signal.note * 7) % 19) / 19) * 0.68
                : 0.12 + this.rand() * 0.76,
            encounter
              ? this.pending.y
              : signal.note !== undefined
                ? 0.16 + (((signal.note * 11) % 23) / 23) * 0.68
                : 0.12 + this.rand() * 0.76,
            0.025 + this.audioLow * 0.018,
            0.45 + this.audioHigh * 0.2,
          );
          if (encounter) {
            this.encounters++;
            this.lastEncounter = this.clock;
            this.pending.z = 0;
          }
          this.lastDeposit = this.clock;
          this.count++;
        }
        this.u.state.value = this.targets[this.cursor].texture;
        this.cursor = 1 - this.cursor;
        renderer.setRenderTarget(this.targets[this.cursor]);
        renderer.render(this.scene, this.camera);
        this.steps++;
      }
    } catch {
      this.failed = true;
      this.release();
    } finally {
      renderer.setRenderTarget(target);
    }
  }
  inspect() {
    return {
      state: !this.enabled
        ? "disabled"
        : this.failed
          ? "fallback"
          : this.ready
            ? "active"
            : "idle",
      size: this.size,
      steps: this.steps,
      deposits: this.count,
      encounters: this.encounters,
      targets: this.targets.length,
    };
  }
  /** A restored WebGL context needs newly seeded targets, never uninitialized history. */
  reset() {
    this.release();
    this.ready = false;
    this.accumulator = 0;
    this.failed = false;
  }
  private release() {
    this.targets.forEach((t) => t.dispose());
    this.targets = [];
    this.initial?.dispose();
    this.initial = null;
    this.u.state.value = null;
  }
  dispose() {
    this.disposed = true;
    this.release();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
