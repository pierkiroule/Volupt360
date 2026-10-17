import { Color } from "three";
export function universeGenerator(mood) {
  return {
    background:
      "#" +
      new Color()
        .setHSL(mood.hue, 0.06 + mood.density * 0.08, mood.brightness)
        .getHexString(),
    color: mood.palette[2],
    seed: mood.seed,
    speed: mood.speed,
    density: mood.density,
    fluidity: mood.fluidity,
    response: mood.response,
  };
}
