import { Vector3, Quaternion } from "three";
/** One reversible state, independent of rendering and audio. */
export function createContemplationState() {
  let mode = "FLIGHT",
    fragment = null,
    brush = null;
  const position = new Vector3(),
    orientation = new Quaternion();
  return {
    get active() {
      return mode === "CONTEMPLATION";
    },
    get mode() {
      return mode;
    },
    get fragment() {
      return fragment;
    },
    get brush() {
      return brush;
    },
    position,
    orientation,
    enter(next, selectedBrush, point, rotation) {
      if (mode !== "FLIGHT") return false;
      fragment = next;
      brush = selectedBrush;
      position.copy(point);
      orientation.copy(rotation);
      mode = "CONTEMPLATION";
      return true;
    },
    leave() {
      if (mode !== "CONTEMPLATION") return false;
      mode = "FLIGHT";
      return true;
    },
    reset() {
      mode = "FLIGHT";
      fragment = brush = null;
    },
  };
}
