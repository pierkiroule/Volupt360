/** Dwell + leave-to-rearm: one phrase at a time, no gaze painting. */
export function createGazeReader({
  read,
  isSpeaking = () => false,
  dwell = 0.65,
}) {
  let focused = null,
    elapsed = 0,
    armed = true,
    revision = 0,
    disposed = false;
  return {
    update(dt, id) {
      if (disposed) return;
      if (id !== focused) {
        focused = id;
        elapsed = 0;
        armed = true;
      }
      if (!id) return;
      elapsed += dt;
      if (!armed || elapsed < dwell || isSpeaking()) return;
      armed = false;
      const ticket = revision;
      Promise.resolve(read(id)).catch(() => {
        if (!disposed && ticket === revision) armed = false;
      });
    },
    reset() {
      focused = null;
      elapsed = 0;
      armed = true;
      revision++;
    },
    dispose() {
      disposed = true;
      revision++;
    },
  };
}
