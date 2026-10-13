// Procedural water acoustics. No recorded audio and no allocation in render().
export class WaterDSP {
  constructor({
    sampleRate,
    type = "bubble",
    frequency = 440,
    duration = 2,
    seed = 731,
    color = 0,
    velocity = 0.7,
    scale = [0, 2, 4, 7, 9],
  }) {
    this.rate = sampleRate;
    this.type = type;
    this.frequency = Math.max(35, Math.min(4500, sampleRate * 0.08, frequency));
    this.duration = Math.max(0.04, duration);
    this.seed = seed >>> 0 || 731;
    this.color = color;
    this.velocity = Math.max(0, Math.min(1, velocity));
    this.age = 0;
    this.phase = new Float64Array(4);
    this.low = 0;
    this.smooth = 0;
    this.nextDrop = 0;
    this.bursts = Array.from({ length: 8 }, () => ({
      phase: 0,
      amplitude: 0,
      frequency: 0,
      decay: 0,
    }));
    this.ratios =
      type === "drop" ? [1, 2.03, 3.87, 5.21] : [1, 1.006, 2.02, 0.5];
    // Minnaert approximation: bubble resonance ≈ 3.26 / radius (metres).
    this.radius = 3.26 / this.frequency;
    const damping = type === "drop" ? 0.34 : 0.48;
    this.amplitudes = new Float64Array([1, 0.22, 0.11, 0.08]);
    this.decays = Float64Array.from([0, 1, 2, 3], (i) =>
      Math.exp(-(1 + i * 0.6) / (sampleRate * this.duration * damping)),
    );
    this.glide = 0.015 + color * 0.012 + (this.random() - 0.5) * 0.008;
    this.glideDecay = Math.exp(-9 / sampleRate);
    this.impact = 0.3;
    this.impactDecay = Math.exp(-100 / sampleRate);
    const cutoff = type === "spray" ? 1800 : color === 2 ? 65 : 320;
    this.filterCoefficient = 1 - Math.exp((-2 * Math.PI * cutoff) / sampleRate);
    this.pitches = scale.map((semitone) => 2 ** (semitone / 12));
  }
  random() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  render(energy = 0) {
    const t = this.age++ / this.rate;
    if (this.type !== "flow" && t >= this.duration) return 0;
    const noise = this.random() * 2 - 1;
    if (this.type === "flow" || this.type === "spray") {
      const cutoff = this.filterCoefficient;
      this.low += cutoff * (noise - this.low);
      this.smooth += cutoff * (this.low - this.smooth);
      if (this.type === "spray") {
        const envelope =
          Math.min(1, t / 0.003) * Math.exp(-t / (this.duration * 0.22));
        return (noise - this.low) * envelope * this.velocity * 0.085;
      }
      const tide = 0.5 + 0.5 * Math.sin(t * (this.color === 2 ? 0.23 : 0.53));
      if (t >= this.nextDrop) {
        let burst = this.bursts[0];
        for (const candidate of this.bursts)
          if (candidate.amplitude < burst.amplitude) burst = candidate;

        burst.frequency =
          this.frequency *
          this.pitches[Math.floor(this.random() * this.pitches.length)] *
          (this.color === 2 ? 0.5 : 2);
        burst.phase = 0;
        burst.amplitude = (0.012 + this.random() * 0.018) * (0.7 + energy);
        burst.decay = Math.exp(
          -1 / (this.rate * (0.08 + this.random() * 0.25)),
        );
        this.nextDrop = t + (0.1 + this.random() * 0.6) / (1 + energy * 2);
      }
      let droplets = 0;
      for (const burst of this.bursts) {
        if (burst.amplitude < 0.000001) continue;
        burst.phase += (2 * Math.PI * burst.frequency) / this.rate;
        if (burst.phase > Math.PI * 2) burst.phase -= Math.PI * 2;
        droplets += Math.sin(burst.phase) * burst.amplitude;
        burst.amplitude *= burst.decay;
      }
      return (this.smooth * (0.1 + tide * 0.18) + droplets) * this.velocity;
    }
    const attack = Math.min(1, t / (this.type === "drop" ? 0.002 : 0.012));
    const tail = Math.min(1, Math.max(0, (this.duration - t) / 0.06));
    let signal = 0;
    for (let i = 0; i < 4; i++) {
      const glide = this.type === "drop" ? 1 : 1 + this.glide;
      this.phase[i] +=
        (2 * Math.PI * this.frequency * this.ratios[i] * glide) / this.rate;
      if (this.phase[i] > Math.PI * 2) this.phase[i] -= Math.PI * 2;
      signal += Math.sin(this.phase[i]) * this.amplitudes[i];
      this.amplitudes[i] *= this.decays[i];
    }
    const impact = this.type === "drop" ? noise * this.impact : 0;
    this.glide *= this.glideDecay;
    this.impact *= this.impactDecay;
    return (signal + impact) * attack * tail * this.velocity * 0.42;
  }
}
