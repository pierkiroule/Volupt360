/** One flight, independent brush streams; immediate taps, bounded sampling. */
export function createBrushBridge({ paint, finish }) {
  const active = new Map();
  return {
    update(pose, voices, tick) {
      if (!voices.length && !active.size) return;
      const audible = voices.filter((voice) => voice.features.rms > 0.006);
      const ids = new Set(audible.map((voice) => voice.id));
      for (const id of active.keys())
        if (!ids.has(id)) {
          finish(id);
          active.delete(id);
        }
      for (const voice of audible) {
        let state = active.get(voice.id);
        if (!state || state.trigger !== voice.trigger) {
          finish(voice.id);
          state = { trigger: voice.trigger, samples: 0 };
          active.set(voice.id, state);
        }
        if (tick || state.samples < 2) {
          paint(voice.id, {
            ...pose,
            ...voice.features,
            motion: pose.motion,
            acoustic: voice.features,
          });
          state.samples++;
        }
      }
    },
    close() {
      for (const id of active.keys()) finish(id);
      active.clear();
    },
  };
}
