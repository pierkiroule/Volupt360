/** Shared projection: fixed planes for imported art, sampled world spines for live flight. */
export function spatialBrushPoint(point, frame) {
  if (frame.spine) {
    const spine = frame.spine;
    let lo = 0,
      hi = spine.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (spine[mid].t < point.x) lo = mid + 1;
      else hi = mid;
    }
    const b = spine[lo],
      a = spine[Math.max(0, lo - 1)],
      span = b.t - a.t;
    const u = span ? Math.max(0, Math.min(1, (point.x - a.t) / span)) : 0;
    const extra =
      point.x < spine[0].t
        ? point.x - spine[0].t
        : point.x > spine.at(-1).t
          ? point.x - spine.at(-1).t
          : 0;
    return a.point.map(
      (v, i) =>
        v +
        (b.point[i] - v) * u -
        (a.up[i] + (b.up[i] - a.up[i]) * u) * point.y * frame.scale +
        b.direction[i] * extra * frame.scale,
    );
  }
  return frame.origin.map(
    (value, i) =>
      value +
      frame.right[i] * point.x * frame.scale -
      frame.up[i] * point.y * frame.scale,
  );
}
