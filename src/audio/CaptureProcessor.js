// Independent post-mix tap. Audio never returns to the audible destination.
class OizodioCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.samples = new Float32Array(2048);
    this.offset = 0;
    this.startedAt = 0;
  }
  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;
    for (let i = 0; i < input.length; i++) {
      if (this.offset === 0) this.startedAt = currentTime + i / sampleRate;
      this.samples[this.offset++] = input[i];
      if (this.offset === this.samples.length) {
        this.port.postMessage(
          { data: this.samples, sampleRate, startedAt: this.startedAt },
          [this.samples.buffer],
        );
        this.samples = new Float32Array(2048);
        this.offset = 0;
      }
    }
    return true;
  }
}
registerProcessor("oizodio-capture", OizodioCapture);
