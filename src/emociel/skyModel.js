export const EMOTIONS = [
  ["joy", "😊", "Joie", "#e7bf69"],
  ["sadness", "😢", "Tristesse", "#698bb5"],
  ["anger", "😠", "Colère", "#c67769"],
  ["worry", "😟", "Inquiétude", "#9885ad"],
  ["peace", "😌", "Apaisement", "#81ada5"],
  ["confusion", "😕", "Confusion", "#aaa0bc"],
  ["affection", "🥰", "Affection", "#d49baf"],
  ["tiredness", "😴", "Fatigue", "#8b98ac"],
  ["frustration", "😤", "Frustration", "#b99171"],
  ["wonder", "🤩", "Émerveillement", "#c1ad72"],
  ["hope", "🌱", "Espoir", "#8ba786"],
  ["uncertainty", "🌫️", "Indéfinissable", "#a4aeb8"],
].map(([id, emoji, label, color]) => ({ id, emoji, label, color }));
export const EVOLUTIONS = [
  {
    id: "original",
    label: "Mon ciel",
    style: "flow",
    questions: ["Qu’as-tu envie de remarquer dans ce ciel, tel qu’il est ?"],
  },
  {
    id: "space",
    label: "Faire de la place",
    style: "breath",
    questions: [
      "Où aimerais-tu ménager un peu d’espace dans ce ciel ?",
      "Quel petit geste pourrait te donner cette marge, dans ta journée ?",
      "Qu’aimerais-tu garder près de toi pendant cette traversée ?",
    ],
  },
  {
    id: "support",
    label: "Chercher un appui",
    style: "flow",
    questions: [
      "Quelle personne pourrait être comme un rayon de soleil dans ton ciel du moment ?",
      "Quel lieu ou quelle activité pourrait devenir un point d’appui ?",
      "À quoi ressemblerait une toute petite aide, concrètement ?",
    ],
  },
  {
    id: "connect",
    label: "Faire des liens",
    style: "ripple",
    questions: [
      "Quelles parties de ce ciel pourraient se répondre sans devenir identiques ?",
      "Y a-t-il deux ressentis que tu aimerais laisser coexister autrement ?",
      "Quel lien aimerais-tu nourrir pour traverser ce paysage ?",
    ],
  },
  {
    id: "perspective",
    label: "Un autre regard",
    style: "breath",
    questions: [
      "Depuis quel autre point de vue aimerais-tu découvrir ton ciel ?",
      "Quel détail encore discret pourrait compter pour la suite ?",
      "Quel signe te permettrait de reconnaître une évolution qui te convient ?",
    ],
  },
];
export function direction(u, v) {
  const p = u * Math.PI * 2,
    t = v * Math.PI;
  return [-Math.cos(p) * Math.sin(t), Math.cos(t), Math.sin(p) * Math.sin(t)];
}
export function describeSky(tags) {
  const counts = new Map();
  for (const tag of tags)
    counts.set(tag.emotionId, (counts.get(tag.emotionId) || 0) + 1);
  const labels = [...counts].map(([id, count]) => ({
    label: EMOTIONS.find((e) => e.id === id)?.label || "Ressenti",
    count,
  }));
  const sum = [0, 0, 0];
  for (const t of tags) {
    const d = direction(t.u, t.v);
    for (let i = 0; i < 3; i++) sum[i] += d[i];
  }
  const dispersion = tags.length ? 1 - Math.hypot(...sum) / tags.length : 0;
  const pairs = new Set();
  for (let i = 0; i < tags.length; i++)
    for (let j = i + 1; j < tags.length; j++) {
      if (tags[i].emotionId === tags[j].emotionId) continue;
      const a = direction(tags[i].u, tags[i].v),
        b = direction(tags[j].u, tags[j].v);
      if (a.reduce((s, x, k) => s + x * b[k], 0) > 0.78)
        pairs.add([tags[i].emotionId, tags[j].emotionId].sort().join(":"));
    }
  return {
    total: tags.length,
    diversity: counts.size,
    labels,
    dispersion,
    neighbours: [...pairs].map((p) =>
      p
        .split(":")
        .map((id) => EMOTIONS.find((e) => e.id === id)?.label)
        .join(" · "),
    ),
  };
}
/** Local composition, never an inferred clinical or emotional score. */
export function createSkyTexture(
  tags,
  canvas = document.createElement("canvas"),
) {
  canvas.width = 1536;
  canvas.height = 768;
  const c = canvas.getContext("2d");
  const bg = c.createLinearGradient(0, 0, 0, 768);
  bg.addColorStop(0, "#d9e2ed");
  bg.addColorStop(0.48, "#f4e9e2");
  bg.addColorStop(1, "#d6e4e1");
  c.fillStyle = bg;
  c.fillRect(0, 0, 1536, 768);
  for (const tag of tags) {
    const e = EMOTIONS.find((e) => e.id === tag.emotionId) || EMOTIONS[0],
      x = tag.u * 1536,
      y = tag.v * 768,
      r = 70 + tag.intensity * 22;
    for (const offset of [-1536, 0, 1536]) {
      const glow = c.createRadialGradient(
        x + offset,
        y,
        0,
        x + offset,
        y,
        r * 1.8,
      );
      glow.addColorStop(0, `${e.color}c0`);
      glow.addColorStop(0.5, `${e.color}60`);
      glow.addColorStop(1, `${e.color}00`);
      c.fillStyle = glow;
      c.fillRect(x + offset - r * 1.8, y - r * 1.8, r * 3.6, r * 3.6);
      c.save();
      c.globalAlpha = 0.2;
      c.fillStyle = e.color;
      for (let i = 0; i < 18; i++) {
        const angle = i * 2.399 + tag.id * 0.13,
          rr = r * (0.3 + ((i * 7) % 13) / 13);
        c.beginPath();
        c.ellipse(
          x + offset + Math.cos(angle) * rr,
          y + Math.sin(angle) * rr * 0.7,
          3 + (i % 3),
          2,
          angle,
          0,
          Math.PI * 2,
        );
        c.fill();
      }
      c.restore();
      c.font = `${32 + tag.intensity * 9}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(e.emoji, x + offset, y);
    }
  }
  return canvas;
}
