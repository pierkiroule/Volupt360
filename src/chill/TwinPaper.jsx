import { useEffect, useRef } from "react";
import {
  createEmojiPainting,
  MAX_STROKE_POINTS,
  MAX_PAINT_STROKES,
} from "./emojiPainting.js";
import { createBrushPigments } from "./createBrushPigments.js";
import { pointToPaper } from "./twinProjection.js";

/** Full-screen animated paper, viewing and editing the very same spatial document. */
export function TwinPaper({
  visible,
  document: painting,
  tool,
  onStroke,
  getResonance,
  onGesture,
}) {
  const canvas = useRef(null),
    pigmentCache = useRef(null),
    state = useRef({ painting, tool, onStroke, getResonance, onGesture });
  state.current = { painting, tool, onStroke, getResonance, onGesture };
  useEffect(
    () => () => {
      pigmentCache.current?.dispose();
      pigmentCache.current = null;
    },
    [],
  );
  useEffect(() => {
    if (!visible) return;
    const el = canvas.current,
      ctx = el.getContext("2d", { alpha: false }),
      pigments =
        pigmentCache.current || (pigmentCache.current = createBrushPigments()),
      prepared = new WeakMap();
    let frame = 0,
      previous = 0,
      lastDraw = 0,
      active = null,
      lastDocument = null,
      doc = null;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    function resize() {
      const r = el.getBoundingClientRect(),
        dpr = Math.min(devicePixelRatio || 1, 2),
        scale = Math.min(1, 1600 / Math.max(r.width * dpr, r.height * dpr));
      el.width = Math.round(r.width * dpr * scale);
      el.height = Math.round(r.height * dpr * scale);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    function point(e) {
      const r = el.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) / r.width - 0.5,
        y: (e.clientY - r.top) / r.height - 0.5,
      };
    }
    function down(e) {
      if (
        !e.isPrimary ||
        e.button > 0 ||
        active ||
        state.current.painting.strokes.length >= MAX_PAINT_STROKES
      )
        return;
      el.setPointerCapture(e.pointerId);
      active = {
        id: e.pointerId,
        stroke: {
          ...state.current.tool,
          phase: state.current.painting.strokes.length * 0.618,
          points: [point(e)],
        },
      };
      lastDocument = null;
      state.current.onGesture?.("down", e);
      draw(performance.now());
    }
    function move(e) {
      if (active?.id !== e.pointerId) return;
      const p = point(e),
        last = active.stroke.points.at(-1);
      if (Math.hypot(p.x - last.x, p.y - last.y) < 0.0015) return;
      let points = active.stroke.points;
      if (points.length >= MAX_STROKE_POINTS)
        points = points.filter(
          (_, i) => i % 2 === 0 || i === points.length - 1,
        );
      active.stroke = { ...active.stroke, points: [...points, p] };
      lastDocument = null;
    }
    function finish(e) {
      if (!active || (e && e.pointerId !== active.id)) return;
      const gesture = active;
      active = null;
      state.current.onStroke(gesture.stroke);
      lastDocument = null;
      state.current.onGesture?.("up", e || { pointerId: gesture.id });
      if (el.hasPointerCapture(gesture.id))
        el.releasePointerCapture(gesture.id);
    }
    function prepare(path) {
      if (prepared.has(path)) return prepared.get(path);
      let previousX = null;
      const points = path.points.map((p, i) => {
        const v = pointToPaper(p, path.frame);
        let x = v.x;
        if (previousX !== null) x += Math.round(previousX - x);
        previousX = x;
        const previous = path.points[Math.max(0, i - 1)],
          next = path.points[Math.min(path.points.length - 1, i + 1)],
          dx = next.x - previous.x,
          dy = next.y - previous.y,
          len = Math.hypot(dx, dy) || 1,
          r = path.width * (path.radii?.[i] ?? 1) * 0.75;
        const edge = pointToPaper(
          { x: p.x - (dy / len) * r, y: p.y + (dx / len) * r },
          path.frame,
        );
        let ox = edge.x - v.x;
        ox -= Math.round(ox);
        return { x, y: v.y, r: path.radii?.[i] ?? 1, ox, oy: edge.y - v.y };
      });
      const anchors = [];
      let walked = 0,
        next = 0;
      const spacing = Math.max(0.025, path.width * 0.85);
      for (let i = 0; i < points.length && anchors.length < 24; i++) {
        if (i)
          walked += Math.hypot(
            points[i].x - points[i - 1].x,
            points[i].y - points[i - 1].y,
          );
        if (walked >= next) {
          anchors.push(points[i]);
          next = walked + spacing;
        }
      }
      const value = {
        anchors,
        points,
        min: Math.min(...points.map((p) => p.x)),
        max: Math.max(...points.map((p) => p.x)),
        maps: pigments.get(path.emojiId),
        patterns: pigments
          .get(path.emojiId)
          .map((map) => ctx.createPattern(map, "repeat")),
      };
      prepared.set(path, value);
      return value;
    }
    function draw(now) {
      const dt = previous ? Math.min(0.1, (now - previous) / 1000) : 0;
      previous = now;
      const resonance = state.current.getResonance(dt),
        time = reduced.matches ? 0 : resonance.time,
        bands = reduced.matches ? [0, 0, 0, 0, 0, 0] : resonance.bands;
      if (lastDocument !== state.current.painting || active) {
        doc = createEmojiPainting(
          active
            ? [...state.current.painting.strokes, active.stroke]
            : state.current.painting.strokes,
        );
        lastDocument = state.current.painting;
      }
      const w = el.width,
        h = el.height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#f6f2e9";
      ctx.fillRect(0, 0, w, h);
      ctx.setTransform(w, 0, 0, h, w / 2, h / 2);
      ctx.lineCap = ctx.lineJoin = "round";
      const stride = Math.max(
        1,
        Math.ceil(doc.paths.reduce((n, p) => n + p.points.length, 0) / 14000),
      );
      for (const path of doc.paths) {
        const data = prepare(path),
          e = bands[path.band] || 0,
          points = data.points,
          phase = path.phase || 0;
        for (
          let copy = Math.floor(-0.5 - data.max);
          copy <= Math.ceil(0.5 - data.min);
          copy++
        ) {
          if (data.max + copy < -0.5 || data.min + copy > 0.5) continue;
          ctx.fillStyle = ctx.strokeStyle = path.color;
          ctx.globalAlpha = path.opacity * 0.7;
          const inflate = (p) =>
            1 +
            (0.025 + e * 0.19) *
              (Math.sin(p.x * 12 + p.y * 7 - time * 0.36 + phase) * 0.65 +
                Math.sin(p.x * 27 - p.y * 13 + time * 0.21 + phase * 1.7) *
                  0.35);
          ctx.beginPath();
          for (let i = 0; i < points.length; i += stride) {
            const p = points[i],
              s = inflate(p);
            if (i) ctx.lineTo(p.x + copy + p.ox * s, p.y + p.oy * s);
            else ctx.moveTo(p.x + copy + p.ox * s, p.y + p.oy * s);
          }
          for (let i = points.length - 1; i >= 0; i -= stride) {
            const p = points[i],
              s = inflate(p);
            ctx.lineTo(p.x + copy - p.ox * s, p.y - p.oy * s);
          }
          ctx.closePath();
          ctx.fill();
          if (path.primary) {
            // Texture is confined to the connected wash, never a row of round stamps.
            ctx.save();
            ctx.clip();
            const scale = Math.max(0.09, path.width * 5) / 256;
            for (let plate = 0; plate < 2; plate++) {
              const pattern = data.patterns[plate];
              pattern.setTransform(
                new DOMMatrix()
                  .translate(copy + phase * 0.037, phase * 0.019)
                  .scale(scale * (plate ? 0.63 : 1)),
              );
              ctx.fillStyle = pattern;
              ctx.globalAlpha = path.opacity * (plate ? 0.72 : 0.85);
              ctx.fillRect(-0.5, -0.5, 1, 1);
            }
            ctx.restore();
          }
          // Fine, slightly imperfect ink remains crisp among the transparent washes.
          if (path.width < 0.004) {
            ctx.globalAlpha = path.opacity;
            ctx.lineWidth = path.width;
            ctx.beginPath();
            for (let i = 0; i < points.length; i += stride) {
              const p = points[i],
                drift =
                  Math.sin(p.x * 12 + p.y * 7 - time * 0.48 + phase) *
                  0.0008 *
                  (0.3 + e);
              if (i) ctx.lineTo(p.x + copy, p.y + drift);
              else ctx.moveTo(p.x + copy, p.y + drift);
            }
            ctx.stroke();
          }
          if (path.primary) {
            for (let i = 0; i < data.anchors.length; i++) {
              const p = data.anchors[i],
                jitter = 0.8 + 0.22 * Math.sin(p.x * 133 + p.y * 97 + phase),
                s = path.width * (1.5 + e * 0.3) * (p.r || 1) * jitter,
                pool = 0.5 + 0.5 * Math.sin(p.x * 12 - time * 0.32 + phase);
              ctx.save();
              ctx.translate(p.x + copy, p.y);
              ctx.rotate(Math.sin(i * 2.399 + phase) * 0.6);
              ctx.globalAlpha = path.opacity * (0.15 + pool * 0.07);
              ctx.drawImage(data.maps[0], -s / 2, -s / 2, s, s);
              ctx.globalAlpha = path.opacity * 0.3;
              ctx.drawImage(
                data.maps[1],
                -s * 0.35,
                -s * 0.35,
                s * 0.7,
                s * 0.7,
              );
              ctx.restore();
            }
          }
        }
      }
      ctx.globalAlpha = 0.5;
      for (const dot of doc.dots) {
        const p = pointToPaper(dot, dot.frame),
          e = bands[dot.band] || 0;
        ctx.fillStyle = dot.color;
        ctx.globalAlpha =
          (dot.opacity ?? 0.5) *
          (0.8 + 0.2 * Math.sin(time * 0.28 + dot.phase));
        ctx.beginPath();
        ctx.ellipse(
          p.x,
          p.y,
          dot.size * (1 + e * 0.2),
          dot.size * (1 + e * 0.2),
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      el.dataset.strokeCount = String(
        state.current.painting.strokes.length + (active ? 1 : 0),
      );
      el.dataset.animationTime = time.toFixed(3);
      el.dataset.paperEnergy = Math.max(...bands).toFixed(4);
    }
    function tick(now) {
      if (!document.hidden && now - lastDraw >= 32) {
        draw(now);
        lastDraw = now;
      }
      frame = requestAnimationFrame(tick);
    }
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
      el.addEventListener(type, finish);
    const blur = () => finish();
    window.addEventListener("blur", blur);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      finish();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
        el.removeEventListener(type, finish);
      window.removeEventListener("blur", blur);
    };
  }, [visible]);
  return (
    <canvas
      ref={canvas}
      hidden={!visible}
      className="twin-paper"
      role="img"
      aria-label="Canevas aquarelle 2D plein écran"
    />
  );
}
