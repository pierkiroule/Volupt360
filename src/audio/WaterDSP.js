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
    this.voicePhase = (seed % 17) * 0.03;
    this.velocity = Math.max(0, Math.min(1, velocity));
    this.age = 0;
    this.phase = new Float64Array(8);
    this.low = 0;
    this.smooth = 0;
    this.bodyDamping = 1 - Math.exp((-2 * Math.PI * 1700) / sampleRate);
    this.breath = 0;
    this.woodDamping = 1 - Math.exp((-2 * Math.PI * 1600) / sampleRate);
    if (type === "wood") {
      this.woodEnvelopes = new Float64Array([1, 1, 1]);
      this.woodDecays = Float64Array.from([0.42, 0.18, 0.09], (decay) =>
        Math.exp(-1 / (sampleRate * this.duration * decay)),
      );
      this.woodAttack = 0;
      this.woodAttackRate = 1 - Math.exp(-1 / (sampleRate * 0.025));
    }
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
    const delayLength = Math.max(
      2,
      Math.round(sampleRate / this.frequency - 0.5),
    );
    this.string = type === "string" ? new Float64Array(delayLength) : null;
    this.stringIndex = 0;
    if (this.string)
      for (let i = 0; i < delayLength; i++)
        this.string[i] = (this.random() * 2 - 1) * 0.45;
    this.bassRatios = [1, 2, 3, 4];
    this.bassWeights = [1, 0.3, 0.12, 0.04];
    this.pitches = scale.map((semitone) => 2 ** (semitone / 12));
  }
  random() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  render(energy = 0, shape = 0.45, frequencyFactor = 1, tones = this.pitches) {
    const t = this.age++ / this.rate;
    if (this.type !== "flow" && this.type !== "pad" && t >= this.duration)
      return 0;
    const noise = this.random() * 2 - 1;
    if (this.type === "string") {
      const i = this.stringIndex,
        next = (i + 1) % this.string.length;
      const value = this.string[i];
      this.string[i] = (value + this.string[next]) * (0.4995 + shape * 0.00025);
      this.stringIndex = next;
      return (
        value *
        this.velocity *
        Math.min(1, t / 0.008) *
        Math.min(1, Math.max(0, (this.duration - t) / 0.1))
      );
    }
    if (this.type === "bowed" || this.type === "air") {
      const bowed = this.type === "bowed";
      const vibrato =
        1 +
        Math.sin(t * (bowed ? 30.1 : 27.7) + this.voicePhase) *
          0.0013 *
          Math.min(1, t / 0.9);
      let sound = 0;
      const modes = bowed ? 5 : 3;
      for (let i = 0; i < modes; i++) {
        this.phase[i] +=
          (2 * Math.PI * this.frequency * (i + 1) * vibrato) / this.rate;
        if (this.phase[i] > Math.PI * 2) this.phase[i] -= Math.PI * 2;
        const weight =
          i === 0
            ? 1
            : bowed
              ? i === 1
                ? 0.23
                : i === 2
                  ? 0.1
                  : i === 3
                    ? 0.05
                    : 0.025
              : i === 1
                ? 0.055
                : 0.012;
        sound +=
          Math.sin(this.phase[i]) * weight * (i === 0 ? 1 : 0.8 + shape * 0.25);
      }
      this.breath += this.bodyDamping * (noise - this.breath);
      sound += this.breath * (bowed ? 0.007 : 0.035);
      this.smooth += this.bodyDamping * (sound - this.smooth);
      const bloom = Math.sin(Math.PI * Math.min(1, t / this.duration));
      const envelope =
        Math.sqrt(Math.max(0, bloom)) *
        Math.min(1, t / (bowed ? 0.16 : 0.1)) *
        Math.min(1, Math.max(0, (this.duration - t) / 0.18));
      return this.smooth * this.velocity * (bowed ? 0.32 : 0.35) * envelope;
    }
    if (this.type === "wood") {
      let sound = 0;
      for (let i = 0; i < 3; i++) {
        const ratio = i === 0 ? 1 : i === 1 ? 2.003 : 3.007;
        this.phase[i] += (2 * Math.PI * this.frequency * ratio) / this.rate;
        if (this.phase[i] > Math.PI * 2) this.phase[i] -= Math.PI * 2;
        const weight = i === 0 ? 1 : i === 1 ? 0.1 + shape * 0.06 : 0.035;
        sound += Math.sin(this.phase[i]) * weight * this.woodEnvelopes[i];
        this.woodEnvelopes[i] *= this.woodDecays[i];
      }
      this.smooth += this.woodDamping * (sound - this.smooth);
      this.woodAttack += (1 - this.woodAttack) * this.woodAttackRate;
      return (
        this.smooth *
        this.velocity *
        0.45 *
        this.woodAttack *
        Math.min(1, Math.max(0, (this.duration - t) / 0.12))
      );
    }
    if (this.type === "bell" || this.type === "felt") {
      this.phase[0] += (2 * Math.PI * this.frequency) / this.rate;
      this.phase[1] +=
        (2 * Math.PI * this.frequency * (this.type === "bell" ? 2 : 1)) /
        this.rate;
      for (let i = 0; i < 2; i++)
        if (this.phase[i] > Math.PI * 2) this.phase[i] -= Math.PI * 2;
      const decay = Math.exp(
        -t / (this.duration * (this.type === "bell" ? 0.35 : 0.22)),
      );
      const fm = Math.sin(
        this.phase[0] +
          Math.sin(this.phase[1]) *
            decay *
            (this.type === "bell" ? 0.26 : 0.12) *
            (0.5 + shape * 1.5),
      );
      const partial = Math.sin(this.phase[0] * 2) * 0.065 * decay;
      return (
        (fm + partial) *
        decay *
        this.velocity *
        0.42 *
        Math.min(1, t / 0.045) *
        Math.min(1, Math.max(0, (this.duration - t) / 0.08))
      );
    }
    if (this.type === "pad" || this.type === "bass") {
      const ratios = this.type === "pad" ? tones : this.bassRatios;
      let sound = 0;
      for (let i = 0; i < 4; i++) {
        const ratio = ratios[i % ratios.length];
        const drift =
          this.type === "pad"
            ? 1 + Math.sin(t * (0.31 + i * 0.07)) * 0.0018
            : 1;
        this.phase[i] +=
          (2 * Math.PI * this.frequency * frequencyFactor * ratio * drift) /
          this.rate;
        if (this.phase[i] > Math.PI * 2) this.phase[i] -= Math.PI * 2;
        const weight =
          this.type === "bass"
            ? this.bassWeights[i]
            : i === 0
              ? 0.55
              : 0.2 + shape * 0.12;
        sound += Math.sin(this.phase[i]) * weight;
        if (this.type === "pad")
          sound += Math.sin(this.phase[i] * 2) * weight * 0.075;
      }
      const envelope =
        this.type === "pad"
          ? Math.min(1, t / 1.8) * (0.85 + Math.sin(t * 0.33) * 0.15)
          : Math.min(1, t / 0.025) *
            Math.min(1, Math.max(0, (this.duration - t) / 0.15)) *
            Math.exp(-t / (this.duration * 0.9));
      return (
        sound * envelope * this.velocity * (this.type === "pad" ? 0.12 : 0.5)
      );
    }
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
      signal +=
        Math.sin(this.phase[i]) *
        this.amplitudes[i] *
        (i === 0 ? 1 : 0.75 + shape * 0.6);
      this.amplitudes[i] *= this.decays[i];
    }
    const impact = this.type === "drop" ? noise * this.impact : 0;
    this.glide *= this.glideDecay;
    this.impact *= this.impactDecay;
    return (signal + impact) * attack * tail * this.velocity * 0.42;
  }
}
