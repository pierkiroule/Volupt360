import type { SensoryParameters } from "../transduction/types.ts";
import { seededRandom } from "../transduction/engine.ts";
import { GenerativeScore, type MusicalEvent } from "./generativeScore.ts";
/** Look-ahead scheduling, bounded voices and a single stereo graph, unlocked by a user gesture. */
export class SensoryAudio {
  context: AudioContext;
  private master: GainNode;
  private filter: BiquadFilterNode;
  private wet: GainNode;
  private timer: ReturnType<typeof setInterval>;
  private suspendTimer: ReturnType<typeof setTimeout> | undefined;
  private score: GenerativeScore;
  private nextBeat = 0;
  private params: SensoryParameters;
  private volume = 0.4;
  private playing = true;
  private closed = false;
  private voices = new Set<OscillatorNode>();
  constructor(seed: number, params: SensoryParameters) {
    const c = (this.context = new AudioContext());
    this.params = params;
    this.score = new GenerativeScore(seed);
    const random = seededRandom(seed);
    this.master = c.createGain();
    this.master.gain.value = 0;
    const compressor = c.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.025;
    compressor.release.value = 0.35;
    this.master.connect(compressor).connect(c.destination);
    this.filter = c.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 2300;
    this.filter.Q.value = 0.35;
    this.filter.connect(this.master);
    const reverb = c.createConvolver(),
      impulse = c.createBuffer(2, c.sampleRate * 3.5, c.sampleRate);
    for (let k = 0; k < 2; k++) {
      const data = impulse.getChannelData(k);
      let v = 0;
      for (let i = 0; i < data.length; i++) {
        v = v * 0.6 + (random() * 2 - 1) * 0.4;
        data[i] = v * Math.pow(1 - i / data.length, 2.4);
      }
    }
    reverb.buffer = impulse;
    this.wet = c.createGain();
    this.wet.gain.value = 0.3;
    this.filter.connect(reverb).connect(this.wet).connect(this.master);
    const delay = c.createDelay(3),
      feedback = c.createGain(),
      damp = c.createBiquadFilter();
    delay.delayTime.value = this.score.beat * 0.75;
    feedback.gain.value = 0.23;
    damp.frequency.value = 1500;
    this.filter.connect(delay).connect(damp).connect(feedback).connect(delay);
    feedback.connect(this.master);
    this.nextBeat = c.currentTime + 0.08;
    this.timer = setInterval(() => this.tick(), 80);
    this.update(params, 0.4);
    void c.resume();
  }
  update(params: SensoryParameters, volume: number) {
    if (this.closed) return;
    this.params = params;
    this.volume = Math.max(0, Math.min(1, volume));
    const t = this.context.currentTime;
    this.filter.frequency.setTargetAtTime(
      1700 + (params.axes[4] + 1) * 650 - params.axes[6] * 250,
      t,
      1.5,
    );
    this.wet.gain.setTargetAtTime(0.22 + (params.axes[6] + 1) * 0.12, t, 1.8);
    this.master.gain.setTargetAtTime(
      this.playing ? this.volume * 0.85 : 0,
      t,
      0.25,
    );
  }
  private note(event: MusicalEvent, time: number) {
    if (this.voices.size >= 48) return;
    const c = this.context,
      osc = c.createOscillator(),
      envelope = c.createGain(),
      filter = c.createBiquadFilter(),
      pan = c.createStereoPanner(),
      frequency = 440 * Math.pow(2, (event.midi - 69) / 12);
    osc.type = event.kind === "pad" ? "triangle" : "sine";
    osc.frequency.value = frequency;
    const attack =
        event.kind === "pad" ? 1.4 : event.kind === "melody" ? 0.024 : 0.055,
      release = event.kind === "pad" ? 2 : 1;
    filter.type = "lowpass";
    filter.frequency.value =
      event.kind === "pad" ? 800 : event.kind === "bass" ? 260 : 2200;
    filter.Q.value = 0.4;
    envelope.gain.setValueAtTime(0.00001, time);
    envelope.gain.exponentialRampToValueAtTime(event.gain, time + attack);
    envelope.gain.exponentialRampToValueAtTime(
      0.00001,
      time + event.duration + release,
    );
    if (event.kind === "pulse") {
      osc.frequency.setValueAtTime(72, time);
      osc.frequency.exponentialRampToValueAtTime(39, time + 0.18);
    }
    if (event.kind === "melody") {
      filter.frequency.setValueAtTime(2800, time);
      filter.frequency.exponentialRampToValueAtTime(650, time + event.duration);
    }
    pan.pan.value = event.pan;
    osc.connect(filter).connect(envelope).connect(pan).connect(this.filter);
    this.voices.add(osc);
    osc.start(time);
    osc.stop(time + event.duration + release + 0.05);
    osc.onended = () => {
      this.voices.delete(osc);
      osc.disconnect();
      filter.disconnect();
      envelope.disconnect();
      pan.disconnect();
    };
  }
  private tick() {
    if (!this.playing || this.closed || this.context.state !== "running")
      return;
    const now = this.context.currentTime;
    if (this.nextBeat < now - 0.2) this.nextBeat = now + 0.04;
    while (this.nextBeat < now + 0.25) {
      for (const event of this.score.next((this.params.axes[3] + 1) / 2))
        this.note(event, this.nextBeat);
      this.nextBeat += this.score.beat;
    }
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
    const c = this.context;
    setTimeout(() => void c.close(), 250);
  }
}
