import { Color } from "three";
const night = [
  "#738caa",
  "#64788f",
  "#c2d5dc",
  "#92a9b5",
  "#647f94",
  "#8694ad",
];
const aurora = [
  "#8cbaa6",
  "#b49eb8",
  "#537b87",
  "#657387",
  "#73adb0",
  "#a4a6c3",
];
export function createPhasePalette(source) {
  const entries = source.map((profile, i) => ({
    profile: { ...profile, color: new Color() },
    night: new Color(night[i % night.length]),
    aurora: new Color(aurora[i % aurora.length]),
    dawn: new Color(profile.color),
  }));
  const birdColor = new Color(),
    nightBird = new Color("#d1dfda"),
    dayBird = new Color("#284c55"),
    scratch = new Color();
  return {
    profiles: entries.map((e) => e.profile),
    birdColor,
    update(state) {
      for (const e of entries) {
        e.profile.color.copy(e.night).multiplyScalar(state.night);
        scratch.copy(e.aurora).multiplyScalar(state.aurora);
        e.profile.color.add(scratch);
        scratch.copy(e.dawn).multiplyScalar(state.dawn);
        e.profile.color.add(scratch);
      }
      birdColor.copy(nightBird).lerp(dayBird, state.dawn);
    },
  };
}
