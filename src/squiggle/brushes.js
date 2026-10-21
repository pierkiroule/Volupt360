export const SCULPT_RADIUS = 7.1;
export const SQUIGGLE_BRUSHES = [
  { id: "anger", color: "#ff956b", emoji: "🔥", name: "Feu" },
  { id: "sadness", color: "#80b8f0", emoji: "🌧️", name: "Pluie" },
  { id: "peace", color: "#66cbd0", emoji: "🌊", name: "Ondes" },
  { id: "joy", color: "#f3cc7e", emoji: "☀️", name: "Rayons" },
  { id: "worry", color: "#b9a0e5", emoji: "🌀", name: "Tourbillons" },
  { id: "wonder", color: "#f0dcb1", emoji: "✨", name: "Éclats" },
  { id: "frustration", color: "#e895bd", emoji: "⚡", name: "Énergie" },
  { id: "uncertainty", color: "#b6ccdc", emoji: "☁️", name: "Brume" },
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
