import { WaterDSP } from "./WaterDSP.js";

class WaterProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "gate",
        defaultValue: 1,
        minValue: 0,
        maxValue: 1,
        automationRate: "k-rate",
      },
      {
        name: "energy",
        defaultValue: 0,
        minValue: 0,
        maxValue: 1,
        automationRate: "k-rate",
      },
    ];
  }
  constructor({ processorOptions: options }) {
    super();
    this.dsp = new WaterDSP({ ...options, sampleRate });
    this.startAt = options.startAt;
    this.endAt =
      options.type === "flow" ? Infinity : this.startAt + options.duration;
    this.stopAt = Infinity;
    this.disposed = false;
    this.port.onmessage = ({ data }) => {
      if (data.dispose) this.disposed = true;
      if (Number.isFinite(data.stopAt))
        this.stopAt = Math.min(this.stopAt, data.stopAt);
    };
  }
  process(_inputs, outputs, parameters) {
    const output = outputs[0][0];
    if (this.disposed) return false;
    if (parameters.gate[0] === 0) return true;
    let alive = false;
    for (let i = 0; i < output.length; i++) {
      const time = currentTime + i / sampleRate;
      if (time < this.startAt) {
        alive = true;
        continue;
      }
      if (time >= Math.min(this.endAt, this.stopAt + 0.025)) continue;
      const release =
        time < this.stopAt ? 1 : Math.max(0, 1 - (time - this.stopAt) / 0.025);
      output[i] = this.dsp.render(parameters.energy[0]) * release;
      alive = true;
    }
    if (!alive) this.port.postMessage({ ended: true });
    return alive;
  }
}
registerProcessor("echo-water", WaterProcessor);
