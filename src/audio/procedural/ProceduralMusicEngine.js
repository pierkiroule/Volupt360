import * as Tone from "tone";
import {
  GenerativeScore,
  normalizeParameters,
  seedNumber,
  MUSIC_MODES,
} from "./musicScore.js";
/** Own context/transport: never takes over another experience's Tone globals. */
export class ProceduralMusicEngine {
  constructor({
    context,
    seed = "squibble",
    mode = "ambient",
    parameters = {},
    volume = 0.62,
  } = {}) {
    // Tone's public entry point creates one default context on import. Reuse it
    // rather than creating a second native AudioContext after the user gesture.
    this.context =
      context ||
      (Tone.getContext().disposed || Tone.getContext().state === "closed"
        ? new Tone.Context({ latencyHint: "playback", lookAhead: 0.12 })
        : Tone.getContext());
    this.ownsContext = !context;
    this.transport = this.context.transport;
    this.seed = String(seed);
    this.mode = mode;
    this.target = normalizeParameters(parameters);
    this.current = { ...this.target };
    this.score = new GenerativeScore({ seed, mode, parameters: this.current });
    this.volume = volume;
    this.status = "stopped";
    this.disposed = false;
    this.nodes = [];
    this.instruments = {};
    this.panners = {};
    this.history = [];
    this.features = { energy: 0, pulse: 0 };
    this.featureTime = performance.now() / 1000;
    this.lastEvent = -100;
    const own = (node) => {
      this.nodes.push(node);
      return node;
    };
    this.own = own;
    const c = this.context;
    this.bus = own(new Tone.Gain({ context: c, gain: 1 }));
    this.filter = own(
      new Tone.Filter({
        context: c,
        type: "lowpass",
        frequency: 2800,
        rolloff: -24,
        Q: 0.45,
      }),
    );
    this.eq = own(
      new Tone.EQ3({
        context: c,
        low: 1,
        mid: -1,
        high: -3,
        lowFrequency: 180,
        highFrequency: 2400,
      }),
    );
    this.compressor = own(
      new Tone.Compressor({
        context: c,
        threshold: -20,
        ratio: 2,
        knee: 14,
        attack: 0.03,
        release: 0.3,
      }),
    );
    this.makeup = own(new Tone.Gain({ context: c, gain: 5 }));
    this.output = own(new Tone.Gain({ context: c, gain: 0 }));
    this.limiter = own(new Tone.Limiter({ context: c, threshold: -1 }));
    this.analyser = own(
      new Tone.Analyser({
        context: c,
        type: "waveform",
        size: 256,
        smoothing: 0.85,
      }),
    );
    this.bus.chain(
      this.filter,
      this.eq,
      this.compressor,
      this.makeup,
      this.output,
      this.limiter,
      c.destination,
    );
    this.limiter.connect(this.analyser);
    // Seeded impulse and attack noise are generated locally, no sample downloads.
    let state = seedNumber("impulse");
    const random = () =>
      (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2147483648 - 1;
    const impulse = c.createBuffer(
      2,
      Math.ceil(c.sampleRate * 3.4),
      c.sampleRate,
    );
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      let low = 0;
      for (let i = 0; i < data.length; i++) {
        low += 0.15 * (random() - low);
        data[i] =
          low *
          Math.exp(-i / (c.sampleRate * 0.72)) *
          Math.min(1, i / (c.sampleRate * 0.025));
      }
    }
    this.reverb = own(
      new Tone.Convolver({ context: c, url: impulse, normalize: true }),
    );
    this.wet = own(new Tone.Gain({ context: c, gain: 0.3 }));
    this.bus.connect(this.reverb);
    this.reverb.chain(this.wet, this.filter);
    this.delay = own(
      new Tone.FeedbackDelay({
        context: c,
        delayTime: 0.43,
        feedback: 0.16,
        wet: 1,
      }),
    );
    this.echo = own(new Tone.Gain({ context: c, gain: 0.08 }));
    this.bus.connect(this.delay);
    this.delay.chain(this.echo, this.filter);
    const poly = (name, Voice, options, max, db, pan) => {
      const instrument = own(
        new Tone.PolySynth({
          context: c,
          voice: Voice,
          options,
          maxPolyphony: max,
          volume: db,
        }),
      );
      const panner = own(new Tone.Panner({ context: c, pan }));
      instrument.chain(panner, this.bus);
      this.instruments[name] = instrument;
      this.panners[name] = panner;
    };
    poly(
      "piano",
      Tone.Synth,
      {
        oscillator: { type: "custom", partials: [1, 0.34, 0.14, 0.06, 0.025] },
        envelope: { attack: 0.018, decay: 1.7, sustain: 0.08, release: 2.1 },
      },
      6,
      -15,
      -0.18,
    );
    poly(
      "pad",
      Tone.Synth,
      {
        oscillator: { type: "custom", partials: [1, 0.16, 0.07] },
        envelope: { attack: 2.8, decay: 2, sustain: 0.55, release: 5 },
      },
      8,
      -25,
      0.18,
    );
    poly(
      "strings",
      Tone.Synth,
      {
        oscillator: { type: "triangle" },
        envelope: { attack: 1.6, decay: 1.5, sustain: 0.4, release: 4 },
      },
      4,
      -28,
      -0.3,
    );
    poly(
      "texture",
      Tone.FMSynth,
      {
        harmonicity: 1.5,
        modulationIndex: 0.4,
        oscillator: { type: "sine" },
        modulation: { type: "sine" },
        envelope: { attack: 1.1, decay: 2, sustain: 0.16, release: 4 },
        modulationEnvelope: {
          attack: 1.7,
          decay: 2,
          sustain: 0.15,
          release: 3,
        },
      },
      3,
      -30,
      0.35,
    );
    poly(
      "bell",
      Tone.FMSynth,
      {
        harmonicity: 2,
        modulationIndex: 0.8,
        oscillator: { type: "sine" },
        modulation: { type: "sine" },
        envelope: { attack: 0.035, decay: 2.6, sustain: 0, release: 2 },
        modulationEnvelope: {
          attack: 0.02,
          decay: 1.2,
          sustain: 0,
          release: 1.5,
        },
      },
      3,
      -26,
      0.25,
    );
    const drum = own(
      new Tone.MembraneSynth({
        context: c,
        volume: -27,
        pitchDecay: 0.025,
        octaves: 1.2,
        oscillator: { type: "sine" },
        envelope: { attack: 0.012, decay: 0.25, sustain: 0, release: 0.3 },
      }),
    );
    const drumPan = own(new Tone.Panner({ context: c, pan: -0.1 }));
    drum.chain(drumPan, this.bus);
    this.instruments.drum = drum;
    this.panners.drum = drumPan;
    const attack = c.createBuffer(
        1,
        Math.ceil(c.sampleRate * 0.09),
        c.sampleRate,
      ),
      a = attack.getChannelData(0);
    let low = 0;
    for (let i = 0; i < a.length; i++) {
      low += 0.08 * (random() - low);
      a[i] = low * Math.exp(-i / (c.sampleRate * 0.012));
    }
    this.attack = own(
      new Tone.Player({
        context: c,
        url: attack,
        fadeIn: 0.006,
        fadeOut: 0.02,
        volume: -37,
      }),
    ).connect(this.panners.piano);
    this.scheduleId = this.transport.scheduleRepeat(
      (time) => this.tick(time),
      "8n",
      0,
    );
    this.transport.bpm.value = this.score.bpm;
    this.stateListener = () => {
      if (this.context.state !== "running" && this.status === "playing") {
        this.status = "interrupted";
        this.transport.pause();
      }
    };
    c.on("statechange", this.stateListener);
  }
  tick(time) {
    if (this.disposed) return;
    for (const key of Object.keys(this.current))
      this.current[key] += (this.target[key] - this.current[key]) * 0.12;
    this.score.configure(this.mode, this.current);
    const frame = this.score.next();
    this.transport.bpm.rampTo(frame.bpm, 3);
    const p = this.current;
    this.filter.frequency.rampTo(
      1100 + p.brightness * 3400 + p.energy * 350,
      1,
    );
    this.wet.gain.rampTo(0.1 + p.depth * 0.36, 1.5);
    this.echo.gain.rampTo(0.015 + p.depth * 0.12, 1.5);
    this.delay.feedback.rampTo(0.08 + p.tension * 0.08 + p.depth * 0.1, 2);
    this.instruments.texture.set({
      modulationIndex: 0.15 + p.tension * 0.65 + p.brightness * 0.15,
    });
    this.instruments.piano.set({
      detune: (1 - p.stability) * 2,
      envelope: { release: 1.4 + p.fluidity * 2 },
    });
    let index = 0;
    for (const pan of Object.values(this.panners)) {
      pan.pan.rampTo(
        Math.sin(frame.step * 0.09 + index++ * 2.1) * p.depth * 0.48,
        2,
      );
    }
    const secondsPerBeat = 60 / frame.bpm;
    let attackPlayed = false;
    for (const event of frame.events) {
      const when = time + event.offset * secondsPerBeat;
      const notes = event.notes.map((n) => 440 * Math.pow(2, (n - 69) / 12));
      this.instruments[event.instrument].triggerAttackRelease(
        event.instrument === "drum" ? notes[0] : notes,
        event.duration * secondsPerBeat,
        when,
        event.velocity,
      );
      if (event.instrument === "piano" && !attackPlayed) {
        this.attack.start(when, 0, 0.06);
        attackPlayed = true;
      }
      this.lastEvent = when;
      this.history.push({ step: frame.step, ...event });
      if (this.history.length > 128) this.history.shift();
    }
  }
  configure({ mode = this.mode, parameters = this.target } = {}) {
    if (MUSIC_MODES[mode]) this.mode = mode;
    this.target = normalizeParameters(parameters);
  }
  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, Number(value) || 0));
    if (this.status === "playing") this.output.gain.rampTo(this.volume, 0.15);
  }
  async play() {
    if (this.disposed) throw Error("Moteur fermé.");
    await this.context.resume();
    if (this.disposed) return;
    this.status = "playing";
    this.output.gain.rampTo(this.volume, 0.3);
    this.transport.start();
  }
  pause() {
    if (this.disposed) return;
    this.status = "paused";
    this.transport.pause();
    this.output.gain.rampTo(0, 0.15);
    for (const i of Object.values(this.instruments)) i.releaseAll?.();
  }
  stop() {
    if (this.disposed) return;
    this.pause();
    this.transport.stop();
    this.transport.seconds = 0;
    this.score = new GenerativeScore({
      seed: this.seed,
      mode: this.mode,
      parameters: this.target,
    });
    this.current = { ...this.target };
    this.history = [];
    this.status = "stopped";
  }
  newComposition(seed) {
    const running = this.status === "playing";
    this.stop();
    this.seed = String(seed || "squibble");
    this.score = new GenerativeScore({
      seed: this.seed,
      mode: this.mode,
      parameters: this.target,
    });
    if (running) {
      this.status = "playing";
      this.output.gain.rampTo(this.volume, 0.4);
      this.transport.start("+0.2");
    }
  }
  evolve() {
    this.configure({
      parameters: {
        ...this.target,
        complexity: Math.min(1, this.target.complexity + 0.12),
        density: Math.min(0.8, this.target.density + 0.06),
        stability: Math.max(0.3, this.target.stability - 0.08),
      },
    });
  }
  calm() {
    this.configure({
      parameters: {
        ...this.target,
        energy: 0.18,
        density: 0.22,
        tension: 0.08,
        brightness: 0.3,
        fluidity: 0.88,
        depth: 0.8,
        complexity: 0.25,
        stability: 0.9,
      },
    });
  }
  getFeatures() {
    const now = performance.now() / 1000,
      dt = Math.max(0, Math.min(0.15, now - this.featureTime));
    this.featureTime = now;
    let rms = 0;
    if (!this.disposed && this.status === "playing") {
      const values = this.analyser.getValue();
      let sum = 0;
      for (let i = 0; i < values.length; i++) sum += values[i] * values[i];
      rms = Math.min(1, Math.sqrt(sum / values.length) * 5);
    }
    const speed = rms > this.features.energy ? 4 : 1.8;
    this.features.energy +=
      (rms - this.features.energy) * (1 - Math.exp(-dt * speed));
    const target =
      !this.disposed && this.status === "playing"
        ? Math.max(
            0,
            Math.min(1, 1 - (this.context.now() - this.lastEvent) / 1.8),
          )
        : 0;
    this.features.pulse +=
      (target - this.features.pulse) * (1 - Math.exp(-dt * 3));
    return this.features;
  }
  get diagnostics() {
    return {
      status: this.status,
      nodes: this.nodes.length,
      events: this.history.length,
      step: this.score.step,
      voices: Object.values(this.instruments).reduce(
        (s, i) => s + (i.activeVoices || 0),
        0,
      ),
      context: this.context.state,
    };
  }
  async exportWav(duration = 30) {
    if (typeof OfflineAudioContext === "undefined")
      throw Error("Rendu WAV indisponible sur ce navigateur.");
    const length = Math.max(2, Math.min(60, Number(duration) || 30)),
      c = new Tone.OfflineContext(2, length, 32000);
    let renderer;
    try {
      renderer = new ProceduralMusicEngine({
        context: c,
        seed: this.seed,
        mode: this.mode,
        parameters: this.target,
        volume: this.volume,
      });
      renderer.status = "playing";
      renderer.output.gain.setValueAtTime(0, 0);
      renderer.output.gain.linearRampToValueAtTime(this.volume, 0.4);
      renderer.output.gain.setValueAtTime(
        this.volume,
        Math.max(0.5, length - 2),
      );
      renderer.output.gain.linearRampToValueAtTime(0, length - 0.03);
      renderer.transport.start(0);
      const result = await c.render();
      return encodeWav(result.get());
    } finally {
      renderer?.dispose();
      c.dispose();
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.status = "disposed";
    this.transport.clear(this.scheduleId);
    this.transport.stop();
    this.context.off("statechange", this.stateListener);
    for (const node of this.nodes.reverse()) node.dispose();
    this.nodes = [];
    this.history = [];
    if (this.ownsContext) this.context.dispose();
  }
}
export function encodeWav(buffer) {
  const channels = buffer.numberOfChannels,
    length = buffer.length,
    bytes = new ArrayBuffer(44 + length * channels * 2),
    view = new DataView(bytes);
  const text = (offset, s) => {
    for (let i = 0; i < s.length; i++)
      view.setUint8(offset + i, s.charCodeAt(i));
  };
  text(0, "RIFF");
  view.setUint32(4, bytes.byteLength - 8, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, bytes.byteLength - 44, true);
  const data = Array.from({ length: channels }, (_, i) =>
    buffer.getChannelData(i),
  );
  let offset = 44;
  for (let i = 0; i < length; i++)
    for (let ch = 0; ch < channels; ch++) {
      const n = Math.max(-1, Math.min(1, data[ch][i]));
      view.setInt16(offset, n < 0 ? n * 32768 : n * 32767, true);
      offset += 2;
    }
  return new Blob([bytes], { type: "audio/wav" });
}
let shared = null;
export function getMusicEngine(options) {
  if (!shared || shared.disposed) shared = new ProceduralMusicEngine(options);
  return shared;
}
export function disposeMusicEngine(engine) {
  if (shared === engine) {
    shared.dispose();
    shared = null;
  }
}
