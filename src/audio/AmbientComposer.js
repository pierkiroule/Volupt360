export const AMBIENT_WORLDS = {
  souffle: {
    name: "ÉTHER",
    periods: [13.7, 21.1, 31.3],
    motifs: [
      [0, 4, 6, 2],
      [7, 4, 2],
      [0, 1, 4, 7, 6],
    ],
    probability: 0.68,
    duration: 10,
    type: "felt",
    palette: ["felt", "string", "felt"],
    chordPeriod: 137,
    space: 24,
  },
  marees: {
    name: "ABYSSE",
    periods: [19.3, 29.7, 41.1],
    motifs: [
      [4, 2, 0],
      [7, 5, 3, 2],
      [4, 1, 0],
    ],
    probability: 0.48,
    duration: 8,
    type: "string",
    palette: ["string", "bubble", "bell"],
    chordPeriod: 173,
    space: 14,
  },
  ramure: {
    name: "MÉMOIRE",
    periods: [8.9, 14.3, 23.7],
    motifs: [
      [0, 2, 4, 1],
      [4, 3, 1],
      [0, 3, 4, 2, 1],
    ],
    probability: 0.82,
    duration: 5,
    type: "felt",
    palette: ["felt", "bell", "felt"],
    chordPeriod: 109,
    space: 20,
  },
};

export function createAmbientComposer(id, seed = 731) {
  const world = AMBIENT_WORLDS[id] || AMBIENT_WORLDS.souffle;
  const clocks = world.periods.map((period, i) => ({
    period,
    next: [0, 2.3, 5.7][i],
    index: 0,
  }));
  const memory = [];
  let last = -Infinity;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return {
    next(time, { echo = 0.5, hypnos = 0.3, brightness = 0.45 } = {}) {
      if (time < last) {
        clocks.forEach((clock, i) => {
          clock.next = time + i * 2.3;
        });
      }
      last = time;
      const events = [];
      clocks.forEach((clock, layer) => {
        if (clock.next < time - 0.2) clock.next = time;
        if (clock.next > time + 0.2) return;
        const first = clock.index === 0 && layer === 0;
        const motif = world.motifs[layer];
        let degree = motif[clock.index % motif.length];
        if (id === "ramure" && memory.length && random() < echo * 0.55)
          degree = memory[Math.floor(random() * memory.length)];
        if (first || random() < world.probability * (1 - hypnos * 0.55)) {
          const velocity = 0.3 + random() * 0.22;
          events.push({
            time: clock.next,
            degree: Math.max(0, degree + Math.round((brightness - 0.45) * 2)),
            velocity,
            duration: world.duration * (1 + hypnos * 0.8),
            layer,
            type: world.palette[layer],
          });
          memory.push(degree);
          if (memory.length > 64) memory.shift();
        }
        clock.index++;
        clock.next +=
          clock.period * (1 + hypnos * 1.4) * (0.97 + random() * 0.06);
      });
      return events;
    },
    get stats() {
      return {
        clocks: clocks.map((clock) => ({ ...clock })),
        memory: memory.length,
        world: world.name,
      };
    },
  };
}
