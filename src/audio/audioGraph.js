/** Audio analysis shared by microphone input and local music files. */
export function createAudioGraph() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.57;
  const bins = new Uint8Array(analyser.frequencyBinCount);
  const wave = new Uint8Array(analyser.fftSize);
  const prev = new Float32Array(bins.length);
  return { ctx, analyser, bins, wave, prev };
}

export function readAudioFeatures(graph) {
  const { analyser, bins, wave, prev, ctx } = graph;
  const bands = (graph.bands ??= new Float32Array(6));
  const counts = (graph.bandCounts ??= new Uint16Array(6));
  bands.fill(0);
  counts.fill(0);
  analyser.getByteFrequencyData(bins);
  analyser.getByteTimeDomainData(wave);
  let rms = 0;
  for (const v of wave) {
    const n = (v - 128) / 128;
    rms += n * n;
  }
  rms = Math.sqrt(rms / wave.length);
  const step = ctx.sampleRate / analyser.fftSize;
  let total = 0,
    cent = 0,
    low = 0,
    high = 0,
    flux = 0;
  for (let i = 3; i < bins.length; i++) {
    const hz = i * step;
    if (hz > 9500) break;
    const v = bins[i] / 255;
    const band =
      hz < 180
        ? 0
        : hz < 480
          ? 1
          : hz < 1200
            ? 2
            : hz < 3000
              ? 3
              : hz < 6000
                ? 4
                : 5;
    bands[band] += v * v;
    counts[band]++;
    total += v;
    cent += hz * v;
    if (hz < 850) low += v;
    if (hz > 2500) high += v;
    flux += Math.max(0, v - prev[i]);
    prev[i] = v;
  }
  for (let i = 0; i < 6; i++)
    bands[i] = Math.sqrt(bands[i] / Math.max(1, counts[i]));
  return {
    bands,
    rms,
    energy: Math.min(1, rms * 9),
    freq: total ? cent / total : 0,
    low: Math.min(1, low / 25),
    high: Math.min(1, high / 65),
    flux: Math.min(1, flux / 24),
  };
}
