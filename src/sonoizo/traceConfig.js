// Migration switch: restore the prefabricated strings without changing the engine.
export const ENABLE_TRACE_MEMORY =
  import.meta.env?.VITE_ENABLE_TRACE_MEMORY !== "false";
export const TRACE_DEBUG =
  new URLSearchParams(globalThis.location?.search || "").get("traceDebug") ===
  "1";
export const TRACE_LIMITS = {
  cellSize: 4,
  maxTraces: 80,
  maxPointsPerTrace: 80,
  minSpacing: 0.25,
  maxStep: 12,
};
export const ENCOUNTER_LIMITS = {
  radius: 1.6,
  minAge: 6,
  cooldown: 9,
  segmentCooldown: 30,
};
