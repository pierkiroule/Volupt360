declare module "@strudel/web" {
  export interface Pattern {
    s(v: string): Pattern;
    slow(v: number): Pattern;
    gain(v: number): Pattern;
    attack(v: number): Pattern;
    decay(v: number): Pattern;
    sustain(v: number): Pattern;
    release(v: number): Pattern;
    lpf(v: number): Pattern;
    hpf(v: number): Pattern;
    pan(v: number): Pattern;
    room(v: number): Pattern;
    roomsize(v: number): Pattern;
    roomlp(v: number): Pattern;
    delay(v: number): Pattern;
    delaytime(v: number): Pattern;
    delayfeedback(v: number): Pattern;
    degradeBy(v: number): Pattern;
    seed(v: number): Pattern;
    queryArc(
      begin: number,
      end: number,
    ): Array<{ value: Record<string, unknown> }>;
  }
  export interface Repl {
    setPattern(p: Pattern, autostart?: boolean): Promise<Pattern>;
    setCps(cps: number): void;
    start(): Promise<void>;
    pause(): void;
    stop(): void;
  }
  export function initStrudel(options?: {
    audioContext?: AudioContext;
    miniAllStrings?: boolean;
  }): Promise<Repl>;
  export function initAudioOnFirstClick(options?: {
    maxPolyphony?: number;
  }): Promise<void>;
  export function initAudio(options?: { maxPolyphony?: number }): Promise<void>;
  export function note(value: string): Pattern;
  export function s(value: string): Pattern;
  export function stack(...patterns: Pattern[]): Pattern;
  export function resetGlobalEffects(): void;
  export function getSuperdoughAudioController(): {
    output: { destinationGain: GainNode };
  };
  export function setSuperdoughAudioController(value: null): void;
}
