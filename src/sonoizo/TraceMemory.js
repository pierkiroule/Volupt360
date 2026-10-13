import * as THREE from "three";
import { TRACE_LIMITS } from "./traceConfig.js";

/** Reference paths only: no textures, brush geometry or GPU ownership. */
export function createTraceMemory(options = {}) {
  const limits = { ...TRACE_LIMITS, ...options };
  if (
    !Number.isFinite(limits.cellSize) ||
    limits.cellSize <= 0 ||
    !Number.isInteger(limits.maxTraces) ||
    limits.maxTraces < 1 ||
    !Number.isInteger(limits.maxPointsPerTrace) ||
    limits.maxPointsPerTrace < 2 ||
    !Number.isFinite(limits.maxStep) ||
    limits.maxStep <= 0 ||
    !Number.isFinite(limits.minSpacing) ||
    limits.minSpacing < 0
  )
    throw new Error("Invalid trace memory limits");
  const traces = new Map(),
    segments = new Map(),
    cells = new Map();
  let sequence = 0,
    revision = 0;
  function keys(a, b, padding = 0) {
    const result = [],
      size = limits.cellSize;
    for (
      let x = Math.floor((Math.min(a.x, b.x) - padding) / size);
      x <= Math.floor((Math.max(a.x, b.x) + padding) / size);
      x++
    )
      for (
        let y = Math.floor((Math.min(a.y, b.y) - padding) / size);
        y <= Math.floor((Math.max(a.y, b.y) + padding) / size);
        y++
      )
        for (
          let z = Math.floor((Math.min(a.z, b.z) - padding) / size);
          z <= Math.floor((Math.max(a.z, b.z) + padding) / size);
          z++
        )
          result.push(`${x},${y},${z}`);
    return result;
  }
  function remove(id) {
    const trace = traces.get(id);
    if (!trace) return;
    for (const segment of trace.segments) {
      for (const key of segment.cells) {
        const bucket = cells.get(key);
        bucket?.delete(segment.id);
        if (!bucket?.size) cells.delete(key);
      }
      segments.delete(segment.id);
    }
    traces.delete(id);
    revision++;
  }
  return {
    record(id, brushId, position, time) {
      if (![position.x, position.y, position.z, time].every(Number.isFinite))
        return false;
      let trace = traces.get(id);
      if (!trace) {
        while (traces.size >= limits.maxTraces)
          remove(traces.keys().next().value);
        trace = {
          id,
          brushId,
          createdAt: time,
          points: [],
          segments: [],
          resonance: { count: 0, lastAt: -Infinity },
        };
        traces.set(id, trace);
      }
      if (trace.points.length >= limits.maxPointsPerTrace) return false;
      const previous = trace.points.at(-1);
      const distance = previous ? previous.position.distanceTo(position) : 0;
      if (previous && distance < limits.minSpacing) return false;
      const point = {
        position: new THREE.Vector3().copy(position),
        createdAt: time,
      };
      trace.points.push(point);
      if (previous && distance <= limits.maxStep) {
        const segment = {
          id: ++sequence,
          traceId: id,
          brushId,
          a: previous.position,
          b: point.position,
          createdAt: time,
          lastEncounter: -Infinity,
          encounters: 0,
          cells: keys(previous.position, point.position),
        };
        trace.segments.push(segment);
        segments.set(segment.id, segment);
        for (const key of segment.cells) {
          if (!cells.has(key)) cells.set(key, new Set());
          cells.get(key).add(segment.id);
        }
      }
      revision++;
      return true;
    },
    query(a, b, radius) {
      if (!segments.size || a.distanceTo(b) > limits.maxStep) return []; // Never search a discontinuous jump.
      const ids = new Set();
      for (const key of keys(a, b, radius))
        for (const id of cells.get(key) || []) ids.add(id);
      return [...ids].map((id) => segments.get(id));
    },
    registerEncounter(segment, time) {
      if (!segments.has(segment.id)) return;
      segment.lastEncounter = time;
      segment.encounters++;
      const trace = traces.get(segment.traceId);
      trace.resonance.count++;
      trace.resonance.lastAt = time;
    },
    get traces() {
      return traces;
    },
    get revision() {
      return revision;
    },
    get stats() {
      return {
        traces: traces.size,
        points: [...traces.values()].reduce(
          (sum, trace) => sum + trace.points.length,
          0,
        ),
        segments: segments.size,
        cells: cells.size,
      };
    },
    remove,
    clear() {
      traces.clear();
      segments.clear();
      cells.clear();
      sequence = 0;
      revision++;
    },
  };
}
