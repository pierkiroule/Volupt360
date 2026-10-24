import { composeWeather } from "./composition";

/** Three original, sample-backed drum loops on one clock, plus a restrained sub bass.
 * The melodic sampler and visual phase use this same audio clock. */
export class ElectroRhythm {
  static readonly bpm = 104;
  static readonly beat = 60 / 104;
  private buffers: AudioBuffer[] = [];
  private sources: AudioBufferSourceNode[] = [];
  private gains: GainNode[] = [];
  private voices = new Set<OscillatorNode>();
  private envelopeNodes = new Set<GainNode>();
  private origin = 0;
  private nextStep = 0;
  private running = false;
  private mix = [0.65, 0.25, 0.1];
  hits = 0;
  constructor(
    private context: AudioContext,
    private destination: AudioNode,
    private duck: (time: number) => void,
    private arpeggio: (note: number, time: number, velocity: number) => void,
  ) {}
  async load(signal: AbortSignal) {
    this.buffers = await Promise.all(
      ["four", "broken", "air"].map(async (name) => {
        const response = await fetch(
          `${import.meta.env.BASE_URL}audio/electro/${name}.ogg`,
          { signal },
        );
        if (!response.ok) throw Error("Boucle rythmique indisponible");
        return this.context.decodeAudioData(await response.arrayBuffer());
      }),
    );
  }
  setPalette(ids: string[]) {
    const p = composeWeather(ids);
    const rain = p.weather[1] + p.magic[1];
    const a = 0.35 + p.weather[0] * 0.55 + p.climate[0] * 0.3;
    const b = 0.15 + rain * 0.5 + p.weather[2] * 0.35;
    const c =
      0.12 + p.weather[3] * 0.45 + p.climate[2] * 0.4 + p.climate[1] * 0.25;
    const total = a + b + c;
    this.mix = [a / total, b / total, c / total];
    this.gains.forEach((g, i) =>
      g.gain.setTargetAtTime(this.mix[i] * 0.48, this.context.currentTime, 1.2),
    );
  }
  start() {
    if (this.running) return;
    this.running = true;
    this.origin = this.context.currentTime + 0.08;
    this.nextStep = 0;
    this.buffers.forEach((buffer, i) => {
      const source = this.context.createBufferSource(),
        gain = this.context.createGain();
      source.buffer = buffer;
      source.loop = true;
      source.loopEnd = buffer.duration;
      source.playbackRate.value = buffer.duration / (ElectroRhythm.beat * 16);
      gain.gain.value = 0;
      gain.gain.setTargetAtTime(this.mix[i] * 0.48, this.origin, 0.5);
      source.connect(gain);
      gain.connect(this.destination);
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
      };
      source.start(this.origin);
      this.sources.push(source);
      this.gains.push(gain);
    });
  }
  phase() {
    return this.running
      ? Math.max(
          0,
          (this.context.currentTime - this.origin) / ElectroRhythm.beat,
        )
      : 0;
  }
  quantize(time: number) {
    return (
      this.origin +
      Math.ceil((time - this.origin) / (ElectroRhythm.beat * 0.5)) *
        ElectroRhythm.beat *
        0.5
    );
  }
  tick(chord: readonly number[]) {
    if (!this.running) return;
    const now = this.context.currentTime,
      stepDuration = ElectroRhythm.beat / 4;
    if (this.origin + this.nextStep * stepDuration < now - 0.15)
      this.nextStep = Math.max(
        0,
        Math.ceil((now - this.origin) / stepDuration),
      );
    let budget = 0;
    while (
      this.origin + this.nextStep * stepDuration < now + 0.18 &&
      budget++ < 8
    ) {
      const step = this.nextStep++,
        time = this.origin + step * stepDuration,
        s = step % 16,
        bar = Math.floor(step / 16);
      if (s % 4 === 0) {
        this.duck(time);
        this.hits++;
      }
      if ([0, 6, 8, 11].includes(s) && bar % 8 !== 7)
        this.bass(chord[s === 11 ? 1 : 0] - 12, time, s === 0 ? 0.21 : 0.13);
      if (step % 2 === 0 && bar % 8 < 6) {
        const motif = [0, 1, 2, 3, 2, 1, 3, 1];
        this.arpeggio(
          chord[motif[Math.floor(step / 2) % 8]],
          time,
          30 + (step % 4 ? 7 : 0),
        );
      }
    }
  }
  private bass(note: number, time: number, volume: number) {
    const oscillator = this.context.createOscillator(),
      gain = this.context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value =
      440 * 2 ** ((Math.max(26, Math.min(45, note)) - 69) / 12);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.3);
    oscillator.connect(gain);
    gain.connect(this.destination);
    oscillator.start(time);
    oscillator.stop(time + 0.33);
    this.voices.add(oscillator);
    this.envelopeNodes.add(gain);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      this.voices.delete(oscillator);
      this.envelopeNodes.delete(gain);
    };
  }
  stop() {
    this.running = false;
    const now = this.context.currentTime;
    this.gains.forEach((g) => g.gain.setTargetAtTime(0, now, 0.025));
    for (const source of this.sources) {
      try {
        source.stop(now + 0.15);
      } catch {}
    }
    this.sources = [];
    this.gains = [];
    for (const gain of this.envelopeNodes) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0.0001, now, 0.025);
    }
    for (const oscillator of this.voices) {
      try {
        oscillator.stop(now + 0.12);
      } catch {}
    }
    // onended releases each source and envelope after the short fade.
  }
  inspect() {
    return {
      running: this.running,
      loops: this.sources.length,
      hits: this.hits,
      voices: this.voices.size,
      bpm: ElectroRhythm.bpm,
    };
  }
}
