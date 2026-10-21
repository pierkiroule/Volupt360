import { type BrushId, BRUSH_IDS, type Project } from "./model";
import { transduce } from "./TransductionEngine";
/** One optional native graph, soft procedural voices, no sample/API. */
export class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private nodes = new Set<AudioNode>();
  private active = 0;
  private last = -1;
  private enabled = false;
  private paused = false;
  private noise: AudioBuffer | null = null;
  private volume = 0.35;
  private step = 0;
  private scheduled = 0;
  async enable(value: boolean) {
    this.enabled = value;
    if (!value) {
      this.master?.gain.setTargetAtTime(0, this.context!.currentTime, 0.12);
      return;
    }
    if (!this.context) this.create();
    await this.context!.resume();
    this.setVolume(this.volume);
  }
  private create() {
    const ctx = (this.context = new AudioContext());
    const master = (this.master = ctx.createGain());
    master.gain.value = 0;
    const filter = (this.filter = ctx.createBiquadFilter());
    filter.type = "lowpass";
    filter.frequency.value = 2100;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -22;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.015;
    compressor.release.value = 0.4;
    filter.connect(master);
    master.connect(compressor);
    compressor.connect(ctx.destination);
    const reverb = ctx.createConvolver(),
      buffer = ctx.createBuffer(2, ctx.sampleRate * 1.6, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const a = buffer.getChannelData(channel);
      let seed = 173 + channel;
      for (let i = 0; i < a.length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        a[i] =
          ((seed / 4294967296) * 2 - 1) * Math.pow(1 - i / a.length, 3) * 0.22;
      }
    }
    reverb.buffer = buffer;
    const wet = ctx.createGain();
    wet.gain.value = 0.24;
    filter.connect(reverb);
    reverb.connect(wet);
    wet.connect(master);
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * 0.3;
    this.nodes = new Set([master, filter, compressor, reverb, wet]);
    document.addEventListener("visibilitychange", this.visibility);
  }
  private visibility = () => {
    if (document.hidden) void this.context?.suspend();
    else if (this.enabled) void this.context?.resume().catch(() => {});
  };
  setVolume(value: number) {
    this.volume = value;
    if (this.context && this.master)
      this.master.gain.setTargetAtTime(
        this.enabled && !this.paused ? value * 0.65 : 0,
        this.context.currentTime,
        0.1,
      );
  }
  setPaused(value: boolean) {
    this.paused = value;
    this.setVolume(this.volume);
  }
  setListener(
    position: { x: number; y: number; z: number },
    forward: { x: number; y: number; z: number },
    up: { x: number; y: number; z: number },
  ) {
    if (!this.context) return;
    const l = this.context.listener;
    l.positionX.value = position.x;
    l.positionY.value = position.y;
    l.positionZ.value = position.z;
    l.forwardX.value = forward.x;
    l.forwardY.value = forward.y;
    l.forwardZ.value = forward.z;
    l.upX.value = up.x;
    l.upY.value = up.y;
    l.upZ.value = up.z;
  }
  gesture(brush: BrushId, x = 0.5, y = 0.5, intensity = 0.5) {
    if (
      !this.enabled ||
      this.paused ||
      !this.context ||
      this.context.state !== "running" ||
      this.active >= 8
    )
      return;
    const ctx = this.context,
      now = ctx.currentTime;
    if (now - this.last < 0.12) return;
    this.last = now;
    const index = BRUSH_IDS.indexOf(brush),
      notes = [0, 2, 4, 7, 9],
      midi =
        45 +
        notes[(index + Math.floor(y * 4)) % 5] +
        (index % 3 === 1 ? 12 : 0),
      freq = 440 * 2 ** ((midi - 69) / 12);
    const oscillator = ctx.createOscillator(),
      partial = ctx.createOscillator(),
      gain = ctx.createGain(),
      tone = ctx.createBiquadFilter(),
      panner = ctx.createPanner();
    oscillator.type = index === 3 || index === 5 ? "triangle" : "sine";
    oscillator.frequency.value = freq;
    partial.type = "sine";
    partial.frequency.value =
      freq * (index === 4 || index === 7 ? 2.001 : 1.003);
    partial.detune.value = index % 2 ? 3 : -3;
    const duration = index === 4 || index === 8 ? 2.8 : 1.3 + index * 0.07;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.024 + intensity * 0.025, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    tone.type = "lowpass";
    tone.frequency.value = 500 + index * 105;
    const position = transduce(x * 1200, y * 900, 1, index);
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = 8;
    panner.positionX.value = position.x;
    panner.positionY.value = position.y;
    panner.positionZ.value = position.z;
    oscillator.connect(tone);
    partial.connect(tone);
    tone.connect(gain);
    gain.connect(panner);
    panner.connect(this.filter!);
    let noiseSource: AudioBufferSourceNode | undefined;
    let noiseGain: GainNode | undefined;
    if ([0, 1, 3, 5, 10].includes(index) && this.noise) {
      noiseSource = ctx.createBufferSource();
      noiseSource.buffer = this.noise;
      noiseSource.loop = true;
      noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.35;
      noiseSource.connect(noiseGain);
      noiseGain.connect(tone);
      noiseSource.start(now);
      noiseSource.stop(now + duration + 0.05);
    }
    const owned: AudioNode[] = [oscillator, partial, tone, gain, panner];
    if (noiseSource && noiseGain) owned.push(noiseSource, noiseGain);
    for (const node of owned) this.nodes.add(node);
    this.active++;
    oscillator.start(now);
    partial.start(now);
    oscillator.stop(now + duration + 0.05);
    partial.stop(now + duration + 0.05);
    oscillator.onended = () => {
      for (const node of owned) {
        node.disconnect();
        this.nodes.delete(node);
      }
      this.active = Math.max(0, this.active - 1);
    };
  }
  update(
    project: Project,
    time: number,
    position?: { x: number; y: number; z: number },
  ) {
    if (!this.enabled || this.paused || !this.context) return;
    if (position) {
      const l = this.context.listener;
      l.positionX.value = position.x;
      l.positionY.value = position.y;
      l.positionZ.value = position.z;
    }
    if (time < this.scheduled) this.scheduled = time - 2;
    if (time - this.scheduled < 1.5) return;
    this.scheduled = time;
    const stroke =
      project.strokes[this.step++ % Math.max(1, project.strokes.length)];
    if (!stroke) return;
    const effect = project.effects.find(
      (e) => e.enabled && e.targets.includes(stroke.id),
    );
    const point = stroke.points[Math.floor(stroke.points.length / 2)];
    if (effect && this.filter)
      this.filter.frequency.setTargetAtTime(
        850 + (1 + Math.sin(time * effect.speed)) * effect.intensity * 700,
        this.context.currentTime,
        0.5,
      );
    this.gesture(
      stroke.brush,
      point.x,
      point.y,
      0.25 + (effect?.intensity || 0) * 0.2,
    );
  }
  dispose() {
    document.removeEventListener("visibilitychange", this.visibility);
    this.enabled = false;
    for (const node of this.nodes) node.disconnect();
    this.nodes.clear();
    void this.context?.close();
    this.context = null;
    this.active = 0;
    this.noise = null;
  }
  get diagnostics() {
    return {
      active: this.active,
      nodes: this.nodes.size,
      state: this.context?.state || "closed",
    };
  }
}
