export const SCULPT_RADIUS = 7.1;
export const SQUIGGLE_BRUSHES = [
  { id: "anger", color: "#ed531c", emoji: "🔥", name: "Feu" },
  { id: "sadness", color: "#2969ba", emoji: "🌧️", name: "Pluie" },
  { id: "peace", color: "#087d99", emoji: "🌊", name: "Ondes" },
  { id: "joy", color: "#e9a515", emoji: "☀️", name: "Rayons" },
  { id: "worry", color: "#7546a3", emoji: "🌀", name: "Tourbillons" },
  { id: "wonder", color: "#c89221", emoji: "✨", name: "Éclats" },
  { id: "frustration", color: "#b44987", emoji: "⚡", name: "Énergie" },
  { id: "uncertainty", color: "#738a9e", emoji: "☁️", name: "Brume" },
];
export function paperToDisk(p) {
  const radius = Math.max(0, Math.min(1, p.y)),
    angle = p.x * Math.PI * 2;
  return {
    x: 0.5 + Math.cos(angle) * radius * 0.5,
    y: 0.5 + Math.sin(angle) * radius * 0.5,
  };
}
export function directionToPaper(point) {
  const radius = Math.hypot(point.x, point.y, point.z) || 1;
  return {
    x: (((Math.atan2(point.z, -point.x) / (Math.PI * 2)) % 1) + 1) % 1,
    y: Math.max(
      0,
      Math.min(
        1,
        (Math.acos(Math.max(-1, Math.min(1, point.y / radius))) / Math.PI -
          0.04) /
          0.92,
      ),
    ),
  };
}
