// Frame-rate independent dwell; looking away, pausing or changing target resets it.
export function createGazeInteraction({
  duration = 1.5,
  onSelect = () => {},
} = {}) {
  let target = null,
    elapsed = 0,
    fired = false;
  return {
    update(id, dt) {
      if (id !== target) {
        target = id;
        elapsed = 0;
        fired = false;
      }
      if (!id) return { target: null, progress: 0 };
      if (!fired) {
        elapsed += Math.max(0, Math.min(0.1, dt));
        if (elapsed >= duration) {
          fired = true;
          onSelect(id);
        }
      }
      return { target, progress: Math.min(1, elapsed / duration) };
    },
    reset() {
      target = null;
      elapsed = 0;
      fired = false;
    },
  };
}
