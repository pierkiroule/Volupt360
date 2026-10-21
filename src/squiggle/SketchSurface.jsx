import { useEffect, useRef } from "react";
import {
  createObjectPainter,
  OBJECT_SIZE as DISK_SIZE,
} from "./objectMatter.js";

export default function SketchSurface({
  strokes,
  materials,
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
    const painter = createObjectPainter(),
      preview = createObjectPainter(),
      canvas = ref.current,
      ctx = canvas.getContext("2d");

    owner.current = { painter, preview, document: [] };
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
      ctx.fillStyle = "#05070d";
      ctx.fillRect(0, 0, DISK_SIZE, DISK_SIZE);
      painter.draw(time);
      preview.draw(time);
      ctx.drawImage(painter.canvas, 0, 0);
      if (held) ctx.drawImage(preview.canvas, 0, 0);

      ctx.globalCompositeOperation = "source-over";
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
      held.stroke.points = [point(e)];
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
    owner.current?.painter.setMaterials(materials);
    owner.current?.preview.setMaterials(materials);
  }, [materials]);
  useEffect(() => {
    if (!owner.current) return;
    const { painter, document } = owner.current;
    painter.setDocument(strokes);
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
      data-external-materials={Object.keys(materials).length}
      data-material-style="projective-objects"
      role="img"
      aria-label="Canevas de composition d’objets"
    />
  );
}
