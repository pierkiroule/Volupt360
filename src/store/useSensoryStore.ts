import { create } from "zustand";
import type { SensoryComposition, WordChoice } from "../transduction/types.ts";
import {
  serializeComposition,
  parseComposition,
} from "../utils/sensoryComposition.ts";
interface SkyState {
  composition: SensoryComposition;
  initial: SensoryComposition | null;
  phase: "welcome" | "compose" | "sky";
  editing: boolean;
  travel: boolean;
  gyro: boolean;
  gyroStatus: "off" | "waiting" | "active" | "unavailable";
  recenter: number;
  paused: boolean;
  reduced: boolean;
  hidden: boolean;
  sound: boolean;
  poetry: boolean;
  volume: number;
  setPhase: (phase: SkyState["phase"]) => void;
  setWords: (words: WordChoice[]) => void;
  birth: () => void;
  restore: () => void;
  load: (c: SensoryComposition) => void;
  patch: (
    state: Partial<
      Pick<
        SkyState,
        | "editing"
        | "paused"
        | "reduced"
        | "hidden"
        | "sound"
        | "poetry"
        | "volume"
        | "travel"
        | "gyro"
        | "gyroStatus"
        | "recenter"
      >
    >,
  ) => void;
}
export const useSensoryStore = create<SkyState>((set, get) => ({
  composition: {
    version: 1,
    seed: crypto.getRandomValues(new Uint32Array(1))[0],
    words: [],
  },
  initial: null,
  phase: "welcome",
  editing: false,
  travel: false,
  gyro: false,
  gyroStatus: "off",
  recenter: 0,
  paused: false,
  reduced: matchMedia("(prefers-reduced-motion:reduce)").matches,
  hidden: false,
  sound: false,
  poetry: true,
  volume: 0.4,
  setPhase: (phase) => set({ phase }),
  setWords: (words) =>
    set((s) => ({
      composition: { ...s.composition, words: words.slice(0, 3) },
    })),
  birth: () => {
    const initial = parseComposition(serializeComposition(get().composition));
    set({
      initial,
      phase: "sky",
      editing: false,
      paused: false,
      travel: get().travel,
    });
  },
  restore: () => {
    const initial = get().initial;
    if (initial)
      set({ composition: parseComposition(serializeComposition(initial)) });
  },
  load: (c) => {
    const v = parseComposition(serializeComposition(c));
    set({
      composition: v,
      initial: parseComposition(serializeComposition(v)),
      phase: "sky",
      editing: false,
      paused: false,
      sound: false,
    });
  },
  patch: (state) => set(state),
}));
