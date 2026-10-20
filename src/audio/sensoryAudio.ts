import type { SensoryParameters } from "../transduction/types.ts";
import { seededRandom } from "../transduction/engine.ts";
/** One bounded graph per sky. No audio is created before an explicit sound gesture. */
export class SensoryAudio {
  context: AudioContext;
  private master: GainNode;
  private filter: BiquadFilterNode;
  private wet: GainNode;
  private voices: { osc: OscillatorNode; gain: GainNode }[] = [];
  private timer: ReturnType<typeof setInterval>;
  private suspendTimer: ReturnType<typeof setTimeout> | undefined;
  private random: () => number;
  private params: SensoryParameters;
  private volume = 0.4;
  private playing = true;
  private closed = false;
  constructor(seed: number, params: SensoryParameters) {
    this.context = new AudioContext();
    const c = this.context;
    this.params = params;
    this.random = seededRandom(seed);
    this.master = c.createGain();
    this.master.gain.value = 0;
    const limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -20;
    limiter.knee.value = 18;
    limiter.ratio.value = 5;
    limiter.attack.value = 0.02;
    limiter.release.value = 0.4;
    this.master.connect(limiter).connect(c.destination);
    this.filter = c.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 1200;
    this.filter.Q.value = 0.35;
    this.filter.connect(this.master);
    const reverb = c.createConvolver(),
      buffer = c.createBuffer(2, c.sampleRate * 3, c.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let smooth = 0;
      for (let i = 0; i < data.length; i++) {
        smooth = smooth * 0.65 + (this.random() * 2 - 1) * 0.35;
        data[i] = smooth * Math.pow(1 - i / data.length, 2.6);
      }
    }
    reverb.buffer = buffer;
    this.wet = c.createGain();
    this.wet.gain.value = 0.3;
    this.filter.connect(reverb).connect(this.wet).connect(this.master);
    const delay = c.createDelay(2),
      feedback = c.createGain(),
      damp = c.createBiquadFilter();
    delay.delayTime.value = 0.73;
    feedback.gain.value = 0.18;
    damp.frequency.value = 850;
    this.filter.connect(delay).connect(damp).connect(feedback).connect(delay);
    feedback.connect(this.master);
    [1, 1.5, 2, 2.5].forEach((ratio, i) => {
      const osc = c.createOscillator(),
        gain = c.createGain(),
        lfo = c.createOscillator(),
        depth = c.createGain();
      osc.type = "sine";
      osc.frequency.value = 110 * ratio;
      gain.gain.value = 0.12 / (i + 1);
      lfo.frequency.value = 0.045 + i * 0.017;
      depth.gain.value = 0.018 / (i + 1);
      lfo.connect(depth).connect(gain.gain);
      osc.connect(gain).connect(this.filter);
      osc.start();
      lfo.start();
      this.voices.push({ osc, gain });
    });
    this.timer = setInterval(() => this.tick(), 1800);
    this.update(params, 0.4);
    void this.context.resume();
  }
  update(params: SensoryParameters, volume: number) {
    if (this.closed) return;
    this.params = params;
    this.volume = Math.max(0, Math.min(1, volume));
    const t = this.context.currentTime;
    this.filter.frequency.setTargetAtTime(
      650 + (params.axes[4] + 1) * 550 - params.axes[6] * 180,
      t,
      1.3,
    );
    this.wet.gain.setTargetAtTime(0.2 + (params.axes[6] + 1) * 0.15, t, 1.8);
    this.voices.forEach(({ osc, gain }, i) => {
      osc.detune.setTargetAtTime(
        Math.sin(i * 2) * (Math.max(0, -params.axes[2]) * 5 + 1),
        t,
        1.5,
      );
      gain.gain.setTargetAtTime(
        (0.1 + (params.axes[2] + 1) * 0.025) / (i + 1),
        t,
        1.5,
      );
    });
    this.master.gain.setTargetAtTime(
      this.playing ? this.volume * 0.55 : 0,
      t,
      0.3,
    );
  }
  private tick() {
    if (!this.playing || this.closed || this.context.state !== "running")
      return;
    const agitation = (this.params.axes[3] + 1) / 2;
    if (this.random() > 0.12 + agitation * 0.35) return;
    const c = this.context,
      t = c.currentTime,
      osc = c.createOscillator(),
      gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value =
      110 * [1, 1.5, 2, 2.5, 3][Math.floor(this.random() * 5)];
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.035, t + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 3);
    osc.connect(gain).connect(this.filter);
    osc.start();
    osc.stop(t + 3.1);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
  async play(active: boolean) {
    if (this.closed) return;
    this.playing = active;
    clearTimeout(this.suspendTimer);
    if (active) {
      await this.context.resume();
      this.update(this.params, this.volume);
    } else {
      this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.07);
      this.suspendTimer = setTimeout(() => {
        if (!this.playing && !this.closed) void this.context.suspend();
      }, 500);
    }
  }
  dispose() {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.timer);
    clearTimeout(this.suspendTimer);
    this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.05);
    const context = this.context;
    setTimeout(() => void context.close(), 250);
  }
}
