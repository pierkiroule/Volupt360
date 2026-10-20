import test from "node:test";
import assert from "node:assert/strict";
import { seededRandom, transduce } from "../src/transduction/engine.ts";
import { SENSORY_WORDS } from "../src/data/sensoryWords.ts";
import {
  customWord,
  serializeComposition,
  parseComposition,
  encodeComposition,
  decodeComposition,
  validateComposition,
} from "../src/utils/sensoryComposition.ts";
import type { SensoryComposition } from "../src/transduction/types.ts";
const make = (ids: string[], intensity = 70): SensoryComposition => ({
  version: 1,
  seed: 84626,
  words: ids.map((id) => ({
    ...SENSORY_WORDS.find((w) => w.id === id)!,
    intensity,
  })),
});
test("random sequence and complete field are reproducible by seed", () => {
  const a = seededRandom(472),
    b = seededRandom(472);
  assert.deepEqual(
    Array.from({ length: 20 }, a),
    Array.from({ length: 20 }, b),
  );
  assert.notEqual(seededRandom(472)(), seededRandom(473)());
  assert.deepEqual(
    transduce(make(["flottement", "tension"])),
    transduce(make(["flottement", "tension"])),
  );
});
test("mix is order independent and intensity affects the shared field", () => {
  assert.deepEqual(
    transduce(make(["tension", "flottement"])),
    transduce(make(["flottement", "tension"])),
  );
  const neutral = transduce(make(["flottement"], 0));
  assert.deepEqual(neutral.axes, Array(8).fill(0));
  assert.notDeepEqual(
    transduce(make(["flottement"], 30)),
    transduce(make(["flottement"], 90)),
  );
});
test("tension and suspension interact nonlinearly in a single stretched suspended material", () => {
  const mixed = transduce(make(["tension", "flottement"]));
  assert.ok(mixed.axes[0] < 0);
  assert.ok(mixed.axes[2] < 0);
  assert.ok(mixed.stretch > 1);
  const pureA = transduce(make(["tension"])),
    pureB = transduce(make(["flottement"]));
  assert.notEqual(mixed.coupling, (pureA.coupling + pureB.coupling) / 2);
});
test("contrasting compositions generate distinct spatial and chromatic parameters", () => {
  const light = transduce(make(["flottement", "douceur"])),
    heavy = transduce(make(["lourdeur", "tension"]));
  assert.notDeepEqual(light.palette, heavy.palette);
  assert.notEqual(light.stretch, heavy.stretch);
  assert.notEqual(light.speed, heavy.speed);
});
test("JSON and compact URL roundtrip Unicode labels and seed without information loss", () => {
  const c = make(["clarte", "legerete"]);
  c.words.push(customWord("Éclat d’été"));
  assert.deepEqual(
    parseComposition(serializeComposition(c)),
    decodeComposition(encodeComposition(c)),
  );
  assert.deepEqual(
    encodeComposition(c),
    encodeComposition(parseComposition(serializeComposition(c))),
  );
  assert.equal(decodeComposition(encodeComposition(c)).seed, c.seed);
});
test("invalid, oversized, duplicated or nonfinite input is rejected", () => {
  const c = make(["tension"]);
  for (const invalid of [
    { ...c, seed: -1 },
    { ...c, version: 2 },
    { ...c, words: [...c.words, ...c.words] },
    { ...c, words: [{ ...c.words[0], intensity: NaN }] },
    { ...c, words: [{ ...c.words[0], vector: [1] }] },
    {
      ...c,
      words: [{ ...c.words[0], vector: [Infinity, 0, 0, 0, 0, 0, 0, 0] }],
    },
  ])
    assert.throws(() => validateComposition(invalid));
  assert.throws(() => parseComposition(" ".repeat(33000)));
  assert.throws(() => decodeComposition("<invalid>"));
  assert.throws(() => decodeComposition("a".repeat(3501)));
});
test("all dictionary words and bounded mixtures produce finite parameters", () => {
  for (const word of SENSORY_WORDS) {
    const p = transduce(make([word.id], 100));
    assert.equal(p.axes.length, 8);
    assert.ok(p.axes.every((v) => Number.isFinite(v) && Math.abs(v) <= 1));
    assert.ok(
      p.palette.flat().every((v) => Number.isFinite(v) && v >= 0 && v <= 1),
    );
  }
});

test("spatial sculpture is reproducible and has bounded, continuous 3D buffers", async () => {
  const { createSensoryWorld } = await import("../src/scene/sensoryWorld.ts");
  const a = createSensoryWorld(730),
    b = createSensoryWorld(730),
    other = createSensoryWorld(731);
  try {
    assert.deepEqual(
      a.matrices.map((m) => m.elements),
      b.matrices.map((m) => m.elements),
    );
    assert.notDeepEqual(a.matrices[0].elements, other.matrices[0].elements);
    for (const geometry of [a.ribbons, a.ink, a.particles]) {
      const positions = geometry.getAttribute("position");
      assert.ok([...positions.array].every(Number.isFinite));
      geometry.computeBoundingBox();
      const box = geometry.boundingBox!;
      assert.ok(box.max.x - box.min.x > 15);
      assert.ok(box.max.y - box.min.y > 8);
      assert.ok(box.max.z - box.min.z > 15);
      if (geometry.index)
        assert.ok([...geometry.index.array].every((i) => i < positions.count));
    }
    const positions = a.ribbons.getAttribute("position");
    for (let i = 0; i < 98; i++) {
      const d = Math.hypot(
        positions.getX(i * 2 + 2) - positions.getX(i * 2),
        positions.getY(i * 2 + 2) - positions.getY(i * 2),
        positions.getZ(i * 2 + 2) - positions.getZ(i * 2),
      );
      assert.ok(d < 1, "the pigment ribbon must remain continuous");
    }
  } finally {
    for (const w of [a, b, other]) {
      w.ribbons.dispose();
      w.ink.dispose();
      w.particles.dispose();
    }
  }
});

test("Plutchik families preserve their chromatic voices and non-linear mixed dynamics", async () => {
  const { EMOTION_WHEEL } = await import("../src/data/emotionWheel.ts");
  assert.equal(EMOTION_WHEEL.length, 8);
  const compose = (ids: string[]): SensoryComposition => ({
    version: 1,
    seed: 430,
    words: ids.map((id) => ({
      ...EMOTION_WHEEL.find((w) => w.id === id)!,
      intensity: 80,
    })),
  });
  for (let i = 0; i < 8; i++)
    assert.equal(EMOTION_WHEEL[(i + 4) % 8].id, EMOTION_WHEEL[i].opposite);
  const joy = transduce(compose(["joie"])),
    sad = transduce(compose(["tristesse"])),
    mixed = transduce(compose(["joie", "tristesse"]));
  assert.notDeepEqual(joy.palette, sad.palette);
  assert.notEqual(joy.speed, sad.speed);
  assert.notEqual(joy.axes[0], sad.axes[0]);
  assert.notDeepEqual(mixed.palette[0], mixed.palette[1]);
  assert.ok(mixed.coupling > 0);
  assert.deepEqual(mixed, transduce(compose(["tristesse", "joie"])));
  assert.deepEqual(
    decodeComposition(
      encodeComposition(compose(["joie", "peur", "surprise"])),
    ).words.map((w) => w.id),
    ["joie", "peur", "surprise"],
  );
});

test("generative score has reproducible phrases, evolving harmony and bounded soft registers", async () => {
  const { GenerativeScore } = await import("../src/audio/generativeScore.ts");
  const a = new GenerativeScore(123),
    b = new GenerativeScore(123);
  const events = Array.from({ length: 256 }, () => a.next(0.5));
  assert.deepEqual(
    events,
    Array.from({ length: 256 }, () => b.next(0.5)),
  );
  const flat = events.flat();
  for (const kind of ["pad", "bass", "melody", "pulse"])
    assert.ok(flat.some((e) => e.kind === kind));
  assert.ok(
    flat.every(
      (e) => e.midi >= 28 && e.midi <= 76 && e.gain <= 0.12 && e.duration > 0,
    ),
  );
  assert.notDeepEqual(events.slice(0, 32), events.slice(32, 64));
});
test("gyro conversion stays normalized across portrait and landscape orientation", async () => {
  const { deviceQuaternion } = await import("../src/scene/gyroOrientation.ts");
  const first = deviceQuaternion(0, 90, 0, 0),
    turned = deviceQuaternion(50, 90, 0, 0),
    landscape = deviceQuaternion(0, 90, 0, 90);
  assert.ok(Math.abs(first.length() - 1) < 1e-10);
  assert.ok(first.angleTo(turned) > 0.5);
  assert.ok(first.angleTo(landscape) > 1);
});

test("organic instruments are reproducible, bounded, click-free and naturally decay", async () => {
  const { synthesizeOrganic } =
    await import("../src/audio/organicInstruments.ts");
  for (const timbre of ["felt", "string", "bass", "brush"] as const) {
    const data = synthesizeOrganic(timbre, 57, 730),
      again = synthesizeOrganic(timbre, 57, 730);
    assert.deepEqual(data, again);
    assert.ok(data.every(Number.isFinite));
    assert.ok(Math.max(...data.subarray(0, 20000).map(Math.abs)) <= 0.821);
    assert.ok(Math.abs(data[0]) < 0.001);
    assert.ok(Math.abs(data[data.length - 1]) < 0.001);
    const rms = (start: number, end: number) => {
      let sum = 0;
      for (let i = start; i < end; i++) sum += data[i] ** 2;
      return Math.sqrt(sum / (end - start));
    };
    assert.ok(
      rms(0, Math.floor(data.length * 0.35)) >
        rms(Math.floor(data.length * 0.8), data.length) * 2,
    );
  }
});
test("procedural string keeps its intended pitch instead of becoming a detuned oscillator", async () => {
  const { synthesizeOrganic } =
    await import("../src/audio/organicInstruments.ts");
  const sampleRate = 22050,
    data = synthesizeOrganic("string", 57, 730),
    expected = sampleRate / 220;
  let bestLag = 0,
    best = -Infinity;
  const corr = (lag: number) => {
    let result = 0;
    for (let i = 2205; i < 6615; i++) result += data[i] * data[i + lag];
    return result;
  };
  for (
    let lag = Math.floor(expected) - 4;
    lag <= Math.ceil(expected) + 4;
    lag++
  ) {
    const value = corr(lag);
    if (value > best) {
      best = value;
      bestLag = lag;
    }
  }
  const left = corr(bestLag - 1),
    right = corr(bestLag + 1),
    fraction = (0.5 * (left - right)) / (left - 2 * best + right),
    frequency = sampleRate / (bestLag + fraction),
    cents = 1200 * Math.log2(frequency / 220);
  assert.ok(Math.abs(cents) < 20, `string tuning: ${cents.toFixed(1)} cents`);
});

test("audio/visual mailbox delivers on the audio clock, stays bounded and releases old owners safely", async () => {
  const { AudioVisualResonance } =
    await import("../src/audio/audioVisualResonance.ts");
  let now = 0;
  const bus = new AudioVisualResonance();
  const unbindOld = bus.bind(
    () => now,
    (out) => out.set([0.5, 0.3, 0.1, 0.4]),
  );
  const event = {
    kind: "melody" as const,
    midi: 64,
    pan: 0,
    strength: 0.5,
    time: 1,
  };
  bus.schedule(event);
  assert.equal(bus.sample(0.1).events.length, 0);
  now = 1;
  assert.equal(bus.sample(0.1).events.length, 1);
  assert.equal(bus.sample(0.1).events.length, 0);
  assert.ok(bus.state.energy > 0 && bus.state.energy < 0.4);
  for (let i = 0; i < 100; i++) bus.schedule({ ...event, time: 2 });
  now = 2;
  assert.equal(bus.sample(0.1).events.length, 32);
  bus.bind(
    () => now,
    (out) => out.fill(0.2),
  );
  unbindOld();
  assert.ok(bus.sample(0.1).energy > 0);
  bus.setActive(false);
  bus.schedule(event);
  assert.equal(bus.sample(0.1).events.length, 0);
});
test("poetic fragments vary with chosen families without asserting a visitor's state", async () => {
  const { poetryFor } = await import("../src/data/orbitalPoetry.ts");
  assert.notDeepEqual(poetryFor(["joie"]), poetryFor(["tristesse"]));
  assert.deepEqual(poetryFor(["joie", "peur"]), poetryFor(["peur", "joie"]));
  assert.ok(
    poetryFor(["joie", "peur"]).includes("deux couleurs peuvent cohabiter"),
  );
  assert.ok(poetryFor([]).every((text) => text.length < 60));
});

test("touch replies remain in the current harmony and cannot start audio through an inactive bridge", async () => {
  const { GenerativeScore } = await import("../src/audio/generativeScore.ts");
  const { AudioVisualResonance } =
    await import("../src/audio/audioVisualResonance.ts");
  const score = new GenerativeScore(19),
    notes = score.next(0.5),
    classes = new Set(
      notes
        .filter((n) => n.kind === "pad" || n.kind === "bass")
        .map((n) => n.midi % 12),
    );
  for (let i = 0; i <= 10; i++)
    assert.ok(classes.has(score.response(i / 10, 0).midi % 12));
  let calls = 0;
  const bus = new AudioVisualResonance();
  bus.gesture(0, 0.5);
  assert.equal(calls, 0);
  bus.bind(
    () => 0,
    () => {},
    () => calls++,
  );
  bus.gesture(0, 0.5);
  assert.equal(calls, 1);
  bus.setActive(false);
  bus.gesture(0, 0.5);
  assert.equal(calls, 1);
});
