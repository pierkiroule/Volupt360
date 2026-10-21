import { SQUIGGLE_BRUSHES } from "../brushes.js";
const SIZE = 256,
  MAX_SOURCES = 16,
  MAX_COMPOSITIONS = 4;
const base = import.meta.env.BASE_URL + "textures/";
const safePath = (path) =>
  typeof path === "string" &&
  /^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(?:png|jpe?g|webp|avif)$/i.test(path);
function randomFor(text) {
  let state = 2166136261;
  for (const c of text)
    state = Math.imul(state ^ c.codePointAt(0), 16777619) >>> 0;
  return () =>
    (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
}
function canvas() {
  const c = document.createElement("canvas");
  c.width = c.height = SIZE;
  return c;
}
function surface(c, id, name, provenance) {
  const height = canvas(),
    ctx = height.getContext("2d"),
    pixels = c.getContext("2d").getImageData(0, 0, SIZE, SIZE);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const g =
      pixels.data[i] * 0.2126 +
      pixels.data[i + 1] * 0.7152 +
      pixels.data[i + 2] * 0.0722;
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = g;
  }
  ctx.putImageData(pixels, 0, 0);
  return { id, name, canvas: c, height, provenance, displacement: false };
}
function mix(profile, layers, neighbour, seed, variant) {
  const c = canvas(),
    ctx = c.getContext("2d"),
    rand = randomFor(seed + profile.id + variant),
    used = [];
  const available = layers.filter(Boolean);
  if (!available.length) return null;
  const primary = available[variant % available.length];
  ctx.drawImage(primary.canvas, 0, 0);
  used.push(primary.path);
  const overlay = (image, blend, opacity) => {
    if (!image) return;
    const layer = canvas(),
      paint = layer.getContext("2d");
    paint.save();
    paint.translate(SIZE / 2, SIZE / 2);
    paint.rotate((rand() - 0.5) * 0.28);
    const size = SIZE * (1 + rand() * 0.2);
    paint.drawImage(image.canvas, -size / 2, -size / 2, size, size);
    paint.restore();
    paint.globalCompositeOperation = "destination-in";
    const x = SIZE * (0.25 + rand() * 0.5),
      y = SIZE * (0.25 + rand() * 0.5);
    const mask = paint.createRadialGradient(x, y, 15, x, y, SIZE * 0.75);
    mask.addColorStop(0, "#fff");
    mask.addColorStop(0.65, "#ffffffb8");
    mask.addColorStop(1, "#ffffff00");
    paint.fillStyle = mask;
    paint.fillRect(0, 0, SIZE, SIZE);
    ctx.globalCompositeOperation = [
      "screen",
      "soft-light",
      "multiply",
      "overlay",
      "source-over",
    ].includes(blend)
      ? blend
      : "soft-light";
    ctx.globalAlpha = Math.max(0, Math.min(0.7, opacity));
    ctx.drawImage(layer, 0, 0);
    used.push(image.path);
    layer.width = 1;
  };
  for (let i = 1; i < available.length; i++) {
    const recipe = profile.layers[i] || {};
    overlay(
      available[i],
      recipe.blend,
      Number.isFinite(recipe.opacity) ? recipe.opacity : 0.3,
    );
  }
  if (neighbour && neighbour !== primary)
    overlay(neighbour, "soft-light", 0.32);
  ctx.globalCompositeOperation = "soft-light";
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = profile.color;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return surface(
    c,
    profile.id + "-" + variant,
    profile.label + " · montage " + (variant + 1),
    [...new Set(used)],
  );
}
/** All photo work happens on selection, never in a render loop. No remote sources. */
export class TextureLibraryFactory {
  constructor() {
    this.sources = new Map();
    this.pending = new Map();
    this.compositions = new Map();
    this.active = 0;
    this.queue = [];
    this.revision = 0;
    this.disposed = false;
    this.hits = 0;
    this.catalogPromise = null;
  }
  async catalog() {
    if (!this.catalogPromise)
      this.catalogPromise = fetch(base + "catalog.json", {
        signal: AbortSignal.timeout(6000),
      })
        .then((r) => {
          if (!r.ok) throw Error("catalog");
          return r.json();
        })
        .then((c) => (Array.isArray(c.entries) ? c.entries : []))
        .catch(() => []);
    return this.catalogPromise;
  }
  async decode(path, revision) {
    if (!safePath(path) || this.disposed) return null;
    if (this.sources.has(path)) {
      const image = this.sources.get(path);
      this.sources.delete(path);
      this.sources.set(path, image);
      return image;
    }
    if (this.pending.has(path)) {
      const task = this.pending.get(path),
        image = await task.promise;
      if (
        image ||
        this.disposed ||
        revision !== this.revision ||
        task.revision === revision
      )
        return image;
      return this.decode(path, revision);
    }
    const promise = (async () => {
      if (this.active >= 4)
        await new Promise((resolve) => this.queue.push(resolve));
      if (this.disposed || revision !== this.revision) {
        this.queue.shift()?.();
        return null;
      }
      this.active++;
      try {
        const response = await fetch(base + path, {
          signal: AbortSignal.timeout(7000),
        });
        if (!response.ok) throw Error("image");
        const blob = await response.blob();
        if (blob.size > 16 * 1024 * 1024) throw Error("large image");
        const bitmap = await createImageBitmap(blob),
          c = canvas(),
          ctx = c.getContext("2d");
        try {
          const scale = Math.max(SIZE / bitmap.width, SIZE / bitmap.height);
          ctx.drawImage(
            bitmap,
            (SIZE - bitmap.width * scale) / 2,
            (SIZE - bitmap.height * scale) / 2,
            bitmap.width * scale,
            bitmap.height * scale,
          );
        } finally {
          bitmap.close();
        }
        const image = { canvas: c, path };
        if (!this.disposed) {
          this.sources.set(path, image);
          while (this.sources.size > MAX_SOURCES)
            this.sources.delete(this.sources.keys().next().value);
        }
        return image;
      } catch {
        return null;
      } finally {
        this.active--;
        this.queue.shift()?.();
      }
    })();
    this.pending.set(path, { promise, revision });
    try {
      return await promise;
    } finally {
      if (this.pending.get(path)?.promise === promise)
        this.pending.delete(path);
    }
  }
  async compose(
    choices,
    {
      seed = choices
        .map((c) => c.emoji)
        .sort()
        .join(""),
    } = {},
  ) {
    const revision = ++this.revision;
    if (!choices.length || this.disposed) return null;
    const entries = await this.catalog();
    if (this.disposed || revision !== this.revision) return null;
    const profiles = choices
      .map((c) => entries.find((e) => e.emoji === c.emoji))
      .filter(Boolean)
      .sort((a, b) => a.id.localeCompare(b.id));
    if (!profiles.length) return null;
    const key = JSON.stringify([profiles, seed]);
    if (this.compositions.has(key)) {
      const result = this.compositions.get(key);
      this.compositions.delete(key);
      this.compositions.set(key, result);
      this.hits++;
      return result;
    }
    const loaded = await Promise.all(
      profiles.map(async (p) =>
        Promise.all(
          (p.layers || [])
            .slice(0, 3)
            .map(
              async (layer) =>
                (await this.decode(layer.path, revision)) ||
                (await this.decode(layer.fallback, revision)),
            ),
        ),
      ),
    );
    if (this.disposed || revision !== this.revision) return null;
    const photos = [];
    for (let i = 0; i < profiles.length; i++)
      for (let variant = 0; variant < 2; variant++) {
        const neighbour = loaded[(i + 1) % loaded.length].find(Boolean);
        const result = mix(profiles[i], loaded[i], neighbour, seed, variant);
        if (result)
          photos.push({
            ...result,
            emoji: profiles[i].emoji,
            brush: profiles[i].brush,
          });
      }
    if (!photos.length) return null;
    const combined = canvas(),
      ctx = combined.getContext("2d");
    ctx.drawImage(photos[0].canvas, 0, 0);
    for (let i = 1; i < photos.length; i++) {
      ctx.globalCompositeOperation = i % 2 ? "soft-light" : "screen";
      ctx.globalAlpha = 0.2;
      ctx.drawImage(photos[i].canvas, 0, 0);
    }
    ctx.globalAlpha = 1;
    const world = surface(combined, "universe", "Univers · photomontage", [
      ...new Set(photos.flatMap((p) => p.provenance)),
    ]);
    const materials = Object.fromEntries(
      SQUIGGLE_BRUSHES.map((b) => [
        b.id,
        photos.find((p) => p.brush === b.id) || world,
      ]),
    );
    const result = {
      materials,
      photos: Object.fromEntries(photos.map((p) => [p.id, p])),
      provenance: world.provenance,
      seed,
    };
    this.compositions.set(key, result);
    while (this.compositions.size > MAX_COMPOSITIONS)
      this.compositions.delete(this.compositions.keys().next().value);
    return result;
  }
  get stats() {
    return {
      sources: this.sources.size,
      compositions: this.compositions.size,
      active: this.active,
      queued: this.queue.length,
      hits: this.hits,
    };
  }
  dispose() {
    this.disposed = true;
    this.revision++;
    this.sources.clear();
    this.compositions.clear();
    for (const resolve of this.queue.splice(0)) resolve();
  }
}
