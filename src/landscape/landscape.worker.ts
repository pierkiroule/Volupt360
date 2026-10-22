import { composeLandscape } from "./LandscapeComposer";
import { validSettings, type LandscapeSettings } from "./types";
const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<LandscapeSettings>) => void) | null;
  postMessage: (value: unknown) => void;
};
scope.onmessage = (event) => {
  try {
    if (!validSettings(event.data)) throw Error("Paramètres invalides");
    const { settings, objects, camera, target } = composeLandscape(event.data);
    scope.postMessage({ settings, objects, camera, target });
  } catch (error) {
    scope.postMessage({
      error: error instanceof Error ? error.message : "Composition impossible",
    });
  }
};
