/** Slow adaptive headroom exposes quiet music; fast attack keeps accents legible. */
export function createVisualAudioResponse() {
  let peak = 0.025,
    energy = 0;
  return (music = {}, voice = {}, dt = 0.04) => {
    const rms = Math.max(music.rms || 0, voice.rms || 0);
    const musicRms = music.rms || 0;
    peak = Math.max(0.025, musicRms, peak * Math.exp(-dt * 0.12));
    const target = musicRms > 0.003 ? Math.min(1, (musicRms / peak) * 0.8) : 0;
    const combined = Math.max(target, voice.energy || 0);
    energy +=
      (combined - energy) * (1 - Math.exp(-dt * (combined > energy ? 12 : 3)));
    const flux = Math.min(1, Math.max(music.flux || 0, voice.flux || 0) * 2.5);
    return {
      rms,
      energy,
      low: Math.min(1, Math.max(music.low || 0, voice.low || 0) * 1.4),
      high: Math.min(1, Math.max(music.high || 0, voice.high || 0) * 1.7),
      flux,
      pulse: Math.min(1, flux * 1.5 + Math.max(0, combined - energy) * 2),
      freq:
        (voice.rms || 0) > musicRms ? voice.freq || 1200 : music.freq || 1200,
    };
  };
}
