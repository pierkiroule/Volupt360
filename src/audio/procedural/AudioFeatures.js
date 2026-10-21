const clamp = (v) => Math.max(0, Math.min(1, v));
const LOW = [35, 200, 1800],
  HIGH = [200, 1800, 6500],
  GAIN = [6, 10, 16],
  KEYS = ["bass", "mid", "treble"];
/** Persistent FFT buffers and envelopes; actual audio only, no beat-clock animation. */
export class AudioFeatures {
  constructor(sampleRate, bins = 512) {
    this.binHz = sampleRate / (bins * 2);
    this.previous = new Float32Array(bins);
    this.peaks = new Float32Array([0.03, 0.03, 0.03]);
    this.value = { energy: 0, bass: 0, mid: 0, treble: 0, pulse: 0 };
  }
  smooth(key, target, dt, attack = 5, release = 1.8) {
    const rate = target > this.value[key] ? attack : release;
    this.value[key] += (target - this.value[key]) * (1 - Math.exp(-dt * rate));
  }
  update(wave, spectrum, dt, playing = true) {
    dt = Math.max(0, Math.min(0.15, dt));
    let rms = 0,
      flux = 0;
    if (playing) {
      for (let i = 0; i < wave.length; i++) rms += wave[i] * wave[i];
      rms = clamp(Math.sqrt(rms / Math.max(1, wave.length)) * 7);
    }
    this.smooth("energy", rms, dt);
    for (let band = 0; band < 3; band++) {
      const low = LOW[band],
        high = HIGH[band];
      const start = Math.max(1, Math.ceil(low / this.binHz)),
        end = Math.min(this.previous.length, Math.ceil(high / this.binHz));
      let sum = 0;
      for (let i = start; i < end; i++) {
        const amp =
          playing && Number.isFinite(spectrum[i])
            ? Math.pow(10, spectrum[i] / 20)
            : 0;
        sum += amp * amp;
        flux += Math.max(0, amp - this.previous[i]);
        this.previous[i] = amp;
      }
      const raw = Math.sqrt(sum / Math.max(1, end - start)) * GAIN[band];
      this.peaks[band] = Math.max(
        0.03,
        this.peaks[band] * Math.exp(-dt * 0.12),
        raw,
      );
      const target =
        clamp(raw / (0.035 + this.peaks[band] * 0.85)) * clamp(rms * 16);
      this.smooth(KEYS[band], target, dt, 4.5, 1.35);
    }
    this.smooth("pulse", clamp(flux * 4) * clamp(rms * 16), dt, 8, 0.9);
    return this.value;
  }
}
