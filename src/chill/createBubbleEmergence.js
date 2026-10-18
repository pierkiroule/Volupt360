// Active flight seconds and pigment deposits only. No frame-count dependency.
export const BUBBLE_EMERGENCE = {
  firstDelay: 12,
  interval: 10,
  firstSamples: 12,
  newSamples: 6,
  maxWait: 35,
  fadeSeconds: 4,
};
export function createBubbleEmergence(total, options = {}) {
  const settings = { ...BUBBLE_EMERGENCE, ...options };
  let next = 0,
    active = -1,
    lastRelease = 0,
    releasedSamples = 0;
  return {
    settings,
    get active() {
      return active;
    },
    propose(time, samples) {
      if (active >= 0 || next >= total) return -1;
      const first = next === 0;
      if (
        time - lastRelease <
        (first ? settings.firstDelay : settings.interval)
      )
        return -1;
      const enoughPaint =
        samples - releasedSamples >=
        (first ? settings.firstSamples : settings.newSamples);
      if (
        !enoughPaint &&
        (first || samples === 0 || time - lastRelease < settings.maxWait)
      )
        return -1;
      active = next++;
      return active;
    },
    release(time, samples) {
      if (active < 0) return false;
      active = -1;
      lastRelease = time;
      releasedSamples = samples;
      return true;
    },
  };
}
