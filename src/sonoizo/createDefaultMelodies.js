// One shared D-major pentatonic palette: all twelve pads can sound together.
const SCALE = [62, 64, 66, 69, 71, 74, 76, 78];
const SAMPLE_RATE = 24000;
const DURATION = 3.8;

/** Pure PCM synthesis: no AudioContext, network, permission or autoplay. */
export function createDefaultMelody(index) {
  const data = new Float32Array(Math.round(DURATION * SAMPLE_RATE));
  const notes = [index % 5, (index + 2) % 5, (index + 4) % 5, (index + 1) % 5];
  for (let note = 0; note < notes.length; note++) {
    const midi = SCALE[notes[note] + (index % 3 === 2 ? 2 : 0)];
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    const start = 0.08 + note * 0.68;
    for (
      let frame = Math.floor(start * SAMPLE_RATE);
      frame < data.length;
      frame++
    ) {
      const t = frame / SAMPLE_RATE - start;
      const remaining = DURATION - frame / SAMPLE_RATE;
      const envelope =
        (1 - Math.exp(-t * 35)) *
        Math.exp(-t * (2.1 + index * 0.025)) *
        Math.min(1, remaining / 0.22);
      const angle = 2 * Math.PI * frequency * t;
      data[frame] +=
        envelope *
        0.19 *
        (Math.sin(angle) +
          0.22 * Math.sin(angle * 2) * Math.exp(-t * 3) +
          0.07 * Math.sin(angle * 3) * Math.exp(-t * 5));
    }
  }
  return { data, sampleRate: SAMPLE_RATE };
}
