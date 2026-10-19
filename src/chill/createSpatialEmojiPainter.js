import * as THREE from "three";
import { createPictorialLandscape } from "./createPictorialLandscape.js";
import {
  createEmojiPainting,
  MAX_PAINT_STROKES,
  MAX_STROKE_POINTS,
} from "./emojiPainting.js";
import { emojiById } from "./sensoryEmojiCatalog.js";

/** The camera's flight deposits a world-anchored brush stream; touch stays navigation. */
export function createSpatialEmojiPainter(canvas, camera, onChange = () => {}) {
  const group = new THREE.Group(),
    paint = createPictorialLandscape(),
    preview = createPictorialLandscape();
  group.add(paint.group, preview.group);
  const tip = new THREE.Vector3(),
    last = new THREE.Vector3(),
    forward = new THREE.Vector3(),
    up = new THREE.Vector3(),
    tangent = new THREE.Vector3(),
    side = new THREE.Vector3();
  const guideGeometry = new THREE.BufferGeometry(),
    guideBuffer = new Float32Array(MAX_STROKE_POINTS * 3);
  guideGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(guideBuffer, 3).setUsage(THREE.DynamicDrawUsage),
  );
  guideGeometry.setDrawRange(0, 0);
  const guide = new THREE.Line(
    guideGeometry,
    new THREE.LineBasicMaterial({
      color: "#286caa",
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  );
  guide.frustumCulled = false;
  group.add(guide);
  let strokes = [],
    active = null,
    enabled = false,
    dirty = false,
    lastBuild = -Infinity,
    time = 0,
    focused = true,
    tool = { emojiId: "water", size: 0.045, opacity: 0.8, depth: 4.5 };
  const listeners = [];
  function listen(target, type, fn) {
    target.addEventListener(type, fn);
    listeners.push(() => target.removeEventListener(type, fn));
  }
  function report() {
    canvas.dataset.spatialStrokes = String(strokes.length);
    canvas.dataset.spatialDrawing = String(enabled);
    canvas.dataset.spatialSamples = String(active?.points.length || 0);
    onChange({ strokes: strokes.length, bounds: paint.bounds });
  }
  function getDocument() {
    return createEmojiPainting(strokes);
  }
  function commit() {
    if (!active) return;
    strokes.push(active);
    active = null;
    dirty = false;
    guideGeometry.setDrawRange(0, 0);
    preview.clear();
    paint.setDocument(getDocument());
    report();
  }
  function deposit() {
    if (strokes.length >= MAX_PAINT_STROKES) return;
    camera.updateMatrixWorld();
    camera.getWorldDirection(forward);
    tip.copy(camera.position).addScaledVector(forward, tool.depth);
    if (active && tip.distanceToSquared(last) < 0.0064) return;
    if (active && tip.distanceTo(last) > tool.depth * 1.5) commit(); // never bridge a camera reset
    if (active?.points.length >= MAX_STROKE_POINTS) commit();
    if (strokes.length >= MAX_PAINT_STROKES) return;
    up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    if (active) tangent.subVectors(tip, last).normalize();
    else tangent.copy(forward);
    side.crossVectors(tangent, up);
    if (side.lengthSq() < 0.01)
      side.set(1, 0, 0).applyQuaternion(camera.quaternion);
    side.normalize();
    up.crossVectors(side, tangent).normalize();
    const t = active
      ? active.points.at(-1).x + last.distanceTo(tip) / active.frame.scale
      : 0;
    const sample = {
      t,
      point: tip.toArray(),
      up: up.toArray(),
      direction: tangent.toArray(),
    };
    if (!active) {
      active = {
        ...tool,
        points: [{ x: t, y: 0 }],
        frame: { scale: tool.depth * 1.5, spine: [sample] },
      };
      guide.material.color.set(emojiById(tool.emojiId).color);
      guide.material.opacity = tool.opacity * 0.65;
    } else
      active = {
        ...active,
        points: [...active.points, { x: t, y: 0 }],
        frame: { ...active.frame, spine: [...active.frame.spine, sample] },
      };
    last.copy(tip);
    guideBuffer.set(tip.toArray(), (active.points.length - 1) * 3);
    guideGeometry.setDrawRange(0, active.points.length);
    guideGeometry.attributes.position.needsUpdate = true;
    dirty = true;
    canvas.dataset.spatialSamples = String(active.points.length);
  }
  listen(window, "blur", () => {
    focused = false;
    commit();
  });
  listen(window, "focus", () => {
    focused = true;
  });
  listen(document, "visibilitychange", () => {
    if (document.hidden) commit();
  });
  return {
    group,
    bounds: paint.bounds,
    get count() {
      return strokes.length + (active ? 1 : 0);
    },
    setTool(value) {
      commit();
      enabled = Boolean(value);
      if (value) tool = { ...tool, ...value };
      canvas.dataset.spatialTool = enabled ? tool.emojiId : "navigate";
      report();
    },
    update(clock, audio, dt) {
      time = clock;
      if (enabled && focused && !documentHidden() && dt > 0) deposit();
      if (dirty && time - lastBuild >= 1 / 20) {
        preview.setDocument(createEmojiPainting([active]));
        dirty = false;
        lastBuild = time;
      }
      paint.update(time, audio, dt);
      preview.update(time, audio, dt);
    },
    undo() {
      commit();
      strokes.pop();
      paint.setDocument(getDocument());
      report();
    },
    clear() {
      active = null;
      strokes = [];
      dirty = false;
      paint.clear();
      preview.clear();
      guideGeometry.setDrawRange(0, 0);
      report();
    },
    getDocument,
    dispose() {
      active = null;
      for (const remove of listeners) remove();
      paint.dispose();
      preview.dispose();
      guideGeometry.dispose();
      guide.material.dispose();
      group.clear();
    },
  };
}
function documentHidden() {
  return globalThis.document.hidden;
}
