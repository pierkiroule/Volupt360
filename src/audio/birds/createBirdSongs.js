import {
  drawNature,
  combineNatureProfile,
} from "../../materials/commonsNature.js";

// Compatibility adapter for the existing collection API. Materials now use images only.
export function createBirdSongs({ ids, onChange = () => {}, request = fetch }) {
  const abort = new AbortController();
  const profiles = new Map();
  let catalog = {},
    status = "idle",
    error = "",
    disposed = false,
    addTask = null;
  const emit = () => {
    if (!disposed) onChange();
  };
  async function generate(id) {
    if (disposed || !ids.includes(id)) return null;
    if (profiles.has(id))
      return { recording: catalog[id], profile: profiles.get(id) };
    if (addTask) return null;
    status = "loading";
    error = "";
    emit();
    addTask = (async () => {
      const excluded = [...profiles.values()].map(
        (profile) => profile.photo.pageid,
      );
      try {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const nature = await drawNature(excluded, {
              onCandidate: (pageid) => excluded.push(pageid),
              signal: abort.signal,
              request,
            });
            if (disposed) return null;
            const profile = combineNatureProfile(
              { seed: nature.photo.pageid >>> 0 },
              nature,
            );
            catalog = { ...catalog, [id]: { photo: nature.photo } };
            profiles.set(id, profile);
            status = "ready";
            emit();
            return { recording: catalog[id], profile };
          } catch (cause) {
            if (attempt === 2 || disposed) throw cause;
          }
        }
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
      abort.abort();
      profiles.clear();
      catalog = {};
    },
  };
}
