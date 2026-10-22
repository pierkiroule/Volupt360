import type { Repl } from "@strudel/web";
import { composeMusic, musicScore } from "./musicComposition";
import type { LandscapeSettings } from "./types";
/** Single shared Strudel owner; no sample fetches and no user code evaluation. */
export class StrudelMusicEngine {
  private context: AudioContext | null = null;
  private runtime: typeof import("@strudel/web") | null = null;
  private repl: Repl | null = null;
  private pending: Promise<void> | null = null;
  private master: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private revision = 0;
  private disposed = false;
  private enabled = false;
  private paused = false;
  private volume = 0.55;
  private settings: LandscapeSettings | null = null;
  private async init() {
    if (this.repl && this.master) return;
    if (this.pending) return this.pending;
    this.pending = (async () => {
      this.runtime = await import("@strudel/web");
      if (this.disposed) return;
      void this.runtime.initAudioOnFirstClick({ maxPolyphony: 24 });
      this.repl = await this.runtime.initStrudel({
        audioContext: this.context!,
      });
      await this.runtime.initAudio({ maxPolyphony: 24 });
      if (this.disposed) return;
      const ctx = this.context!;
      this.filter = ctx.createBiquadFilter();
      this.filter.type = "lowpass";
      this.filter.frequency.value = 4800;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 36;
      this.master = ctx.createGain();
      this.master.gain.value = 0;
      this.compressor = ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -14;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 3;
      this.compressor.attack.value = 0.02;
      this.compressor.release.value = 0.3;
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.filter.connect(hp);
      hp.connect(this.master);
      this.master.connect(this.compressor);
      this.compressor.connect(this.analyser);
      this.analyser.connect(ctx.destination);
      this.connectOutput();
    })();
    try {
      await this.pending;
    } catch (error) {
      this.repl?.stop();
      this.repl = null;
      throw error;
    } finally {
      this.pending = null;
    }
  }
  private connectOutput() {
    if (!this.runtime || !this.filter) return;
    const output =
      this.runtime.getSuperdoughAudioController().output.destinationGain;
    output.disconnect();
    output.connect(this.filter);
  }
  private clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
  private fade(value: number) {
    if (!this.context || !this.master) return;
    const gain = this.master.gain,
      now = this.context.currentTime;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(value, now + 0.18);
  }
  async start(settings: LandscapeSettings) {
    if (this.disposed) throw Error("Moteur audio fermé");
    const revision = ++this.revision;
    this.clearTimer();
    this.enabled = true;
    this.settings = settings;
    // Unlock before any asynchronous module loading (especially on mobile).
    try {
      if (!this.context)
        this.context = new AudioContext({ latencyHint: "playback" });
      await this.context.resume();
      await this.init();
      if (this.disposed || revision !== this.revision) return;
      if (!this.repl || !this.runtime) throw Error("Strudel indisponible");
      const current = this.settings || settings;
      this.repl.setCps(musicScore(current).bpm / 240);
      await this.repl.setPattern(composeMusic(this.runtime, current), false);
      if (this.paused) {
        this.repl.pause();
        await this.context.suspend();
        return;
      }
      await this.repl.start();
      this.fade(this.volume);
    } catch (e) {
      this.enabled = false;
      this.fade(0);
      this.repl?.stop();
      await this.context?.suspend();
      throw e;
    }
  }
  async stop() {
    this.enabled = false;
    ++this.revision;
    this.clearTimer();
    this.fade(0);
    this.repl?.stop();
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.disposed || this.enabled) return;
      this.runtime?.resetGlobalEffects();
      this.connectOutput();
      void this.context?.suspend();
    }, 220);
  }
  async setPaused(value: boolean) {
    if (this.paused === value) return;
    this.paused = value;
    if (!this.enabled || !this.repl || !this.context) return;
    this.clearTimer();
    if (value) {
      this.repl.pause();
      this.fade(0);
      this.timer = setTimeout(() => {
        this.timer = null;
        if (this.paused) void this.context?.suspend();
      }, 220);
    } else {
      await this.context.resume();
      if (this.enabled && !this.paused) {
        await this.repl.start();
        this.fade(this.volume);
      }
    }
  }
  setVolume(value: number) {
    this.volume = Math.max(
      0,
      Math.min(0.85, Number.isFinite(value) ? value : 0),
    );
    if (this.enabled && !this.paused) this.fade(this.volume);
  }
  async update(settings: LandscapeSettings) {
    this.settings = settings;
    if (!this.enabled || !this.repl || !this.runtime) return;
    const token = ++this.revision;
    this.clearTimer();
    this.fade(0);
    await new Promise((resolve) => setTimeout(resolve, 220));
    if (this.disposed || !this.enabled || token !== this.revision) return;
    this.repl.stop();
    this.runtime.resetGlobalEffects();
    this.connectOutput();
    this.repl.setCps(musicScore(settings).bpm / 240);
    await this.repl.setPattern(composeMusic(this.runtime, settings), false);
    if (!this.paused) {
      await this.context?.resume();
      await this.repl.start();
      this.fade(this.volume);
    }
  }
  /** Caller-owned buffer: no allocations and no implicit audio activation. */
  sampleEnergy(samples: Float32Array<ArrayBuffer>) {
    if (!this.analyser || !this.enabled || this.paused) return 0;
    this.analyser.getFloatTimeDomainData(samples);
    let sum = 0;
    for (const value of samples) sum += value * value;
    return Math.sqrt(sum / samples.length);
  }
  inspect() {
    const samples = new Float32Array(512);
    this.analyser?.getFloatTimeDomainData(samples);
    let sum = 0,
      peak = 0;
    for (const v of samples) {
      sum += v * v;
      peak = Math.max(peak, Math.abs(v));
    }
    return {
      enabled: this.enabled,
      paused: this.paused,
      state: this.context?.state || "uninitialized",
      rms: Math.sqrt(sum / samples.length),
      peak,
      volume: this.volume,
      seed: this.settings?.seed,
      orbits: this.runtime
        ? Object.keys(
            (
              this.runtime.getSuperdoughAudioController() as unknown as {
                nodes: object;
              }
            ).nodes,
          ).length
        : 0,
    };
  }
  async dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.enabled = false;
    ++this.revision;
    this.clearTimer();
    this.repl?.stop();
    this.fade(0);
    try {
      await this.pending;
    } catch {
      /* Initialization failure still requires cleanup. */
    }
    if (this.repl) {
      this.runtime?.resetGlobalEffects();
      this.runtime?.setSuperdoughAudioController(null);
    }
    this.master?.disconnect();
    this.filter?.disconnect();
    this.compressor?.disconnect();
    this.analyser?.disconnect();
    if (this.context && this.context.state !== "closed")
      await this.context.close();
    this.repl = null;
    this.runtime = null;
  }
}
let shared: StrudelMusicEngine | null = null;
export function getLandscapeMusic() {
  return shared ?? (shared = new StrudelMusicEngine());
}
export async function releaseLandscapeMusic() {
  const engine = shared;
  shared = null;
  await engine?.dispose();
}
