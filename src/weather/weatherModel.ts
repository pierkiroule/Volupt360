export const WEATHER = [
  {
    id: "sun",
    emoji: "☀️",
    label: "Rayonnement",
    color: "#e7b54b",
    secondary: "#ef8655",
  },
  {
    id: "cloud",
    emoji: "☁️",
    label: "Nuages",
    color: "#96a9c5",
    secondary: "#c8b8cc",
  },
  {
    id: "rain",
    emoji: "🌧️",
    label: "Pluie",
    color: "#5788b8",
    secondary: "#8979a5",
  },
  {
    id: "storm",
    emoji: "⛈️",
    label: "Orage",
    color: "#776396",
    secondary: "#c99a65",
  },
  {
    id: "wind",
    emoji: "🌬️",
    label: "Vent",
    color: "#73a9a3",
    secondary: "#a7c9b0",
  },
  {
    id: "fog",
    emoji: "🌫️",
    label: "Brume",
    color: "#a9b8b2",
    secondary: "#c3b3c9",
  },
  {
    id: "snow",
    emoji: "❄️",
    label: "Neige",
    color: "#79b6c8",
    secondary: "#afc7db",
  },
  {
    id: "dusk",
    emoji: "🌅",
    label: "Crépuscule",
    color: "#d88791",
    secondary: "#eab976",
  },
] as const;
export type WeatherId = (typeof WEATHER)[number]["id"];
export interface Zone {
  id: string;
  kind: WeatherId;
  x: number;
  y: number;
  size: number;
  opacity: number;
  seed: number;
}
export const MAX_ZONES = 32;
export function random(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
export function constrain(x: number, y: number) {
  const r = Math.hypot(x, y);
  return r > 0.93 ? { x: (x * 0.93) / r, y: (y * 0.93) / r } : { x, y };
}
export function skyPosition(z: Zone): [number, number, number] {
  // The disk spans a surrounding sky: x is longitude, y is elevation.
  // Radial distance also changes depth, so the result is not a flat wall.
  const longitude = z.x * Math.PI,
    latitude = -z.y * 1.05;
  const radius = 4 + Math.hypot(z.x, z.y) * 4;
  return [
    Math.sin(longitude) * Math.cos(latitude) * radius,
    Math.sin(latitude) * radius * 0.6,
    -Math.cos(longitude) * Math.cos(latitude) * radius - 2,
  ];
}
/** Pigment alpha: deterministic dry edges, blooms and paper-sized granulation. */
export function pigment(seed: number, color: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!,
    r = random(seed);
  ctx.translate(128, 128);
  for (let i = 0; i < 38; i++) {
    const a = r() * Math.PI * 2,
      d = r() * 70,
      x = Math.cos(a) * d,
      y = Math.sin(a) * d,
      s = 25 + r() * 48;
    const g = ctx.createRadialGradient(x, y, 0, x, y, s);
    g.addColorStop(0, color + "38");
    g.addColorStop(0.68, color + "18");
    g.addColorStop(1, color + "00");
    ctx.fillStyle = g;
    ctx.fillRect(-128, -128, 256, 256);
  }
  ctx.globalCompositeOperation = "source-atop";
  for (let i = 0; i < 4200; i++) {
    ctx.globalAlpha = 0.02 + r() * 0.12;
    ctx.fillStyle = i % 3 ? "#fff9e8" : color;
    ctx.fillRect(
      r() * 256 - 128,
      r() * 256 - 128,
      1 + r() * 1.5,
      1 + r() * 1.5,
    );
  }
  ctx.globalAlpha = 1;
  return c;
}
export const STORAGE_KEY = "emotional-weather.saved.v1";
export function readSaved(): Zone[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (value?.version !== 1 || !Array.isArray(value.zones)) return [];
    return value.zones
      .slice(0, MAX_ZONES)
      .filter(
        (z: Zone) =>
          typeof z.id === "string" &&
          WEATHER.some((w) => w.id === z.kind) &&
          [z.x, z.y, z.size, z.opacity, z.seed].every(Number.isFinite) &&
          Math.hypot(z.x, z.y) <= 1 &&
          z.size >= 0.1 &&
          z.size <= 0.5 &&
          z.opacity >= 0.1 &&
          z.opacity <= 1,
      )
      .filter(
        (z: Zone, i: number, all: Zone[]) =>
          all.findIndex((a) => a.id === z.id) === i,
      );
  } catch {
    return [];
  }
}
