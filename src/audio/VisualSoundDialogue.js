const clamp = (x, min = 0, max = 1) => Math.min(max, Math.max(min, x));

// Geometry only: avoids amplifying the audio→visual→audio energy feedback loop.
export function createVisualSoundDialogue() {
  const traces = new Map();
  let brightness = 0.45,
    curvature = 0,
    speed = 0,
    spread = 0;
  return {
    record(key, point, time) {
      let trace = traces.get(key);
      if (!trace) {
        if (traces.size >= 80) traces.delete(traces.keys().next().value);
        trace = { point: { ...point }, direction: null, time };
        traces.set(key, trace);
      }
      const dx = point.x - trace.point.x,
        dy = point.y - trace.point.y,
        dz = point.z - trace.point.z;
      const length = Math.hypot(dx, dy, dz),
        dt = time - trace.time;
      if (length > 0.02 && length < 12 && dt > 0) {
        const direction = { x: dx / length, y: dy / length, z: dz / length };
        const turn = trace.direction
          ? clamp(
              (1 -
                (direction.x * trace.direction.x +
                  direction.y * trace.direction.y +
                  direction.z * trace.direction.z)) *
                2,
            )
          : 0;
        curvature += (turn - curvature) * 0.18;
        speed += (clamp(length / dt / 18) - speed) * 0.12;
        trace.direction = direction;
      }
      brightness += (clamp((point.y + 24) / 48) - brightness) * 0.08;
      spread += (clamp(Math.hypot(point.x, point.z) / 45) - spread) * 0.08;
      trace.point = { ...point };
      trace.time = time;
    },
    forget(key) {
      traces.delete(key);
      if (!traces.size) {
        brightness = 0.45;
        curvature = speed = spread = 0;
      }
    },
    get state() {
      return {
        brightness,
        curvature,
        speed,
        spread,
        density: clamp(traces.size / 24),
        traces: traces.size,
      };
    },
    clear() {
      traces.clear();
    },
  };
}
