import { useEffect, useRef } from "react";
import {
  createDiskPainter,
  drawEmotionLife,
  DISK_SIZE,
} from "../emociel/emotionPainting.js";
import { drawAccents } from "./drawAccents.js";
export default function SketchSurface({
  strokes,
  tool,
  active,
  paused,
  onStroke,
  onErase,
  onSource,
  onCapture,
}) {
  const ref = useRef(null),
    live = useRef({ strokes, tool, active, paused, onStroke, onErase });
  live.current = { strokes, tool, active, paused, onStroke, onErase };
  const owner = useRef(null);
  useEffect(() => {
    const painter = createDiskPainter({ clip: false }),
      preview = createDiskPainter({ clip: false }),
      canvas = ref.current,
      ctx = canvas.getContext("2d");
    owner.current = { painter, document: [] };
    let held = null,
      frame = 0,
      last = 0,
      time = 0;
    const point = (e) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
        y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
      };
    };
    const draw = () => {
      if (!live.current.active) return;
      ctx.fillStyle = "#faf7ef";
      ctx.fillRect(0, 0, DISK_SIZE, DISK_SIZE);
      ctx.drawImage(painter.canvas, 0, 0);
      if (held) ctx.drawImage(preview.canvas, 0, 0);
      drawAccents(
        ctx,
        held ? [...live.current.strokes, held.stroke] : live.current.strokes,
        time,
      );
      drawEmotionLife(
        ctx,
        held ? [...live.current.strokes, held.stroke] : live.current.strokes,
        time,
      );
      canvas.dataset.strokes = String(live.current.strokes.length);
      canvas.dataset.animationTime = time.toFixed(3);
    };
    const down = (e) => {
      if (!e.isPrimary || e.button > 0 || held || !live.current.active) return;
      if (live.current.tool.erase) {
        live.current.onErase(point(e));
        return;
      }
      canvas.setPointerCapture(e.pointerId);
      held = {
        pointer: e.pointerId,
        stroke: { ...live.current.tool, points: [point(e)] },
      };
      preview.setDocument([held.stroke]);
      draw();
    };
    const move = (e) => {
      if (held?.pointer !== e.pointerId) return;
      for (const sample of e.getCoalescedEvents?.().length
        ? e.getCoalescedEvents()
        : [e]) {
        const p = point(sample),
          previous = held.stroke.points.at(-1);
        if (Math.hypot(p.x - previous.x, p.y - previous.y) < 0.0015) continue;
        if (held.stroke.points.length >= 512)
          held.stroke.points = held.stroke.points.filter((_, i) => i % 2 === 0);
        held.stroke.points.push(p);
      }
      preview.setDocument([held.stroke]);
      draw();
    };
    const end = (e) => {
      if (!held || (e && held.pointer !== e.pointerId)) return;
      const stroke = held.stroke;
      held = null;
      preview.setDocument([]);
      live.current.onStroke(stroke);
    };
    const tick = (now) => {
      if (!last) last = now;
      const dt = Math.min(0.1, (now - last) / 1000);
      if (now - last > 32) {
        last = now;
        if (!live.current.paused && !document.hidden) time += dt;
        draw();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const block = (e) => e.preventDefault();
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    for (const key of ["pointerup", "pointercancel", "lostpointercapture"])
      canvas.addEventListener(key, end);
    canvas.addEventListener("contextmenu", block);
    const blur = () => end();
    window.addEventListener("blur", blur);
    onCapture(
      () =>
        new Promise((resolve, reject) => {
          draw();
          canvas.toBlob((blob) =>
            blob ? resolve(blob) : reject(Error("Capture indisponible.")),
          );
        }),
    );
    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      for (const key of ["pointerup", "pointercancel", "lostpointercapture"])
        canvas.removeEventListener(key, end);
      canvas.removeEventListener("contextmenu", block);
      window.removeEventListener("blur", blur);
      painter.dispose();
      preview.dispose();
      owner.current = null;
    };
  }, []);
  useEffect(() => {
    if (!owner.current) return;
    const { painter, document } = owner.current;
    if (
      strokes.length === document.length + 1 &&
      document.every((s, i) => s === strokes[i])
    )
      painter.stroke(strokes.at(-1));
    else painter.setDocument(strokes);
    owner.current.document = strokes;
    onSource({ canvas: painter.canvas, revision: strokes });
  }, [strokes]);
  return (
    <canvas
      className="squiggle-paper"
      ref={ref}
      width={DISK_SIZE}
      height={DISK_SIZE}
      hidden={!active}
      role="img"
      aria-label="Feuille de dessin animée"
    />
  );
}
