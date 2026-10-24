import { ElectroRhythm } from "./ElectroRhythm";
import { Sampler } from "smplr";
import type { MusicSignal } from "./MusicSignal";
import { WeatherScore } from "./WeatherScore";

export class WeatherMusic {
  readonly context = new AudioContext({ latencyHint: "playback" });
  private analyser = this.context.createAnalyser();
  private waveform = new Float32Array(512);
  private spectrum = new Uint8Array(256);
  private signal: MusicSignal = { energy: 0, low: 0, high: 0, onset: 0 };
  private previousEnergy = 0;
  private gain = this.context.createGain();
  private filter = this.context.createBiquadFilter();
  private compressor = this.context.createDynamicsCompressor();
  private reverb = this.context.createConvolver();
  private wet = this.context.createGain();
  private input = this.context.createGain();
  private bed = this.context.createGain();
  private drumTone = this.context.createBiquadFilter();
  private rhythm: ElectroRhythm;
  private panners: StereoPannerNode[] = [];
  private loading: Promise<void> | undefined;
  private instruments: ReturnType<typeof Sampler>[] = [];
  private suspendTimer: ReturnType<typeof setTimeout> | undefined;
  private timer: ReturnType<typeof setInterval> | undefined;
  private score: WeatherScore;
  private clock = 0;
  private last = 0;
  private running = false;
  private disposed = false;
  private loaded = false;
  private volume = 0.55;
  private abort = new AbortController();
  constructor(ids: string[], interrupted?: () => void) {
    this.score = new WeatherScore(ids);
    this.bed.connect(this.input);
    this.drumTone.type = "lowpass";
    this.drumTone.frequency.value = 7500;
    this.drumTone.Q.value = 0.3;
    this.drumTone.connect(this.compressor);
    this.rhythm = new ElectroRhythm(
      this.context,
      this.drumTone,
      (time) => {
        this.bed.gain.cancelAndHoldAtTime(time);
        this.bed.gain.linearRampToValueAtTime(0.65, time + 0.012);
        this.bed.gain.setTargetAtTime(1, time + 0.035, 0.16);
      },
      (note, time, velocity) => {
        this.instruments[1]?.start({
          note,
          time,
          velocity,
          duration: 0.32,
          ampRelease: 0.15,
        });
      },
    );
    this.rhythm.setPalette(ids);
    this.gain.gain.value = 0;
    this.filter.type = "lowpass";
    this.filter.Q.value = 0.35;
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 3;
    this.compressor.attack.value = 0.025;
    this.compressor.release.value = 0.35;
    // Deterministic, filtered stereo impulse, constructed once (not an audio sample).
    const length = this.context.sampleRate * 3.6,
      impulse = this.context.createBuffer(2, length, this.context.sampleRate);
    let seed = 1931;
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      let smooth = 0;
      for (let i = 0; i < length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        smooth = smooth * 0.7 + ((seed / 4294967296) * 2 - 1) * 0.3;
        data[i] = smooth * Math.pow(1 - i / length, 3) * 0.35;
      }
    }
    this.reverb.buffer = impulse;
    this.wet.gain.value = 0.55;
    this.input.connect(this.filter);
    this.filter.connect(this.compressor);
    this.filter.connect(this.reverb);
    this.reverb.connect(this.wet);
    this.wet.connect(this.compressor);
    this.compressor.connect(this.gain);
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.8;
    this.gain.connect(this.analyser);
    this.analyser.connect(this.context.destination);
    this.setPalette(ids);
    this.context.onstatechange = () => {
      if (this.running && this.context.state !== "running" && !this.disposed) {
        this.pause();
        interrupted?.();
      }
    };
  }
  async start() {
    // Called synchronously from a click, before loading, to unlock mobile audio.
    if (this.suspendTimer) clearTimeout(this.suspendTimer);
    await this.context.resume();
    if (this.disposed) return;
    if (!this.loaded) await (this.loading ??= this.load());
    if (this.disposed) return;
    this.running = true;
    this.rhythm.start();
    this.last = this.context.currentTime;
    this.gain.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.6);
    if (!this.timer) this.timer = setInterval(() => this.tick(), 80);
    this.tick();
  }
  private async load() {
    const groups = [
      ["piano", ["C4", "D5", "C6"]],
      ["wood", ["C3", "F4", "C5"]],
      ["bow", ["E4", "G4", "D5"]],
      ["strings", ["D3", "C4", "D5"]],
    ] as const;
    try {
      await this.rhythm.load(this.abort.signal);
      const sets = await Promise.all(
        groups.map(async ([name, roots], index) => {
          const buffers = await Promise.all(
            ["low", "mid", "high"].map(async (level) => {
              const response = await fetch(
                `${import.meta.env.BASE_URL}audio/emociel/${name}-${level}.ogg`,
                { signal: this.abort.signal },
              );
              if (!response.ok) throw Error("Échantillon indisponible");
              return this.context.decodeAudioData(await response.arrayBuffer());
            }),
          );
          if (this.disposed) throw Error("Lecture fermée");
          const panner = this.context.createStereoPanner();
          panner.connect(this.bed);
          this.panners[index] = panner;
          const sampler = Sampler(this.context, {
            destination: panner,
            volume: 92,
            decayTime: 1.8,
            detune: 0,
            lpfCutoffHz: 7000,
            buffers: Object.fromEntries(
              buffers.map((buffer, i) => [roots[i], buffer]),
            ),
          });
          this.instruments.push(sampler);
          await sampler.ready;
          return sampler;
        }),
      );
      this.instruments = sets;
      this.loaded = true;
    } catch (error) {
      this.dispose();
      throw error;
    }
  }
  private tick() {
    if (!this.running || this.disposed || this.context.state !== "running")
      return;
    this.analyser.getFloatTimeDomainData(this.waveform);
    this.analyser.getByteFrequencyData(this.spectrum);
    let sum = 0,
      low = 0,
      high = 0;
    for (const sample of this.waveform) sum += sample * sample;
    for (let i = 1; i < 8; i++) low += this.spectrum[i] / (7 * 255);
    for (let i = 12; i < 55; i++) high += this.spectrum[i] / (43 * 255);
    const measured = Math.min(1, Math.sqrt(sum / 512) * 12);
    this.signal.onset = Math.max(0, measured - this.previousEnergy);
    this.previousEnergy = measured;
    this.signal.energy += (measured - this.signal.energy) * 0.3;
    this.signal.low += (low - this.signal.low) * 0.2;
    this.signal.high += (high - this.signal.high) * 0.2;
    const now = this.context.currentTime;
    this.clock += now - this.last;
    this.last = now;
    for (const event of this.score.advance(this.clock)) {
      if (event.instrument === 0) this.signal.note = event.note;
      const instrument = this.instruments[event.instrument];
      this.panners[event.instrument].pan.setTargetAtTime(event.pan, now, 1.5);
      instrument.start({
        note: event.note,
        velocity: event.velocity,
        duration: event.duration,
        time: this.rhythm.quantize(now + event.at - this.clock),
      });
    }
    this.rhythm.tick(this.score.harmonyNotes);
  }
  readSignal(): Readonly<MusicSignal> {
    this.signal.beat = this.running ? this.rhythm.phase() : 0;
    return this.signal;
  }
  setPalette(ids: string[]) {
    this.score.setPalette(ids);
    this.rhythm.setPalette(ids);
    this.filter.frequency.setTargetAtTime(
      this.score.profile.cutoff + 1400,
      this.context.currentTime,
      2,
    );
  }
  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(0.8, value));
    if (this.running)
      this.gain.gain.setTargetAtTime(
        this.volume,
        this.context.currentTime,
        0.15,
      );
  }
  pause() {
    this.running = false;
    this.rhythm.stop();
    this.bed.gain.cancelScheduledValues(this.context.currentTime);
    this.bed.gain.setTargetAtTime(1, this.context.currentTime, 0.08);
    this.signal.energy =
      this.signal.low =
      this.signal.high =
      this.signal.onset =
        0;
    this.previousEnergy = 0;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.gain.gain.cancelScheduledValues(this.context.currentTime);
    this.gain.gain.setTargetAtTime(0, this.context.currentTime, 0.08);
    for (const i of this.instruments) i.stop();
    if (!this.disposed)
      this.suspendTimer = setTimeout(() => {
        if (!this.running && this.context.state === "running")
          void this.context.suspend();
      }, 350);
  }
  inspect() {
    return {
      state: this.context.state,
      loaded: this.loaded,
      running: this.running,
      events: this.score.events,
      profile: this.score.profile.key,
      rhythm: this.rhythm.inspect(),
    };
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.context.onstatechange = null;
    if (this.suspendTimer) clearTimeout(this.suspendTimer);
    this.pause();
    this.abort.abort();
    for (const i of this.instruments) i.dispose();
    this.instruments = [];
    for (const panner of this.panners) panner.disconnect();
    this.panners = [];
    for (const node of [
      this.analyser,
      this.drumTone,
      this.bed,
      this.input,
      this.filter,
      this.reverb,
      this.wet,
      this.compressor,
      this.gain,
    ])
      node.disconnect();
    this.reverb.buffer = null;
    void this.context.close();
  }
}
