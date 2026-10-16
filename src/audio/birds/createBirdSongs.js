import { createProceduralBrush } from "../../materials/proceduralBrush.js";

// Compatibility adapter for the existing collection API. Materials are now entirely procedural.
export function createBirdSongs({ ids, onChange = () => {} }) {
  const profiles = new Map();
  let catalog = {},
    status = "idle",
    error = "",
    disposed = false,
    addTask = null;
  const emit = () => {
    if (!disposed) onChange();
  };
  async function generate(id, config) {
    if (disposed || !ids.includes(id)) return null;
    if (profiles.has(id))
      return { recording: catalog[id], profile: profiles.get(id) };
    if (addTask) return null;
    status = "loading";
    error = "";
    emit();
    addTask = (async () => {
      try {
        await Promise.resolve();
        const profile = createProceduralBrush(config);
        if (disposed) return null;
        catalog = { ...catalog, [id]: { commonName: profile.name } };
        profiles.set(id, profile);
        status = "ready";
        emit();
        return { recording: catalog[id], profile };
      } catch (cause) {
        if (!disposed) {
          status = "error";
          error = `Nouvelle matière indisponible : ${cause.message}`;
          emit();
        }
        return null;
      } finally {
        addTask = null;
      }
    })();
    return addTask;
  }
  return {
    generate,
    prepare: async () => {},
    warm: async () => {},
    start: async () => {},
    stop: () => {},
    features: () => ({}),
    snapshot: () => ({
      status,
      error,
      playing: "",
      state: "idle",
      assignments: catalog,
      generated: true,
      profiles: Object.fromEntries(profiles),
      used: {},
    }),
    dispose() {
      disposed = true;
      profiles.clear();
      catalog = {};
    },
  };
}
