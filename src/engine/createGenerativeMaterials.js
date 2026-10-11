import { TextureFactory } from "./TextureFactory.js";
import { materialGrammar } from "./MaterialGrammar.js";

const styles = {
  voiles: "wash",
  falaises: "mineral",
  corolles: "petal",
  filaments: "thread",
  brumes: "ink",
  lagons: "splatter",
  bulles: "bubble",
  aurore: "aurora",
  calligraphie: "calligraphy",
  network: "network",
  dilution: "dilution",
  echo: "echo",
};

/** Twenty-four shared masks, prepared once outside rendering. No texture per mark. */
export function createGenerativeMaterials() {
  const factory = new TextureFactory({ size: 128, maxEntries: 24 });
  const keys = new Map(
    Object.entries(styles).map(([id, style]) => [
      id,
      [0, 1].map((variant) =>
        factory.prepare({
          seed: `nid-${id}-${variant}`,
          params: {
            ...materialGrammar({
              energy: variant ? 0.9 : 0.3,
              flux: variant ? 0.8 : 0.1,
              freq: variant ? 4500 : 800,
            }),
            style,
          },
        }),
      ),
    ]),
  );
  return {
    acquire(id, features) {
      const variants = keys.get(id);
      return variants
        ? factory.acquire(
            variants[materialGrammar(features).profile >= 2 ? 1 : 0],
          )
        : null;
    },
    get stats() {
      return factory.stats;
    },
    dispose() {
      factory.dispose();
    },
  };
}
