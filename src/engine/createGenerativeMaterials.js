import { TextureFactory } from "./TextureFactory.js";
import { materialGrammar } from "./MaterialGrammar.js";

export const GENERATIVE_BRUSH = "lagons"; // Existing Éclats, the black splatter brush.

/** Construct only when enabled. Four masks prepared once, never during paint. */
export function createGenerativeMaterials() {
  const factory = new TextureFactory({ size: 128, maxEntries: 4 });
  const keys = Array.from({ length: 4 }, (_, profile) =>
    factory.prepare({
      seed: `nid-splatch-${profile}`,
      params: materialGrammar({
        energy: profile / 3,
        flux: profile / 4,
        freq: profile * 1500,
      }),
    }),
  );
  return {
    acquire(id, features) {
      if (id !== GENERATIVE_BRUSH) return null;
      return factory.acquire(keys[materialGrammar(features).profile]);
    },
    get stats() {
      return factory.stats;
    },
    dispose() {
      factory.dispose();
    },
  };
}
