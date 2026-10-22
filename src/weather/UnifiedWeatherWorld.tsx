import { useEffect, useState } from "react";
import { LandscapeScene, type Steering } from "../landscape/LandscapeScene";
import type { ComposedLandscape } from "../landscape/LandscapeComposer";
import { AssetLibrary, type ModelAsset } from "../landscape/AssetLibrary";
import { composeWeatherWorld, WeatherTerrain } from "./WeatherWorldComposer";
import { weatherScore } from "./weatherScore";
import type { Zone } from "./weatherModel";
interface Props {
  zones: Zone[]; paused: boolean; travel: boolean; gyro: boolean;
  navigation: React.RefObject<Steering>;
  onGyroError: (text: string) => void;
}
export function UnifiedWeatherWorld(props: Props) {
  const [world, setWorld] = useState<ComposedLandscape | null>(null);
  const [model, setModel] = useState<ModelAsset | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true, worker: Worker | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setWorld(null); setFailed(false);
    const fallback = () => {
      worker?.terminate();
      timer = setTimeout(() => {
        if (!live) return;
        try { setWorld(composeWeatherWorld(props.zones)); }
        catch { setFailed(true); }
      }, 0);
    };
    try {
      worker = new Worker(new URL("./weatherWorld.worker.ts", import.meta.url), {type:"module"});
      worker.onmessage = ({data}) => {
        if (!live) return;
        if (data.error) { fallback(); return; }
        setWorld({...data, terrain: new WeatherTerrain(props.zones)});
        worker?.terminate();
      };
      worker.onerror = fallback;
      worker.postMessage(props.zones);
    } catch { fallback(); }
    return () => { live = false; worker?.terminate(); if (timer) clearTimeout(timer); };
  }, [props.zones]);
  useEffect(() => {
    const library = new AssetLibrary();
    let live = true;
    setModel(null);
    const settings = weatherScore(props.zones);
    void library.selectModel(settings.biome, settings.seed)
      .then(value => { if (live) setModel(value); }).catch(() => {});
    return () => { live = false; library.dispose(); };
  }, [props.zones]);
  if (!world) return <p className="meteo-world-loading" role="status">{failed ? "Le paysage n’a pas pu être composé. Reviens au disque pour réessayer." : "Tes nuances deviennent un monde…"}</p>;
  return <>
    <LandscapeScene world={world} weatherZones={props.zones} moving={props.travel}
      exploring paused={props.paused} gyro={props.gyro} steering={props.navigation}
      onGyroError={props.onGyroError} model={model} environment={null} />
    {model && <a className="meteo-asset-credit" href={"https://polyhaven.com/a/"+model.id} target="_blank" rel="noreferrer">{model.name} · Poly Haven / CC0</a>}
  </>;
}
