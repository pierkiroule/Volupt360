/** Hysteresis prevents resolution pumping; long/background frames are ignored. */
export function createRenderBudget({
  mobile = false,
  dpr = 1,
  width = 1,
  height = 1,
} = {}) {
  const ceiling = Math.min(
    dpr,
    mobile ? 1.25 : 1.5,
    Math.sqrt((mobile ? 1000000 : 2600000) / Math.max(1, width * height)),
  );
  const floor = Math.min(ceiling, mobile ? 0.75 : 0.85);
  let ratio = ceiling,
    average = 16.7,
    clock = 0,
    stable = 0;
  return {
    get ratio() {
      return ratio;
    },
    maxMarks: mobile ? 56 : 80,
    update(milliseconds, dt) {
      if (
        !Number.isFinite(milliseconds) ||
        milliseconds <= 0 ||
        milliseconds > 250
      )
        return false;
      average += (milliseconds - average) * (1 - Math.exp(-dt * 1.5));
      clock += dt;
      stable = average < 18 ? stable + dt : 0;
      if (clock < 3) return false;
      const next =
        average > 25
          ? Math.max(floor, ratio - 0.125)
          : stable > 10
            ? Math.min(ceiling, ratio + 0.125)
            : ratio;
      if (next === ratio) return false;
      ratio = next;
      clock = 0;
      stable = 0;
      return true;
    },
  };
}
