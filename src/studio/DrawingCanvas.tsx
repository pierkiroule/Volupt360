import { useEffect, useRef } from "react";
import { type Project, type Stroke } from "./model";
import { DrawingEngine, type DrawingTool } from "./DrawingEngine";
import { Renderer2D, drawStroke } from "./Renderer2D";
import { type AnimationTimeline } from "./AnimationTimeline";
export function DrawingCanvas({
  project,
  tool,
  mode,
  timeline,
  original,
  quality,
  onStroke,
  onPath,
  onGesture,
  canvasRef,
}: {
  project: Project;
  tool: DrawingTool;
  mode: "draw" | "effect" | "erase" | "view";
  timeline: AnimationTimeline;
  original: boolean;
  quality: boolean;
  onStroke: (s: Stroke) => void;
  onPath: (p: { x: number; y: number }[]) => void;
  onGesture: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}) {
  const latest = useRef({
    project,
    tool,
    mode,
    original,
    onStroke,
    onPath,
    onGesture,
    quality,
  });
  latest.current = {
    project,
    tool,
    mode,
    original,
    onStroke,
    onPath,
    onGesture,
    quality,
  };
  useEffect(() => {
    const canvas = canvasRef.current!,
      ctx = canvas.getContext("2d")!,
      renderer = new Renderer2D(),
      engine = new DrawingEngine();
    let frame = 0,
      held: number | null = null,
      path: { x: number; y: number }[] = [],
      pointers = new Map<number, { x: number; y: number }>(),
      zoom = 1,
      panX = 0,
      panY = 0,
      pinch: number | null = null,
      previous: { x: number; y: number } | null = null;
    let w = 1,
      h = 1,
      ratio = 1,
      scale = 1,
      offsetX = 0,
      offsetY = 0;
    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      ratio = Math.min(devicePixelRatio || 1, latest.current.quality ? 1 : 1.7);
      canvas.width = Math.round(w * ratio);
      canvas.height = Math.round(h * ratio);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    const layout = () => {
      scale = Math.min(w / 1200, h / 900) * zoom;
      offsetX = (w - 1200 * scale) / 2 + panX;
      offsetY = (h - 900 * scale) / 2 + panY;
    };
    const point = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - r.left - offsetX) / scale / 1200,
        y: (e.clientY - r.top - offsetY) / scale / 900,
      };
    };
    const finish = (commit = true) => {
      if (held === null) return;
      held = null;
      const s = engine.finish();
      if (commit) {
        if (latest.current.mode === "draw" && s?.points.length)
          latest.current.onStroke(s);
        else if (path.length) latest.current.onPath(path);
      }
      path = [];
    };
    const down = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      canvas.setPointerCapture(e.pointerId);
      if (pointers.size > 1) {
        finish(false);
        pinch = null;
        return;
      }
      latest.current.onGesture();
      if (e.button > 0) return;
      layout();
      const p = point(e);
      if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) return;
      held = e.pointerId;
      previous = { x: e.clientX, y: e.clientY };
      path = [p];
      if (latest.current.mode === "draw")
        engine.begin(p, e, latest.current.tool);
    };
    const move = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size > 1 && latest.current.mode === "view") {
        const list = [...pointers.values()],
          dist = Math.hypot(list[0].x - list[1].x, list[0].y - list[1].y);
        if (pinch) zoom = Math.max(0.6, Math.min(4, (zoom * dist) / pinch));
        pinch = dist;
        return;
      }
      if (held !== e.pointerId || pointers.size > 1) return;
      if (latest.current.mode === "view") {
        if (previous) {
          panX += e.clientX - previous.x;
          panY += e.clientY - previous.y;
        }
        previous = { x: e.clientX, y: e.clientY };
        return;
      }
      for (const event of e.getCoalescedEvents?.().length
        ? e.getCoalescedEvents()
        : [e]) {
        const p = point(event);
        if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) continue;
        if (latest.current.mode === "draw") {
          engine.append(p, event);
          if (engine.stroke && engine.stroke.points.length >= 1800) {
            const completed = engine.finish();
            if (completed) latest.current.onStroke(completed);
            engine.begin(p, event, latest.current.tool);
          }
          latest.current.onGesture();
        } else if (
          path.length < 400 &&
          Math.hypot(p.x - path.at(-1)!.x, p.y - path.at(-1)!.y) > 0.004
        )
          path.push(p);
      }
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (held === e.pointerId) finish(e.type !== "pointercancel");
      pinch = null;
    };
    const wheel = (e: WheelEvent) => {
      if (latest.current.mode !== "view") return;
      e.preventDefault();
      zoom = Math.max(0.6, Math.min(4, zoom * Math.exp(-e.deltaY * 0.001)));
    };
    const blur = () => {
      finish(true);
      pointers.clear();
    };
    let previousProject: Project | null = null,
      previousOriginal = false,
      previousDraft = -1,
      previousPath = -1,
      previousZoom = 0,
      previousPanX = 0,
      previousPanY = 0,
      previousWidth = 0,
      previousHeight = 0;
    const tick = (now: number) => {
      const time = timeline.tick(now);
      const wanted = Math.min(
        devicePixelRatio || 1,
        latest.current.quality ? 1 : 1.7,
      );
      if (wanted !== ratio) resize();
      layout();
      canvas.dataset.time = time.toFixed(3);
      const draftCount = engine.stroke?.points.length || 0;
      const animated =
        !latest.current.original &&
        timeline.running &&
        latest.current.project.effects.some(
          (e) =>
            e.enabled && (!e.duration || time <= e.referenceTime + e.duration),
        );
      const changed =
        previousProject !== latest.current.project ||
        previousOriginal !== latest.current.original ||
        previousDraft !== draftCount ||
        previousPath !== path.length ||
        previousZoom !== zoom ||
        previousPanX !== panX ||
        previousPanY !== panY ||
        previousWidth !== canvas.width ||
        previousHeight !== canvas.height;
      if (!animated && !changed) {
        frame = requestAnimationFrame(tick);
        return;
      }
      previousProject = latest.current.project;
      previousOriginal = latest.current.original;
      previousDraft = draftCount;
      previousPath = path.length;
      previousZoom = zoom;
      previousPanX = panX;
      previousPanY = panY;
      previousWidth = canvas.width;
      previousHeight = canvas.height;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = latest.current.project.background;
      ctx.fillRect(0, 0, w, h);
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, 1200, 900);
      ctx.clip();
      renderer.render(
        ctx,
        latest.current.project,
        time,
        latest.current.original,
      );
      if (engine.stroke)
        drawStroke(ctx, {
          ...engine.stroke,
          points: [...engine.stroke.points],
        });
      if (
        path.length &&
        latest.current.mode !== "draw" &&
        latest.current.mode !== "view"
      ) {
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = "#678780";
        ctx.lineWidth = 2 / scale;
        ctx.setLineDash([6 / scale, 5 / scale]);
        ctx.beginPath();
        path.forEach((p, i) =>
          i
            ? ctx.lineTo(p.x * 1200, p.y * 900)
            : ctx.moveTo(p.x * 1200, p.y * 900),
        );
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      canvas.dataset.strokes = String(latest.current.project.strokes.length);
      canvas.dataset.time = time.toFixed(3);
      canvas.dataset.ready = "true";
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("blur", blur);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.dispose();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("wheel", wheel);
      window.removeEventListener("blur", blur);
    };
  }, [canvasRef, timeline]);
  return (
    <canvas
      className="studio-drawing"
      ref={canvasRef}
      aria-label={
        mode === "effect"
          ? "Peindre des animations locales"
          : mode === "view"
            ? "Tableau vivant : déplacer et pincer pour zoomer"
            : "Canevas de dessin"
      }
    />
  );
}
