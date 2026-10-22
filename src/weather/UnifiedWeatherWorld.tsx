import { useMemo } from "react";
import { LandscapeScene, type Steering } from "../landscape/LandscapeScene";
import { TerrainGenerator } from "../landscape/TerrainGenerator";
import { weatherScore } from "./weatherScore";
import type { Zone } from "./weatherModel";
interface Props {
  zones: Zone[]; paused: boolean; travel: boolean; gyro: boolean; gyroRevision?:number;
  navigation: React.RefObject<Steering>;
  onGyroError: (text: string) => void;
}
export function UnifiedWeatherWorld(props: Props) {
  // Navigation shares the existing world contract; no terrain/placement generation.
  const world=useMemo(()=>{
    const settings=weatherScore(props.zones);
    return {settings,terrain:new TerrainGenerator(settings),objects:[],
      camera:[0,1,10] as [number,number,number],target:[0,0,-5] as [number,number,number]};
  },[props.zones]);
  return <LandscapeScene surreal world={world} weatherZones={props.zones} moving={props.travel}
    exploring paused={props.paused} gyro={props.gyro} gyroRevision={props.gyroRevision}
    steering={props.navigation} onGyroError={props.onGyroError}/>;
}
