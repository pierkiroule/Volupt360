// Bounded analysis of the real decoded recording, outside the animation loop.
export function analyzeBirdRecording(buffer) {
  const samples = buffer.getChannelData(0),
    stride = Math.max(1, Math.ceil(samples.length / 180000));
  const envelope = Array(32).fill(0),
    counts = Array(32).fill(0);
  let total = 0,
    difference = 0,
    count = 0;
  for (let i = 0; i < samples.length; i += stride) {
    const value = samples[i],
      cell = Math.min(31, Math.floor((i / samples.length) * 32));
    total += value * value;
    difference += (value - samples[Math.max(0, i - 1)]) ** 2;
    count++;
    envelope[cell] += value * value;
    counts[cell]++;
  }
  const rms = Math.sqrt(total / Math.max(1, count));
  const raw = envelope.map((energy, i) =>
    Math.sqrt(energy / Math.max(1, counts[i])),
  );
  const peak = Math.max(0.00001, ...raw);
  const normalized = raw.map((value) => value / peak);
  let variation = 0;
  for (let i = 1; i < 32; i++)
    variation += Math.abs(normalized[i] - normalized[i - 1]);
  return {
    intensity: Math.min(1, rms * 6),
    brightness: Math.min(
      1,
      Math.sqrt(difference / Math.max(0.000001, total)) * 0.5,
    ),
    rhythm: Math.min(1, variation / 8),
    contrast: Math.max(...normalized) - Math.min(...normalized),
    envelope: normalized,
  };
}
export function createBirdBrushProfile(recording, acoustic) {
  const seed = (Math.imul(recording.sound, 2654435761) ^ recording.taxon) >>> 0;
  const families =
    acoustic.rhythm > 0.42
      ? ["plumes", "lucioles", "feuilles", "hachures", "bulles", "corolles"]
      : acoustic.brightness > 0.45
        ? [
            "filaments",
            "calligraphie",
            "filamentslibres",
            "network",
            "echo",
            "racines",
          ]
        : ["voiles", "dilution", "aurore", "lagons", "falaises", "brumes"];
  const hue =
    ((seed % 360) + acoustic.brightness * 65 + acoustic.rhythm * 80) % 360;
  return {
    seed,
    baseId: families[seed % families.length],
    color: `hsl(${hue}, ${45 + acoustic.contrast * 25}%, ${35 + acoustic.brightness * 18}%)`,
    width: 0.65 + acoustic.intensity * 0.85,
    opacity: 0.58 + acoustic.contrast * 0.35,
    acoustic,
  };
}
