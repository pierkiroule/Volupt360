export class AnimationTimeline {
  time = 0;
  running = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  private last = 0;
  tick(now: number) {
    if (this.last && this.running && !document.hidden)
      this.time += Math.min(0.08, (now - this.last) / 1000);
    this.last = now;
    return this.time;
  }
  setRunning(value: boolean) {
    this.running = value;
    this.last = performance.now();
  }
}
