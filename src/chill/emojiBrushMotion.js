/** Symbolic motion, deterministic in space and smooth in time. No emotional inference. */
export const BRUSH_INKS = {
  warm: ["#b16650", "#bf9573", "#e4c9a7"],
  water: ["#376e88", "#7fa4ae", "#c4d6d5"],
  bubbles: ["#388e9c", "#86c5cd", "#d1e9e7"],
  cold: ["#569dc0", "#a4d1de", "#dfebec"],
  stone: ["#596477", "#8b8a9a", "#b4aa9c"],
  feather: ["#78618e", "#ab93b2", "#d3c4ce"],
  mist: ["#7f9caa", "#adbfc1", "#d0d7cf"],
  spark: ["#b58b35", "#d8ae51", "#efe0ac"],
  swirl: ["#7956a3", "#ab85bf", "#d3b9d6"],
  thread: ["#a14678", "#c485a5", "#e2b8cd"],
  shoot: ["#54835b", "#8aad71", "#c3d3a0"],
  sun: ["#c28b30", "#e0b758", "#f2dd9c"],
};
export function brushMotion(id, phase, time) {
  const a = phase * 6.283;
  switch (id) {
    case "warm":
      return {
        x: Math.sin(a * 1.7 + time * 2) * 0.14,
        y: -0.2 - (0.5 + 0.5 * Math.sin(a + time * 2.8)) * 0.65,
        scale: 0.7 + 0.3 * Math.sin(a - time * 3),
      };
    case "water":
      return {
        x: 0,
        y: Math.sin(a * 2 - time * 1.8) * 0.35,
        scale: 1 + 0.3 * Math.sin(a * 2 - time * 1.8),
      };
    case "bubbles":
      return {
        x: Math.sin(a + time * 0.8) * 0.18,
        y: -((phase + time * 0.11) % 1) * 0.8,
        scale: 0.65 + 0.3 * Math.sin(a + time),
      };
    case "cold":
      return {
        x: Math.sin(a + time * 0.4) * 0.14,
        y: Math.cos(a + time * 0.3) * 0.12,
        scale: 0.85 + 0.15 * Math.sin(a + time * 0.7),
      };
    case "stone":
      return {
        x: Math.sin(a + time * 0.35) * 0.045,
        y: Math.cos(a + time * 0.28) * 0.045,
        scale: 0.9 + 0.1 * Math.sin(a + time * 0.5),
      };
    case "feather":
      return {
        x: Math.sin(a + time * 0.8) * 0.25,
        y: Math.cos(a * 0.7 + time * 0.6) * 0.3,
        scale: 0.9 + 0.1 * Math.sin(a + time),
      };
    case "mist":
      return {
        x: Math.sin(a + time * 0.25) * 0.4,
        y: Math.cos(a + time * 0.3) * 0.25,
        scale: 1 + 0.2 * Math.sin(a + time * 0.3),
      };
    case "spark":
      return {
        x: Math.sin(a * 3 + time * 3) * 0.1,
        y: Math.sin(a * 2 - time * 2.4) * 0.15,
        scale: 0.8 + 0.2 * Math.sin(a + time * 2),
      };
    case "swirl":
      return {
        x: Math.cos(a + time * 0.8) * 0.28,
        y: Math.sin(a + time * 0.8) * 0.28,
        scale: 0.9 + 0.1 * Math.sin(a - time),
      };
    case "thread":
      return {
        x: 0,
        y: Math.sin(a * 3 - time * 1.5) * 0.16,
        scale: 1 + 0.12 * Math.sin(a - time),
      };
    case "shoot":
      return {
        x: Math.sin(a + time * 0.6) * 0.12,
        y: -0.18 * (1 + Math.sin(a + time * 0.5)),
        scale: 0.8 + 0.2 * Math.sin(a + time * 0.5),
      };
    default:
      return {
        x: Math.cos(a + time * 0.35) * 0.12,
        y: Math.sin(a + time * 0.35) * 0.12,
        scale: 0.85 + 0.15 * Math.sin(a + time * 0.7),
      };
  }
}
