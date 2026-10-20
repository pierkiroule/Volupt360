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
