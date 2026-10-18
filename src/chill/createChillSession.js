export function createChillSession({
  onProgress = () => {},
  onComplete = () => {},
} = {}) {
  let elapsed = 0,
    lastSecond = -1,
    complete = false;
  return {
    get elapsed() {
      return elapsed;
    },
    get complete() {
      return complete;
    },
    update(dt) {
      if (complete) return;
      elapsed = Math.min(308, elapsed + Math.max(0, dt));
      const second = Math.floor(elapsed);
      if (second !== lastSecond) {
        lastSecond = second;
        onProgress(Math.min(300, second));
      }
      if (elapsed >= 308) {
        complete = true;
        onComplete();
      }
    },
    get progress() {
      return Math.min(1, elapsed / 300);
    },
    get departing() {
      return elapsed >= 300;
    },
  };
}
