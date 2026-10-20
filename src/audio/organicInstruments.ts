import { seededRandom } from "../transduction/engine.ts";
export type OrganicTimbre = "felt" | "string" | "bass" | "brush";
/** Procedural acoustic excitations at 22.05 kHz. No recordings or external assets.
 * Modal felt keys and a fractional-delay, damped Karplus–Strong string.
 */
export function synthesizeOrganic(
  timbre: OrganicTimbre,
  midi: number,
  seed: number,
  sampleRate = 22050,
): Float32Array<ArrayBuffer> {
  const random = seededRandom((seed ^ Math.imul(midi + 1, 2654435761)) >>> 0),
    frequency = 440 * 2 ** ((midi - 69) / 12),
    duration = timbre === "brush" ? 0.42 : timbre === "bass" ? 3.4 : 4.2;
  const data = new Float32Array(Math.ceil(duration * sampleRate));
  if (timbre === "brush") {
    let low = 0,
      body = 0;
    for (let i = 0; i < data.length; i++) {
      low = low * 0.82 + (random() * 2 - 1) * 0.18;
      body = body * 0.975 + low * 0.025;
      const t = i / sampleRate;
      data[i] = (low - body) * Math.min(1, t / 0.014) * Math.exp(-t * 17) * 0.5;
    }
  } else if (timbre === "felt") {
    const ratios = [1, 2.001, 3.008, 4.02, 5.035, 6.055],
      amplitudes = [1, 0.27, 0.11, 0.048, 0.021, 0.009];
    for (let k = 0; k < ratios.length; k++) {
      const step = (2 * Math.PI * frequency * ratios[k]) / sampleRate,
        cs = Math.cos(step),
        sn = Math.sin(step),
        decay = Math.exp(-1 / (sampleRate * (2.1 / (1 + k * 0.85))));
      let x = 0,
        y = amplitudes[k];
      for (let i = 0; i < data.length; i++) {
        data[i] += x;
        const nextX = (x * cs + y * sn) * decay;
        y = (y * cs - x * sn) * decay;
        x = nextX;
      }
    }
    let felt = 0;
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      felt = felt * 0.72 + (random() * 2 - 1) * 0.28;
      data[i] =
        (data[i] + felt * 0.07 * Math.exp(-t * 85)) * Math.min(1, t / 0.007);
    }
  } else {
    const delay = sampleRate / frequency - 0.5,
      length = Math.ceil(delay) + 2,
      ring = new Float32Array(length);
    let smooth = 0;
    for (let i = 0; i < length; i++) {
      smooth = smooth * 0.5 + (random() * 2 - 1) * 0.5;
      ring[i] = smooth;
    }
    let write = 0,
      previous = 0,
      body = 0;
    const damping = timbre === "bass" ? 0.9988 : 0.9974;
    for (let i = 0; i < data.length; i++) {
      const read = (write - delay + length) % length,
        index = Math.floor(read),
        fraction = read - index;
      const value =
        ring[index] * (1 - fraction) + ring[(index + 1) % length] * fraction;
      const filtered = (value + previous) * 0.5 * damping;
      previous = value;
      ring[write] = filtered;
      write = (write + 1) % length;
      body = body * 0.7 + value * 0.3;
      const t = i / sampleRate;
      data[i] =
        (value * 0.72 + body * 0.28) *
        Math.min(1, t / (timbre === "bass" ? 0.028 : 0.009)) *
        Math.exp(-t * (timbre === "bass" ? 0.35 : 0.5));
    }
  }
  // Remove DC and bound peaks while retaining a quiet, detailed decay and click-free endpoints.
  let dc = 0,
    peak = 0;
  for (let i = 0; i < data.length; i++) {
    dc = dc * 0.999 + data[i] * 0.001;
    data[i] -= dc;
    data[i] *= Math.min(1, (data.length - i) / 320);
    peak = Math.max(peak, Math.abs(data[i]));
  }
  const scale = peak > 0 ? 0.82 / peak : 0;
  for (let i = 0; i < data.length; i++) data[i] *= scale;
  return data;
}
export class OrganicInstrumentBank {
  private cache = new Map<string, AudioBuffer>();
  private context: BaseAudioContext;
  private seed: number;
  constructor(context: BaseAudioContext, seed: number) {
    this.context = context;
    this.seed = seed;
  }
  get(timbre: OrganicTimbre, midi: number) {
    const key = `${timbre}-${midi}`;
    let buffer = this.cache.get(key);
    if (buffer) {
      this.cache.delete(key);
      this.cache.set(key, buffer);
      return buffer;
    }
    const data = synthesizeOrganic(timbre, midi, this.seed);
    buffer = this.context.createBuffer(1, data.length, 22050);
    buffer.copyToChannel(data, 0);
    this.cache.set(key, buffer);
    if (this.cache.size > 24)
      this.cache.delete(this.cache.keys().next().value!);
    return buffer;
  }
  clear() {
    this.cache.clear();
  }
}
