const ENVELOPE_RATE = 100;

/** Estimate rhythmic phrases from energy onsets; fall back to regular phrases
 * for ambient/silent tracks. Boundaries are snapped to nearby quiet moments.
 * Analysis uses every channel so phase cancellation cannot hide the rhythm.
 */
export function analyzeLoops(buffer) {
  const { duration, sampleRate, length, numberOfChannels } = buffer;
  const hop = Math.max(1, Math.floor(sampleRate / ENVELOPE_RATE));
  const channels = Array.from({ length: numberOfChannels }, (_, i) =>
    buffer.getChannelData(i),
  );
  const envelope = new Float32Array(Math.ceil(length / hop));
  for (let frame = 0; frame < envelope.length; frame++) {
    let sum = 0,
      count = 0;
    for (let i = frame * hop; i < Math.min(length, (frame + 1) * hop); i += 4) {
      for (const channel of channels) {
        sum += channel[i] ** 2;
        count++;
      }
    }
    envelope[frame] = Math.sqrt(sum / Math.max(1, count));
  }
  const rate = sampleRate / hop;
  const novelty = envelope.map((value, i) =>
    Math.max(0, value - (envelope[Math.max(0, i - 3)] || 0)),
  );
  let bestScore = 0,
    beat = 0.5;
  for (let lag = Math.round(rate / 3); lag <= Math.round(rate); lag++) {
    let score = 0;
    for (let i = lag; i < novelty.length; i++)
      score += novelty[i] * novelty[i - lag];
    score /= Math.max(1, novelty.length - lag);
    // Slight preference for a useful, mid-tempo pulse when harmonics tie.
    score *= 1 - 0.12 * Math.abs(lag / rate - 0.5);
    if (score > bestScore) {
      bestScore = score;
      beat = lag / rate;
    }
  }
  const rhythmic = bestScore > 0.00001;
  let phrase = rhythmic ? beat * 16 : 8;
  phrase *= Math.max(1, Math.ceil(duration / phrase / 32));
  if (duration < phrase * 1.5) phrase = duration / (duration >= 6 ? 2 : 1);
  const boundaries = [0];
  const snap = rhythmic ? Math.min(0.16, beat * 0.25) : 0.2;
  for (let time = phrase; time < duration - phrase * 0.45; time += phrase) {
    const target = Math.round(time * rate);
    let index = target,
      quietest = Infinity;
    for (
      let i = Math.max(1, target - Math.round(snap * rate));
      i <= Math.min(envelope.length - 1, target + Math.round(snap * rate));
      i++
    ) {
      // Quiet transitions get preference without drifting far off the phrase.
      const cost = envelope[i] + (Math.abs(i - target) / rate) * 0.04;
      if (cost < quietest) {
        quietest = cost;
        index = i;
      }
    }
    boundaries.push(index / rate);
  }
  boundaries.push(duration);
  const loops = boundaries
    .slice(0, -1)
    .map((start, i) => ({ id: i, start, end: boundaries[i + 1] }));
  const waveform = Array.from({ length: 180 }, (_, i) => {
    const from = Math.floor((i * envelope.length) / 180);
    const to = Math.max(
      from + 1,
      Math.floor(((i + 1) * envelope.length) / 180),
    );
    let peak = 0;
    for (let k = from; k < Math.min(to, envelope.length); k++)
      peak = Math.max(peak, envelope[k]);
    return peak;
  });
  const max = Math.max(0.001, ...waveform);
  return {
    loops,
    waveform: waveform.map((value) => value / max),
    bpm: rhythmic ? Math.round(60 / beat) : null,
  };
}
