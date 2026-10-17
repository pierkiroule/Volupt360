const CHORDS = [
  { name: "Cmaj7", root: 0, tones: [0, 4, 7, 11] },
  { name: "Am7", root: -3, tones: [-3, 0, 4, 7] },
  { name: "Fmaj7", root: -7, tones: [-7, -3, 0, 4] },
  { name: "G6", root: -5, tones: [-5, -1, 2, 4] },
];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
/** A shared transport, harmony and phrase grammar; no audio nodes or unbounded history. */
export function createChillComposer({ seed = 4103, bpm = 78 } = {}) {
  const beat = 60 / bpm,
    stepTime = beat / 4;
  let randomState = seed >>> 0,
    cursor = 0,
    lastTime = -1,
    phrase = -1;
  let motif = [0, 2, 1, 3, 2],
    rotation = 0,
    previousPitch = 12,
    activity = 0,
    count = 0;
  const random = () => {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return randomState / 4294967296;
  };
  function harmonyAt(time) {
    const bar = Math.floor(Math.max(0, time) / (beat * 4));
    const chord = CHORDS[Math.floor(bar / 4) % CHORDS.length];
    const sectionBar = bar % 48;
    const section =
      sectionBar < 8
        ? "ouverture"
        : sectionBar < 24
          ? "sillage"
          : sectionBar < 40
            ? "envol"
            : "respiration";
    return { ...chord, bar, section, phrase: Math.floor(bar / 4) };
  }
  function melodicPitch(chord, choice) {
    let pitch = chord.tones[((choice % 4) + 4) % 4] + 12;
    while (pitch < 5) pitch += 12;
    while (pitch > 19) pitch -= 12;
    const candidates = [pitch - 12, pitch, pitch + 12].filter(
      (p) => p >= 5 && p <= 19,
    );
    pitch = candidates.reduce(
      (best, value) =>
        Math.abs(value - previousPitch) < Math.abs(best - previousPitch)
          ? value
          : best,
      pitch,
    );
    previousPitch = pitch;
    return pitch;
  }
  return {
    beat,
    harmonyAt,
    influence(strength = 0.5) {
      activity = clamp(activity + clamp(strength, 0, 1) * 0.12, 0, 1);
    },
    brushPitch(time, choice, light = 0.5) {
      const chord = harmonyAt(time);
      // Brush gestures stay on chord tones; brighter matter changes the inversion.
      return melodicPitch(chord, choice + Math.round(clamp(light, 0, 1) * 2));
    },
    next(time, { hypnos = 0.3, brightness = 0.45 } = {}) {
      time = Math.max(0, Number.isFinite(time) ? time : 0);
      if (time < lastTime || cursor * stepTime < time - 0.4)
        cursor = Math.ceil(time / stepTime);
      activity *= Math.exp(-Math.max(0, time - Math.max(0, lastTime)) * 0.18);
      lastTime = time;
      const events = [];
      for (
        let guard = 0;
        guard < 24 && cursor * stepTime <= time + 0.14;
        guard++, cursor++
      ) {
        const base = cursor * stepTime,
          h = harmonyAt(base),
          step = cursor % 16;
        if (phrase !== h.phrase) {
          phrase = h.phrase;
          rotation = Math.floor(random() * 4);
          // Keep a recognizable cell; mutate one place per four-bar phrase.
          motif = motif.slice();
          motif[Math.floor(random() * motif.length)] = Math.floor(random() * 4);
        }
        const intro = h.section === "ouverture",
          breath = h.section === "respiration";
        const density = clamp(
          (intro ? 0.45 : breath ? 0.32 : h.section === "envol" ? 0.86 : 0.68) +
            activity * 0.18 -
            hypnos * 0.15,
          0.2,
          0.95,
        );
        const at = base + (step % 2 ? beat * 0.035 : 0);
        const human = 0.92 + random() * 0.12;
        const emit = (role, velocity, extras = {}) => {
          events.push({
            role,
            time: at,
            velocity: velocity * human,
            ...extras,
          });
          count++;
        };
        if (
          (step === 0 ||
            (!intro && !breath && step === 8) ||
            (step === 11 && h.bar % 4 === 3 && random() < 0.35)) &&
          (!breath || h.bar % 2 === 0)
        )
          emit("kick", 0.62);
        if ((step === 4 || step === 12) && !intro && (!breath || step === 12))
          emit("wood", 0.25 + density * 0.13);
        if (step % 2 === 0 && !intro && random() < density)
          emit("shaker", step % 4 === 2 ? 0.22 : 0.13);
        if (step === 0 || (step === 10 && !breath && random() < density * 0.55))
          emit("bass", 0.32, {
            pitch: h.root - 12,
            duration: beat * (step === 0 ? 2.2 : 1.25),
            type: "bass",
            layer: 0,
          });
        const leadSteps = intro || breath ? [6, 14] : [2, 6, 9, 14];
        if (leadSteps.includes(step) && random() < density) {
          const index = (h.bar * 3 + leadSteps.indexOf(step)) % motif.length;
          const pitch = melodicPitch(h, motif[index] + rotation);
          emit("lead", 0.22 + clamp(brightness, 0, 1) * 0.12, {
            pitch,
            duration: beat * (1.1 + random() * 0.8),
            type: random() < 0.22 ? "string" : "felt",
            layer: 1,
          });
          if (h.bar % 8 === 7 && step === 14 && !breath) {
            events.push({
              role: "lead",
              time: at + beat * 0.75,
              velocity: 0.13,
              pitch: melodicPitch(
                harmonyAt(at + beat * 0.75),
                motif[index] + rotation,
              ),
              duration: beat * 1.4,
              type: "felt",
              layer: 2,
            });
            count++;
          }
        }
      }
      return events;
    },
    get stats() {
      const h = harmonyAt(Math.max(0, lastTime));
      return {
        style: "electro-chill",
        bpm,
        bar: h.bar,
        section: h.section,
        chord: h.name,
        phrase,
        events: count,
        motif: [...motif],
        activity,
      };
    },
  };
}
