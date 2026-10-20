import { createPigmentPlate } from "./createPigmentPlate.js";
import { BRUSH_INKS } from "./emojiBrushMotion.js";

/** Small, tinted pigment stamps; rasterized once per used symbol, never per frame. */
export function createBrushPigments() {
  const cache = new Map();
  return {
    get(id) {
      if (cache.has(id)) return cache.get(id);
      const inks = BRUSH_INKS[id] || BRUSH_INKS.water;
      const maps = ["wash", "dry"].map((kind, index) => {
        const canvas = createPigmentPlate(
          kind,
          8341 + id.length * 137 + index * 953,
          256,
          false,
        );
        const ctx = canvas.getContext("2d"),
          image = ctx.getImageData(0, 0, 256, 256),
          rgb = inks[index]
            .slice(1)
            .match(/../g)
            .map((x) => parseInt(x, 16));
        for (let i = 0; i < image.data.length; i += 4) {
          const load = image.data[i] / 255,
            tide = image.data[i + 2] / 255,
            tooth = image.data[i + 1] / 255;
          for (let k = 0; k < 3; k++)
            image.data[i + k] = rgb[k] * (1.12 - load * 0.55 - tide * 0.25);
          image.data[i + 3] *= index ? 0.5 + 0.5 * tooth : 0.5 + 0.5 * load;
        }
        ctx.putImageData(image, 0, 0);
        return canvas;
      });
      cache.set(id, maps);
      return maps;
    },
    get count() {
      return cache.size;
    },
    dispose() {
      for (const maps of cache.values())
        for (const map of maps) map.width = map.height = 1;
      cache.clear();
    },
  };
}
