import { OrganicInstrumentBank } from "./organicInstruments.ts";
import type { SensoryParameters } from "../transduction/types.ts";
import { seededRandom } from "../transduction/engine.ts";
import { GenerativeScore, type MusicalEvent } from "./generativeScore.ts";
/** Look-ahead scheduling, bounded voices and a single stereo graph, unlocked by a user gesture. */
export class SensoryAudio {
  context: AudioContext;
  private bank: OrganicInstrumentBank;
  private padWave: PeriodicWave;
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
  private voices = new Set<AudioScheduledSourceNode>();
  constructor(seed: number, params: SensoryParameters) {
    const c = (this.context = new AudioContext());
    this.bank = new OrganicInstrumentBank(c, seed);
    this.padWave = c.createPeriodicWave(
      new Float32Array(5),
      new Float32Array([0, 1, 0.12, 0.032, 0.008]),
    );
    this.params = params;
    this.score = new GenerativeScore(seed);
    const random = seededRandom(seed);
    this.master = c.createGain();
    this.master.gain.value = 0;
    const compressor = c.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 2;
    compressor.attack.value = 0.025;
    compressor.release.value = 0.35;
    const subsonic = c.createBiquadFilter();
    subsonic.type = "highpass";
    subsonic.frequency.value = 28;
    subsonic.Q.value = 0.5;
    const makeup = c.createGain();
    makeup.gain.value = 1.6;
    this.master
      .connect(subsonic)
      .connect(compressor)
      .connect(makeup)
      .connect(c.destination);
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
    this.wet.gain.value = 0.23;
    const send = c.createBiquadFilter(),
      predelay = c.createDelay(0.1);
    send.type = "highpass";
    send.frequency.value = 180;
    predelay.delayTime.value = 0.027;
    this.filter
      .connect(send)
      .connect(predelay)
      .connect(reverb)
      .connect(this.wet)
      .connect(this.master);
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
    this.wet.gain.setTargetAtTime(0.15 + (params.axes[6] + 1) * 0.09, t, 1.8);
    this.master.gain.setTargetAtTime(
      this.playing ? this.volume * 0.85 : 0,
      t,
      0.25,
    );
  }
  private note(event: MusicalEvent, time: number) {
    const layers = event.kind === "pad" ? 2 : 1;
    if (this.voices.size + layers > 40) return;
    const c = this.context,
      frequency = 440 * 2 ** ((event.midi - 69) / 12);
    // Prepare the procedural buffer before choosing the timestamp; first-use DSP cannot schedule in the past.
    const buffer =
      event.kind === "pad"
        ? null
        : this.bank.get(
            event.kind === "melody"
              ? (event.timbre ?? "felt")
              : event.kind === "bass"
                ? "bass"
                : "brush",
            event.midi,
          );
    const start = Math.max(time + (event.offset ?? 0), c.currentTime + 0.012);
    for (let layer = 0; layer < layers; layer++) {
      const envelope = c.createGain(),
        filter = c.createBiquadFilter(),
        pan = c.createStereoPanner();
      const source = buffer ? c.createBufferSource() : c.createOscillator();
      if (source instanceof OscillatorNode) {
        source.setPeriodicWave(this.padWave);
        source.frequency.value = frequency;
        source.detune.value = layer === 0 ? -2.1 : 2.1;
      } else source.buffer = buffer;
      const attack = event.kind === "pad" ? 1.6 : 0.012,
        release = event.kind === "pad" ? 2.8 : 0.5;
      const end =
        start +
        (buffer
          ? Math.min(buffer.duration, event.duration + release)
          : event.duration + release);
      const gain = event.gain / (layers === 2 ? 2.2 : 1);
      envelope.gain.setValueAtTime(0.00001, start);
      envelope.gain.exponentialRampToValueAtTime(gain, start + attack);
      if (event.kind === "pad") {
        envelope.gain.setTargetAtTime(gain * 0.72, start + attack, 0.9);
        envelope.gain.exponentialRampToValueAtTime(0.00001, end);
      } else {
        envelope.gain.setValueAtTime(
          gain,
          Math.max(start + attack, end - 0.32),
        );
        envelope.gain.exponentialRampToValueAtTime(0.00001, end);
      }
      filter.type = "lowpass";
      filter.frequency.value =
        event.kind === "pad"
          ? 1100
          : event.kind === "bass"
            ? 650
            : event.kind === "pulse"
              ? 1400
              : 2800;
      filter.Q.value = 0.35;
      pan.pan.value = Math.max(
        -0.85,
        Math.min(
          0.85,
          event.pan + (layers === 2 ? (layer === 0 ? -0.15 : 0.15) : 0),
        ),
      );
      source
        .connect(filter)
        .connect(envelope)
        .connect(pan)
        .connect(this.filter);
      this.voices.add(source);
      source.start(start);
      source.stop(end + 0.02);
      source.onended = () => {
        this.voices.delete(source);
        source.disconnect();
        filter.disconnect();
        envelope.disconnect();
        pan.disconnect();
      };
    }
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
    this.bank.clear();
    clearTimeout(this.suspendTimer);
    this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.05);
    const c = this.context;
    setTimeout(() => void c.close(), 250);
  }
}
