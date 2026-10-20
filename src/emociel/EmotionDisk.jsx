import { useEffect, useRef } from "react";
import {
  createDiskPainter,
  drawEmotionLife,
  DISK_SIZE,
} from "./emotionPainting.js";
export function EmotionDisk({ strokes, tool, onStroke, onSource, active }) {
  const canvas = useRef(null),
    state = useRef({ strokes, tool, onStroke, onSource, active }),
    owner = useRef(null);
  state.current = { strokes, tool, onStroke, onSource, active };
  useEffect(() => {
    const painter = createDiskPainter(),
      preview = createDiskPainter(),
      el = canvas.current,
      ctx = el.getContext("2d");
    owner.current = { painter, document: [] };
    let held = null,
      frame = 0,
      last = 0;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    function point(e) {
      const r = el.getBoundingClientRect(),
        x = (e.clientX - r.left) / r.width,
        y = (e.clientY - r.top) / r.height,
        dx = x - 0.5,
        dy = y - 0.5,
        radius = Math.hypot(dx, dy);
      return radius > 0.496
        ? { x: 0.5 + (dx / radius) * 0.496, y: 0.5 + (dy / radius) * 0.496 }
        : { x, y };
    }
    function down(e) {
      if (!e.isPrimary || e.button > 0 || held || !state.current.active) return;
      const r = el.getBoundingClientRect(),
        p = {
          x: (e.clientX - r.left) / r.width,
          y: (e.clientY - r.top) / r.height,
        };
      if (Math.hypot(p.x - 0.5, p.y - 0.5) > 0.5) return;
      el.setPointerCapture(e.pointerId);
      held = {
        pointer: e.pointerId,
        stroke: { ...state.current.tool, points: [point(e)] },
      };
      preview.setDocument([held.stroke]);
      draw(performance.now());
    }
    function move(e) {
      if (held?.pointer !== e.pointerId) return;
      const p = point(e),
        previous = held.stroke.points.at(-1);
      if (Math.hypot(p.x - previous.x, p.y - previous.y) < 0.002) return;
      if (held.stroke.points.length >= 512) {
        held.stroke.points = held.stroke.points.filter((_, i) => i % 2 === 0);
      }
      held.stroke.points.push(p);
      preview.setDocument([held.stroke]);
      draw(performance.now());
    }
    function end(e) {
      if (!held || (e && e.pointerId !== held.pointer)) return;
      const s = held.stroke;
      held = null;
      state.current.onStroke(s);
      preview.setDocument([]);
    }
    function draw(now) {
      if (!state.current.active || document.hidden) return;
      ctx.clearRect(0, 0, DISK_SIZE, DISK_SIZE);
      ctx.save();
      ctx.beginPath();
      ctx.arc(DISK_SIZE / 2, DISK_SIZE / 2, DISK_SIZE / 2 - 1, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = "#f8f5ed";
      ctx.fillRect(0, 0, DISK_SIZE, DISK_SIZE);
      ctx.drawImage(painter.canvas, 0, 0);
      if (held) ctx.drawImage(preview.canvas, 0, 0);
      drawEmotionLife(
        ctx,
        held ? [...state.current.strokes, held.stroke] : state.current.strokes,
        reduced.matches ? 0 : now / 1000,
        reduced.matches,
      );
      ctx.restore();
      el.dataset.strokes = String(state.current.strokes.length);
      el.dataset.drawing = String(Boolean(held));
      el.dataset.animationTime = (reduced.matches ? 0 : now / 1000).toFixed(3);
    }
    function tick(now) {
      if (now - last > 32) {
        last = now;
        draw(now);
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
      el.addEventListener(type, end);
    const blur = () => end();
    window.addEventListener("blur", blur);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("blur", blur);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
        el.removeEventListener(type, end);
      painter.dispose();
      preview.dispose();
      owner.current = null;
    };
  }, []);
  useEffect(() => {
    if (!owner.current) return;
    const previous = owner.current.document;
    if (
      strokes.length === previous.length + 1 &&
      previous.every((s, i) => s === strokes[i])
    )
      owner.current.painter.stroke(strokes.at(-1));
    else owner.current.painter.setDocument(strokes);
    owner.current.document = strokes;
    onSource(owner.current.painter.canvas);
  }, [strokes]);
  return (
    <div className="emotion-disk-wrap" hidden={!active}>
      <canvas
        ref={canvas}
        width={DISK_SIZE}
        height={DISK_SIZE}
        role="img"
        aria-label="Disque de peinture émotionnelle"
      />
    </div>
  );
}
