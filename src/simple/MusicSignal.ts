/** Post-volume audio measurements. Reused across frames; no React updates. */
export interface MusicSignal {
  energy: number;
  low: number;
  high: number;
  onset: number;
  note?: number;
}
export const SILENT_SIGNAL: Readonly<MusicSignal> = Object.freeze({
  energy: 0,
  low: 0,
  high: 0,
  onset: 0,
});
