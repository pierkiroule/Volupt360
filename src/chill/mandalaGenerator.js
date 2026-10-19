import { emojiById, SENSORY_EMOJIS } from "./sensoryEmojiCatalog.js";

/** Artistic associations only. Same choices + variation reproduce the same geometry. */
export function generateMandala(choices, variation = 0) {
  const ids = [...new Set(choices)]
    .filter((id) => SENSORY_EMOJIS.some((e) => e.id === id))
    .slice(0, 3);
  const entries = ids.map(emojiById);
  let seed = 2166136261;
  for (const c of `${ids.join("|")}:${variation}`)
    seed = Math.imul(seed ^ c.charCodeAt(0), 16777619) >>> 0;
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const paths = [],
    dots = [];
  if (!entries.length)
    return {
      kind: "resonant-mandala",
      choices: ids,
      variation,
      paths,
      dots,
      nodes: [],
      links: [],
    };
  const signature = ids.reduce(
    (s, id, i) =>
      s + (SENSORY_EMOJIS.findIndex((e) => e.id === id) + 1) * (i + 3),
    0,
  );
  const symmetry = [8, 10, 12][signature % 3],
    rotation = random() * Math.PI * 2;
  const polar = (r, a) => ({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  function path(points, entry, width, opacity, layer) {
    paths.push({
      points,
      color: entry.color,
      band: entry.band,
      width,
      opacity,
      layer,
    });
  }
  // Interlaced corollas, with shared symmetry but different material signatures.
  for (let ring = 0; ring < 6; ring++) {
    const entry = entries[ring % entries.length],
      index = SENSORY_EMOJIS.findIndex((e) => e.id === entry.id);
    const base = 0.085 + ring * 0.066,
      reach = 0.065 + (index % 4) * 0.009,
      curl = ((index % 3) - 1) * 0.28;
    for (let petal = 0; petal < symmetry; petal++) {
      const angle =
        rotation +
        (petal * Math.PI * 2) / symmetry +
        ((ring % 2) * Math.PI) / symmetry;
      const points = [];
      for (let j = 0; j <= 64; j++) {
        const t = j / 64,
          bloom = Math.sin(Math.PI * t);
        const r = base + reach * bloom;
        const a =
          angle +
          Math.sin(Math.PI * 2 * t) *
            (Math.PI / symmetry) *
            (0.6 + index * 0.025) +
          curl * bloom;
        points.push(polar(r, a));
      }
      path(
        points,
        entry,
        ring % 3 === 0 ? 0.014 : 0.006,
        ring % 3 === 0 ? 0.48 : 0.78,
        ring,
      );
      // A delicate companion vein preserves fine ink detail against the washes.
      path(
        points.map((p, j) => ({ x: p.x * 0.975, y: p.y * 0.975 })),
        entry,
        0.0009,
        0.63,
        ring + 0.15,
      );
    }
    const circumference = [];
    for (let j = 0; j <= 192; j++) {
      const a = (j / 192) * Math.PI * 2 + rotation,
        r = base + 0.006 * Math.sin(a * symmetry + ring);
      circumference.push(polar(r, a));
    }
    path(circumference, entry, 0.0012, 0.55, ring);
  }
  for (let i = 0; i < symmetry * 16; i++) {
    const a =
      rotation +
      ((i % symmetry) * Math.PI * 2) / symmetry +
      Math.floor(i / symmetry) * 0.014;
    const r = 0.11 + Math.floor(i / symmetry) * 0.022;
    dots.push({
      ...polar(r, a),
      size: 0.0015 + random() * 0.0025,
      color: entries[i % entries.length].color,
      band: entries[i % entries.length].band,
    });
  }
  // Invisible anchors feed the existing atmospheric/particle systems, not emoji faces.
  const nodes = Array.from({ length: symmetry }, (_, i) => {
    const a = (i / symmetry) * Math.PI * 2 + rotation,
      r = 0.29;
    return {
      id: `m${i}`,
      emojiId: ids[i % ids.length],
      u: 0.5 + Math.cos(a) * r,
      v: 0.5 + Math.sin(a) * r,
      size: 0.1,
      opacity: 0.75,
      worldPosition: [
        Math.cos(a) * r * 36,
        Math.sin(a * 2) * 1.8,
        20 + Math.sin(a) * r * 36,
      ],
    };
  });
  return {
    kind: "resonant-mandala",
    choices: ids,
    variation,
    symmetry,
    paths,
    dots,
    nodes,
    links: [],
  };
}

/** The same radial drawing opens into a terraced, immersive landscape. */
export function mandalaPoint(point, layer = 0) {
  const r = Math.hypot(point.x, point.y);
  return [point.x * 36, Math.sin(r * 10) * 3 + layer * 0.45, 20 + point.y * 36];
}
