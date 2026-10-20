/** Artistic vocabulary chosen by the visitor, never inferred from the painting. */
export const EMOTION_LANGUAGE = {
  joy: {
    color: "#d4a52f",
    accent: "#ffe0a0",
    symbol: "Soleils et rayons",
    motion: "rayonner",
  },
  sadness: {
    color: "#34518d",
    accent: "#8eafd4",
    symbol: "Gouttes de pluie",
    motion: "tomber",
  },
  anger: {
    color: "#d44825",
    accent: "#ffbf55",
    symbol: "Flammes et braises",
    motion: "monter",
  },
  worry: {
    color: "#7251a0",
    accent: "#b59bcf",
    symbol: "Nœuds et boucles serrées",
    motion: "onduler",
  },
  peace: {
    color: "#3c9d9a",
    accent: "#a0d4cb",
    symbol: "Ondes concentriques",
    motion: "respirer",
  },
  confusion: {
    color: "#a361aa",
    accent: "#d5a9db",
    symbol: "Points d’interrogation",
    motion: "chercher",
  },
  affection: {
    color: "#c66489",
    accent: "#f0b0c3",
    symbol: "Petits cœurs",
    motion: "flotter",
  },
  tiredness: {
    color: "#7d8b9e",
    accent: "#c1cbd9",
    symbol: "Croissants de lune",
    motion: "descendre",
  },
  frustration: {
    color: "#9b6b43",
    accent: "#d1ac7c",
    symbol: "Fragments de grillage",
    motion: "osciller",
  },
  wonder: {
    color: "#727dc2",
    accent: "#e1dcff",
    symbol: "Étoiles et éclats",
    motion: "scintiller doucement",
  },
  hope: {
    color: "#4f8b67",
    accent: "#a6c98a",
    symbol: "Petites pousses",
    motion: "grandir",
  },
  uncertainty: {
    color: "#92a5a1",
    accent: "#d1ded8",
    symbol: "Voiles entrecoupés",
    motion: "dériver",
  },
};
export const SYMBOL_CELL = 128,
  SYMBOL_GRID = 4,
  CLOUD_SYMBOL = 12;
/** One shared colored atlas for Canvas 2D and WebGL: no emoji fonts or per-frame rasterization. */
export function createEmotionSymbols(ids) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SYMBOL_CELL * SYMBOL_GRID;
  const ctx = canvas.getContext("2d");
  for (let index = 0; index < ids.length; index++) {
    const id = ids[index],
      b = EMOTION_LANGUAGE[id];
    ctx.save();
    ctx.translate((index % 4) * 128 + 64, Math.floor(index / 4) * 128 + 64);
    ctx.scale(50, 50);
    ctx.strokeStyle = ctx.fillStyle = b.color;
    ctx.lineWidth = 0.085;
    ctx.lineCap = ctx.lineJoin = "round";
    if (id === "anger") {
      ctx.beginPath();
      ctx.moveTo(-0.58, 0.62);
      ctx.bezierCurveTo(-0.8, 0.05, -0.3, -0.05, -0.13, -0.86);
      ctx.bezierCurveTo(0.43, -0.35, 0.03, -0.15, 0.5, 0.03);
      ctx.bezierCurveTo(0.9, 0.49, 0.35, 0.88, -0.1, 0.84);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = b.accent;
      ctx.beginPath();
      ctx.moveTo(-0.2, 0.67);
      ctx.quadraticCurveTo(-0.38, 0.2, 0.03, -0.1);
      ctx.quadraticCurveTo(0.12, 0.23, 0.3, 0.4);
      ctx.quadraticCurveTo(0.35, 0.76, -0.2, 0.67);
      ctx.fill();
    } else if (id === "sadness") {
      ctx.beginPath();
      ctx.moveTo(0.08, -0.82);
      ctx.bezierCurveTo(-0.18, -0.3, -0.53, 0.14, -0.35, 0.51);
      ctx.bezierCurveTo(-0.07, 0.91, 0.55, 0.61, 0.4, 0.2);
      ctx.quadraticCurveTo(0.24, -0.24, 0.08, -0.82);
      ctx.fill();
      ctx.strokeStyle = b.accent;
      ctx.lineWidth = 0.055;
      ctx.beginPath();
      ctx.moveTo(-0.19, 0.14);
      ctx.quadraticCurveTo(-0.32, 0.42, -0.12, 0.53);
      ctx.stroke();
    } else if (id === "confusion") {
      ctx.lineWidth = 0.16;
      ctx.beginPath();
      ctx.moveTo(-0.4, -0.42);
      ctx.bezierCurveTo(-0.3, -1, 0.64, -0.82, 0.43, -0.25);
      ctx.bezierCurveTo(0.33, 0.03, -0.08, -0.04, -0.08, 0.35);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-0.08, 0.67, 0.095, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === "frustration") {
      ctx.save();
      ctx.rotate(0.25);
      ctx.beginPath();
      ctx.rect(-0.72, -0.72, 1.44, 1.44);
      ctx.clip();
      ctx.lineWidth = 0.06;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-1, i * 0.45 - 1);
        ctx.lineTo(1, i * 0.45 + 1);
        ctx.moveTo(-1, i * 0.45 + 1);
        ctx.lineTo(1, i * 0.45 - 1);
        ctx.stroke();
      }
      ctx.restore();
    } else if (id === "joy") {
      ctx.beginPath();
      ctx.arc(0, 0, 0.34, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 9; i++) {
        const a = (i * Math.PI * 2) / 9;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 0.52, Math.sin(a) * 0.52);
        ctx.lineTo(Math.cos(a) * 0.82, Math.sin(a) * 0.82);
        ctx.stroke();
      }
    } else if (id === "peace") {
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = 1 - i * 0.2;
        ctx.beginPath();
        ctx.ellipse(
          0,
          0.08,
          i * 0.22 + 0.2,
          i * 0.1 + 0.09,
          -0.12,
          0.15,
          Math.PI * 1.94,
        );
        ctx.stroke();
      }
    } else if (id === "worry") {
      ctx.beginPath();
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * Math.PI * 6,
          r = 0.28 + 0.24 * Math.sin(a * 1.7);
        const x = Math.cos(a) * r + 0.14 * Math.sin(a * 0.3),
          y = Math.sin(a) * r + 0.12 * Math.cos(a * 0.7);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
    } else if (id === "affection") {
      ctx.beginPath();
      ctx.moveTo(0, 0.74);
      ctx.bezierCurveTo(-1, 0.08, -0.7, -0.83, -0.18, -0.55);
      ctx.quadraticCurveTo(0, -0.47, 0.05, -0.36);
      ctx.bezierCurveTo(0.65, -1, 1, 0.05, 0, 0.74);
      ctx.fill();
    } else if (id === "tiredness") {
      ctx.beginPath();
      ctx.arc(0, 0, 0.75, 0.4, Math.PI * 1.64);
      ctx.quadraticCurveTo(-0.05, -0.15, 0.69, 0.29);
      ctx.closePath();
      ctx.fill();
    } else if (id === "wonder") {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5 - Math.PI / 2,
          r = i % 2 ? 0.29 : 0.82;
        if (i) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = b.accent;
      ctx.beginPath();
      ctx.arc(0.56, -0.58, 0.09, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === "hope") {
      ctx.beginPath();
      ctx.moveTo(0, 0.8);
      ctx.quadraticCurveTo(0.1, 0, 0, -0.28);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0.01, 0.06);
      ctx.bezierCurveTo(-0.9, -0.06, -0.78, -0.86, 0, -0.35);
      ctx.bezierCurveTo(0.8, -1, 0.91, -0.15, 0.01, 0.06);
      ctx.fill();
    } else {
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = 0.85 - i * 0.14;
        ctx.beginPath();
        ctx.moveTo(-0.85, -0.45 + i * 0.43);
        ctx.bezierCurveTo(
          -0.4,
          -0.7 + i * 0.43,
          -0.2,
          -0.1 + i * 0.43,
          0.18,
          -0.42 + i * 0.43,
        );
        ctx.moveTo(0.4, -0.44 + i * 0.43);
        ctx.quadraticCurveTo(0.63, -0.65 + i * 0.43, 0.85, -0.42 + i * 0.43);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  const x = (CLOUD_SYMBOL % 4) * 128,
    y = Math.floor(CLOUD_SYMBOL / 4) * 128;
  const cloud = ctx.createRadialGradient(x + 64, y + 64, 5, x + 64, y + 64, 58);
  cloud.addColorStop(0, "#7e8ca1a0");
  cloud.addColorStop(1, "#7e8ca100");
  ctx.fillStyle = cloud;
  ctx.fillRect(x, y, 128, 128);
  return canvas;
}
