/** One pointer paints. Two pointers manipulate; lift both before painting again. */
export function createSculptureGesture({ start, move, end, rotate, depth }) {
  const pointers = new Map();
  let navigating = false,
    last = null;
  function frame() {
    const points = [...pointers.values()];
    if (points.length < 2) return null;
    return {
      x: (points[0].clientX + points[1].clientX) / 2,
      y: (points[0].clientY + points[1].clientY) / 2,
      d: Math.hypot(
        points[0].clientX - points[1].clientX,
        points[0].clientY - points[1].clientY,
      ),
    };
  }
  return {
    down(e) {
      pointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
      if (pointers.size > 1 || e.button === 2) {
        end();
        navigating = true;
        last = frame() || { x: e.clientX, y: e.clientY, d: 0 };
      } else if (!navigating) start(e);
    },
    move(e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
      if (navigating) {
        if (pointers.size === 1 && e.buttons !== 2) return;
        const next = frame() || { x: e.clientX, y: e.clientY, d: 0 };
        if (last) {
          rotate(next.x - last.x, next.y - last.y);
          if (next.d > 10 && last.d > 10) depth(Math.log(next.d / last.d) * 12);
        }
        last = next;
      } else move(e);
    },
    up(e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      end();
      last = null;
      if (!pointers.size) navigating = false;
    },
    clear() {
      pointers.clear();
      navigating = false;
      last = null;
      end();
    },
  };
}
