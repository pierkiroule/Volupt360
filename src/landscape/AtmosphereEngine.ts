import type { Atmosphere } from "./types";
export const ATMOSPHERE = {
  dawn: {
    sky: "#c7c9cb",
    zenith: "#9cafc0",
    horizon: "#e7c4a3",
    fog: "#c7c9bd",
    sun: "#ffe1ac",
    intensity: 2.4,
    ambient: 1.3,
    elevation: 0.19,
  },
  day: {
    sky: "#b7cbd4",
    zenith: "#8eaec2",
    horizon: "#e5e5cf",
    fog: "#c4d1cd",
    sun: "#fff2d7",
    intensity: 2.8,
    ambient: 1.4,
    elevation: 0.8,
  },
  dusk: {
    sky: "#a7a5b3",
    zenith: "#6e819c",
    horizon: "#deb3a3",
    fog: "#b1acb3",
    sun: "#ffc4a0",
    intensity: 1.7,
    ambient: 1.05,
    elevation: 0.12,
  },
  night: {
    sky: "#273447",
    zenith: "#182638",
    horizon: "#66718b",
    fog: "#3b4b61",
    sun: "#cbdcf1",
    intensity: 0.6,
    ambient: 0.65,
    elevation: 0.45,
  },
} satisfies Record<
  Atmosphere,
  {
    sky: string;
    zenith: string;
    horizon: string;
    fog: string;
    sun: string;
    intensity: number;
    ambient: number;
    elevation: number;
  }
>;
