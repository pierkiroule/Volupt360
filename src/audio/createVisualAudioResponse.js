/** Slow adaptive headroom exposes quiet music; fast attack keeps accents legible. */
export function createVisualAudioResponse() {
  let peak = 0.025,
    energy = 0,
    low = 0,
    high = 0,
    pulse = 0;
  const bands = new Float32Array(6);
  return (music = {}, voice = {}, dt = 0.04) => {
    const rms = Math.max(music.rms || 0, voice.rms || 0);
    const musicRms = music.rms || 0;
    peak = Math.max(0.025, musicRms, peak * Math.exp(-dt * 0.12));
    const target = musicRms > 0.003 ? Math.min(1, (musicRms / peak) * 0.8) : 0;
    const combined = Math.max(target, voice.energy || 0);
    energy +=
      (combined - energy) * (1 - Math.exp(-dt * (combined > energy ? 12 : 3)));
    const flux = Math.min(1, Math.max(music.flux || 0, voice.flux || 0) * 2.5);
    const targetLow = Math.min(
      1,
      Math.max(music.low || 0, voice.low || 0) * 1.4,
    );
    const targetHigh = Math.min(
      1,
      Math.max(music.high || 0, voice.high || 0) * 1.7,
    );
    low += (targetLow - low) * (1 - Math.exp(-dt * (targetLow > low ? 10 : 3)));
    high +=
      (targetHigh - high) * (1 - Math.exp(-dt * (targetHigh > high ? 12 : 4)));
    const accent = Math.min(1, flux * 1.5 + Math.max(0, combined - energy) * 2);
    pulse += (accent - pulse) * (1 - Math.exp(-dt * (accent > pulse ? 24 : 6)));
    for (let i = 0; i < 6; i++) {
      const raw = Math.max(music.bands?.[i] || 0, voice.bands?.[i] || 0);
      const targetBand = rms > 0.003 ? Math.min(1, raw * 1.35) : 0;
      bands[i] +=
        (targetBand - bands[i]) *
        (1 - Math.exp(-dt * (targetBand > bands[i] ? 14 : 4)));
    }
    return {
      bands,
      rms,
      energy,
      low,
      high,
      flux,
      pulse,
      freq:
        (voice.rms || 0) > musicRms ? voice.freq || 1200 : music.freq || 1200,
    };
  };
}
