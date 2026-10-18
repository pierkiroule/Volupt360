export const EXPERIENCE_SECONDS = 360;
export const FINALE_SECONDS = 8;
const smooth = (a, b, x) => {
  const v = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return v * v * (3 - 2 * v);
};
export function sampleExperience(time, out = {}) {
  out.elapsed = Math.max(
    0,
    Math.min(EXPERIENCE_SECONDS + FINALE_SECONDS, time),
  );
  const aurora = smooth(45, 90, time),
    dawn = smooth(160, 220, time);
  out.night = 1 - aurora;
  out.aurora = aurora * (1 - dawn);
  out.dawn = dawn;
  out.progress = Math.min(1, time / EXPERIENCE_SECONDS);
  out.departing = time >= EXPERIENCE_SECONDS;
  out.departureProgress = smooth(
    EXPERIENCE_SECONDS,
    EXPERIENCE_SECONDS + FINALE_SECONDS,
    time,
  );
  out.phase =
    time < 60
      ? "night"
      : time < 180
        ? "aurora"
        : time < EXPERIENCE_SECONDS
          ? "dawn"
          : "finale";
  out.brushDiffusion = 0.65 + out.aurora * 0.35 + out.dawn * 0.15;
  out.brushDensity = 0.9 + out.night * 0.15 - out.dawn * 0.08;
  out.opening = smooth(180, 360, time);
  return out;
}
export function createExperienceTimeline({
  onProgress = () => {},
  onComplete = () => {},
} = {}) {
  const state = sampleExperience(0);
  let paused = false,
    lastAudio = null,
    lastSecond = -1,
    complete = false;
  return {
    state,
    get elapsed() {
      return state.elapsed;
    },
    get progress() {
      return state.progress;
    },
    get departing() {
      return state.departing;
    },
    get departureProgress() {
      return state.departureProgress;
    },
    get complete() {
      return complete;
    },
    setPaused(value) {
      paused = value;
      lastAudio = null;
    },
    update(dt, audio = null) {
      if (complete) return state;
      let delta = Math.max(0, dt);
      if (audio && !state.departing) {
        delta =
          lastAudio === null
            ? state.elapsed === 0
              ? audio.time
              : 0
            : Math.max(0, audio.time - lastAudio);
        lastAudio = audio.time;
        if (!audio.playing) delta = 0;
        if (audio.ended && audio.duration >= EXPERIENCE_SECONDS)
          delta = Math.max(delta, EXPERIENCE_SECONDS - state.elapsed);
      }
      if (paused) delta = 0;
      sampleExperience(state.elapsed + delta, state);
      const second = Math.floor(state.elapsed);
      if (second !== lastSecond) {
        lastSecond = second;
        onProgress(second, state);
      }
      if (state.elapsed >= EXPERIENCE_SECONDS + FINALE_SECONDS) {
        complete = true;
        onComplete();
      }
      return state;
    },
  };
}
