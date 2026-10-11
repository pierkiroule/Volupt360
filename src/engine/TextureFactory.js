import { CanvasTexture, LinearFilter, RepeatWrapping } from "three";

function randomFor(seed) {
  let state = 2166136261;
  for (const char of String(seed))
    state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  return () => {
    state += 0x6d2b79f5;
    let n = Math.imul(state ^ (state >>> 15), 1 | state);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (value, fallback) =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;

/** Bounded, leased cache. prepare() is explicit work outside the render loop;
 * acquire() only looks up an existing texture and never generates pixels. */
export class TextureFactory {
  constructor({ size = 128, maxEntries = 4 } = {}) {
    this.size = Math.max(32, Math.min(256, Math.round(size) || 128));
    this.maxEntries = Math.max(1, Math.min(24, Math.round(maxEntries) || 4));
    this.entries = new Map();
    this.closed = false;
    this.serial = 0;
    this.generated = 0;
    this.disposed = 0;
  }
  prepare({ seed, params = {} }) {
    if (this.closed) throw new Error("TextureFactory is disposed");
    const normalized = {
      style: [
        "wash",
        "mineral",
        "petal",
        "thread",
        "ink",
        "splatter",
        "bubble",
        "aurora",
        "calligraphy",
        "network",
        "dilution",
        "echo",
      ].includes(params.style)
        ? params.style
        : "ink",
      spread: clamp(params.spread, 0.6),
      irregularity: clamp(params.irregularity, 0.25),
      granulation: clamp(params.granulation, 0.4),
      opacity: clamp(params.opacity, 0.8),
    };
    const key = JSON.stringify([String(seed), normalized]);
    if (this.entries.has(key)) return key;
    if (this.entries.size >= this.maxEntries) {
      const unused = [...this.entries.entries()]
        .filter(([, entry]) => !entry.refs)
        .sort((a, b) => a[1].used - b[1].used)[0];
      if (!unused) return null; // Busy cache: preserve all live GPU references.
      this.entries.delete(unused[0]);
      this.destroy(unused[1]);
    }
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = this.size;
    const ctx = canvas.getContext("2d");
    const pixels = ctx.createImageData(this.size, this.size);
    const random = randomFor(seed);
    const harmonics = Array.from({ length: 6 }, (_, i) => ({
      phase: random() * Math.PI * 2,
      amplitude: normalized.irregularity / (i + 2),
    }));
    for (let y = 0; y < this.size; y++)
      for (let x = 0; x < this.size; x++) {
        const dx = ((x + 0.5) / this.size) * 2 - 1,
          dy = ((y + 0.5) / this.size) * 2 - 1;
        const angle = Math.atan2(dy, dx),
          radius = Math.hypot(dx, dy);
        let contour = 0.38 + normalized.spread * 0.42;
        harmonics.forEach((wave, i) => {
          contour += Math.sin(angle * (i + 2) + wave.phase) * wave.amplitude;
        });
        const feather = Math.min(1, Math.max(0, (contour - radius) / 0.14));
        const grain = random();
        const granule = 1 - normalized.granulation * grain * 0.8;
        const waviness = Math.sin(dy * 13 + harmonics[0].phase) * 0.09;
        let shape = feather * feather * (3 - 2 * feather);
        let pigment = granule;
        if (normalized.style === "wash") {
          shape = Math.max(0, 1 - Math.abs(dx + waviness) ** 3);
          pigment =
            0.65 + 0.3 * Math.sin(dy * 6 + dx * 3 + harmonics[1].phase) ** 2;
        } else if (normalized.style === "mineral") {
          shape = Math.max(0.18, 1 - Math.abs(dx) ** 4);
          pigment =
            (0.25 + 0.75 * grain ** 0.7) *
            (0.5 + 0.5 * Math.sin(dy * 45 + dx * 9 + harmonics[2].phase) ** 2);
        } else if (normalized.style === "petal") {
          shape = Math.max(0.12, 1 - Math.abs(dx + waviness) ** 2);
          const vein = Math.abs(
            Math.sin(dy * 27 + Math.abs(dx) * 16 + harmonics[3].phase),
          );
          pigment = (0.35 + 0.65 * Math.exp(-vein * 9)) * granule;
        } else if (normalized.style === "thread") {
          shape = 0.35 + 0.65 * Math.sin(dy * 38 + harmonics[4].phase) ** 2;
          pigment = 0.5 + 0.5 * grain;
        } else if (normalized.style === "bubble") {
          shape = 1;
          pigment =
            0.8 + 0.2 * Math.sin(dx * 7 + dy * 5 + harmonics[0].phase) ** 2;
        } else if (normalized.style === "aurora") {
          shape = Math.max(0.3, 1 - Math.abs(dx) ** 4);
          pigment =
            0.45 + 0.55 * Math.sin(dx * 18 + dy * 6 + harmonics[1].phase) ** 2;
        } else if (normalized.style === "calligraphy") {
          shape = Math.max(0.25, 1 - Math.abs(dx) ** 6);
          pigment = 0.7 + 0.3 * grain;
        } else if (normalized.style === "network") {
          shape = 1;
          pigment = 0.85 + 0.15 * grain;
        } else if (normalized.style === "dilution") {
          shape = Math.max(0, 1 - Math.abs(dx + waviness * 0.4) ** 2);
          pigment =
            (0.5 + 0.5 * Math.sin(dy * 10 + dx * 3 + harmonics[0].phase) ** 2) *
            granule;
        } else if (normalized.style === "echo") {
          shape = Math.max(0.2, 1 - Math.abs(dx) ** 4);
          pigment =
            (0.65 + 0.35 * Math.cos(dy * 22 + harmonics[2].phase) ** 2) *
            granule;
        } else if (normalized.style === "splatter") {
          pigment = grain > 0.92 ? 0.12 : granule;
        }
        const edgePool =
          0.65 +
          0.35 * Math.exp(-Math.pow((radius - contour + 0.1) / 0.065, 2));
        const k = (y * this.size + x) * 4;
        const tone = Math.round(14 + random() * 18);
        pixels.data[k] = tone;
        pixels.data[k + 1] = tone;
        pixels.data[k + 2] = tone + 3;
        pixels.data[k + 3] = Math.round(
          shape * pigment * edgePool * normalized.opacity * 255,
        );
      }
    ctx.putImageData(pixels, 0, 0);
    const texture = new CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.minFilter = texture.magFilter = LinearFilter;
    const entry = {
      binding: {
        texture,
        aspect: 1,
        repeat: ["ink", "splatter"].includes(normalized.style) ? 1 : 3,
      },
      refs: 0,
      used: ++this.serial,
    };
    this.entries.set(key, entry);
    this.generated++;
    return key;
  }
  acquire(key) {
    const entry = this.entries.get(key);
    if (this.closed || !entry) return null;
    entry.refs++;
    entry.used = ++this.serial;
    let released = false;
    return {
      binding: entry.binding,
      release: () => {
        if (released) return;
        released = true;
        entry.refs--;
      },
    };
  }
  destroy(entry) {
    entry.binding.texture.dispose();
    // Drop the Canvas pixel storage once no GPU consumer owns this entry.
    entry.binding.texture.image.width = entry.binding.texture.image.height = 0;
    this.disposed++;
  }
  dispose() {
    if (this.closed) return;
    if ([...this.entries.values()].some((entry) => entry.refs))
      throw new Error("Release live texture leases before disposal");
    this.closed = true;
    for (const entry of this.entries.values()) this.destroy(entry);
    this.entries.clear();
  }
  get stats() {
    return {
      entries: this.entries.size,
      leases: [...this.entries.values()].reduce((n, e) => n + e.refs, 0),
      generated: this.generated,
      disposed: this.disposed,
    };
  }
}
