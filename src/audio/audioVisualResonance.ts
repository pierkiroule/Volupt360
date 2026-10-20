export type ResonanceEvent = {
  id: number;
  kind: "pad" | "bass" | "melody" | "pulse";
  midi: number;
  pan: number;
  strength: number;
  time: number;
};
export type ResonanceState = {
  bass: number;
  body: number;
  air: number;
  energy: number;
  events: ResonanceEvent[];
  last: ResonanceEvent | null;
};
/** Bounded audio-clock mailbox, independent of React and Three. Events become visible when heard. */
export class AudioVisualResonance {
  private queue: ResonanceEvent[] = [];
  private serial = 0;
  private token: object | null = null;
  private clock: (() => number) | null = null;
  private meter: ((out: Float32Array) => void) | null = null;
  private active = false;
  private onGesture: ((pan: number, position: number) => void) | null = null;
  private levels = new Float32Array(4);
  readonly state: ResonanceState = {
    bass: 0,
    body: 0,
    air: 0,
    energy: 0,
    events: [],
    last: null,
  };
  bind(
    clock: () => number,
    meter: (out: Float32Array) => void,
    onGesture?: (pan: number, position: number) => void,
  ) {
    const token = {};
    this.token = token;
    this.onGesture = onGesture ?? null;
    this.clock = clock;
    this.meter = meter;
    this.active = true;
    this.queue.length = 0;
    this.state.last = null;
    return () => {
      if (this.token === token) {
        this.active = false;
        this.clock = null;
        this.meter = null;
        this.onGesture = null;
        this.queue.length = 0;
        this.token = null;
      }
    };
  }
  gesture(pan: number, position: number) {
    if (this.active)
      this.onGesture?.(
        Math.max(-0.8, Math.min(0.8, pan)),
        Math.max(0, Math.min(1, position)),
      );
  }
  setActive(active: boolean) {
    this.active = active;
    if (!active) {
      this.queue.length = 0;
      this.state.last = null;
    }
  }
  schedule(event: Omit<ResonanceEvent, "id">) {
    if (!this.active) return;
    this.queue.push({ ...event, id: ++this.serial });
    if (this.queue.length > 32) this.queue.shift();
    this.queue.sort((a, b) => a.time - b.time);
  }
  sample(dt: number) {
    this.state.events.length = 0;
    this.levels.fill(0);
    if (this.active && this.clock) {
      const now = this.clock();
      while (this.queue.length && this.queue[0].time <= now) {
        const event = this.queue.shift()!;
        if (now - event.time < 0.7) {
          this.state.events.push(event);
          this.state.last = event;
        }
      }
      this.meter?.(this.levels);
    }
    const keys = ["bass", "body", "air", "energy"] as const;
    for (let i = 0; i < 4; i++) {
      const key = keys[i],
        target = Math.max(0, Math.min(1, this.levels[i])),
        rate = target > this.state[key] ? 3.5 : 1.3;
      this.state[key] +=
        (target - this.state[key]) * (1 - Math.exp(-Math.min(dt, 0.2) * rate));
    }
    return this.state;
  }
}
export const audioVisualResonance = new AudioVisualResonance();
