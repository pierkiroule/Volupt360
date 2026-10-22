import { composeWeatherWorld } from "./WeatherWorldComposer";
self.onmessage = (event) => {
  try {
    const world = composeWeatherWorld(event.data);
    self.postMessage({ settings: world.settings, objects: world.objects, camera: world.camera, target: world.target });
  } catch { self.postMessage({ error: true }); }
};
