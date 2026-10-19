import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { createEmojiAnimation } from "./createEmojiAnimation.js";
import { SENSORY_EMOJIS } from "./sensoryEmojiCatalog.js";
import {
  createEmojiPainting,
  MAX_PAINT_STROKES,
  MAX_STROKE_POINTS,
} from "./emojiPainting.js";

// Activate touch controls on release: Android can suppress the compatibility click
// immediately after a captured drawing gesture. Keyboard activation stays native.
function PaintButton({ onClick, ...props }) {
  const touch = useRef(-Infinity);
  return (
    <button
      {...props}
      onPointerUp={(e) => {
        if (e.pointerType === "touch" && !props.disabled) {
          touch.current = performance.now();
          onClick?.(e);
        }
      }}
      onClick={(e) => {
        if (e.detail === 0 || performance.now() - touch.current > 600)
          onClick?.(e);
      }}
    />
  );
}

export const EmojiPainter = forwardRef(function EmojiPainter(
  { visible, onChange, onReveal, busy },
  ref,
) {
  const [strokes, setStrokes] = useState([]),
    [active, setActive] = useState("water"),
    [size, setSize] = useState(0.045),
    [opacity, setOpacity] = useState(0.8);
  const current = useRef(strokes),
    drag = useRef(null),
    surface = useRef(null),
    animationCanvas = useRef(null),
    animation = useRef(null),
    id = useId().replace(/:/g, "");
  const doc = useMemo(() => createEmojiPainting(strokes), [strokes]);
  const documentRef = useRef(doc);
  documentRef.current = doc;
  current.current = strokes;
  useImperativeHandle(
    ref,
    () => ({
      getDocument: () => documentRef.current,
      clear: () => {
        drag.current = null;
        setStrokes([]);
      },
    }),
    [],
  );
  useEffect(() => onChange(strokes.length), [strokes.length, onChange]);
  useEffect(() => {
    if (!visible) drag.current = null;
  }, [visible]);
  useEffect(() => {
    const painter = createEmojiAnimation(animationCanvas.current);
    animation.current = painter;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) painter.resize(entry.contentRect.width);
    });
    observer.observe(surface.current);
    return () => {
      observer.disconnect();
      painter.dispose();
      animation.current = null;
    };
  }, []);
  useEffect(() => {
    animation.current?.setDocument(doc);
  }, [doc]);
  useEffect(() => {
    if (visible) animation.current?.start();
    else animation.current?.stop();
  }, [visible]);
  function point(event) {
    const r = surface.current.getBoundingClientRect();
    let x = (event.clientX - r.left) / r.width - 0.5,
      y = (event.clientY - r.top) / r.height - 0.5;
    const length = Math.hypot(x, y),
      limit = 0.48 - size * 0.7;
    if (length > limit) {
      x *= limit / length;
      y *= limit / length;
    }
    return { x, y };
  }
  function down(e) {
    if (
      e.button !== 0 ||
      drag.current ||
      current.current.length >= MAX_PAINT_STROKES
    )
      return;
    surface.current.setPointerCapture(e.pointerId);
    const stroke = { emojiId: active, size, opacity, points: [point(e)] };
    drag.current = { pointer: e.pointerId, stroke, base: current.current };
    setStrokes([...current.current, stroke]);
  }
  function move(e) {
    const d = drag.current;
    if (!d || d.pointer !== e.pointerId) return;
    const p = point(e),
      points = d.stroke.points,
      last = points.at(-1);
    if (Math.hypot(p.x - last.x, p.y - last.y) < 0.002) return;
    // Retain continuous geometry on long gestures by progressively simplifying the path.
    if (points.length >= MAX_STROKE_POINTS) {
      d.stroke = {
        ...d.stroke,
        points: points.filter((_, i) => i % 2 === 0 || i === points.length - 1),
      };
    }
    d.stroke = { ...d.stroke, points: [...d.stroke.points, p] };
    setStrokes([...d.base, d.stroke]);
  }
  function up(e) {
    if (drag.current?.pointer === e.pointerId) {
      drag.current = null;
      if (surface.current.hasPointerCapture(e.pointerId))
        surface.current.releasePointerCapture(e.pointerId);
    }
  }
  return (
    <section
      className="emoji-painter"
      hidden={!visible}
      aria-label="Atelier de dessin"
    >
      <header>
        <span className="chill-eyebrow">Tracer · Ressentir · Voyager</span>
        <h1>Peins ton ciel</h1>
        <p>
          Une vague, un souffle, une étincelle… chaque émoji devient une
          matière.
        </p>
      </header>
      <div
        className="emoji-paper"
        ref={surface}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onLostPointerCapture={up}
      >
        <svg
          viewBox="-.5 -.5 1 1"
          role="img"
          aria-label="Disque de dessin"
          data-strokes={strokes.length}
        >
          <defs>
            <clipPath id={`${id}-clip`}>
              <circle r=".5" />
            </clipPath>
            <filter
              id={`${id}-grain`}
              x="-10%"
              y="-10%"
              width="120%"
              height="120%"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="145"
                numOctaves="2"
                seed="17"
                result="noise"
              />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale=".0018" />
            </filter>
          </defs>
          <circle r=".5" fill="#faf7ef" />
          <g clipPath={`url(#${id}-clip)`}>
            <g filter={`url(#${id}-grain)`}>
              {doc.paths.map((p, i) => (
                <path
                  key={i}
                  d={p.points
                    .map(
                      (v, j) =>
                        `${j ? "L" : "M"}${v.x.toFixed(5)},${v.y.toFixed(5)}`,
                    )
                    .join(" ")}
                  fill="none"
                  stroke={p.color}
                  strokeWidth={p.width}
                  strokeOpacity={p.opacity}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </g>
            {doc.dots.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={p.size}
                fill={p.color}
                opacity={p.opacity}
              />
            ))}
          </g>
        </svg>
        <canvas
          ref={animationCanvas}
          className="emoji-live-ink"
          aria-hidden="true"
        />
        {!strokes.length && (
          <p className="emoji-empty">
            Glisse ton doigt
            <br />
            pour faire naître la matière.
          </p>
        )}
      </div>
      <div className="emoji-controls">
        <div className="emoji-palette" role="group" aria-label="Brosses émojis">
          {SENSORY_EMOJIS.map((e) => (
            <PaintButton
              key={e.id}
              aria-label={e.name}
              aria-pressed={active === e.id}
              onClick={() => setActive(e.id)}
              title={e.name}
            >
              {e.emoji}
            </PaintButton>
          ))}
        </div>
        <div className="emoji-settings">
          <label>
            Taille
            <input
              type="range"
              aria-label="Taille de la brosse"
              min=".015"
              max=".09"
              step=".005"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            />
          </label>
          <label>
            Opacité
            <input
              type="range"
              aria-label="Opacité de la brosse"
              min=".15"
              max="1"
              step=".05"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
            />
          </label>
        </div>
        <div className="emoji-actions">
          <PaintButton
            disabled={!strokes.length || busy}
            onClick={() => setStrokes((s) => s.slice(0, -1))}
          >
            Annuler
          </PaintButton>
          <PaintButton
            disabled={!strokes.length || busy}
            onClick={() => setStrokes([])}
          >
            Effacer
          </PaintButton>
          <PaintButton
            className="emoji-reveal"
            disabled={!strokes.length || busy}
            onClick={onReveal}
          >
            {busy ? "Le paysage éclot…" : "Révéler en 3D"}
          </PaintButton>
        </div>
        {strokes.length >= MAX_PAINT_STROKES && (
          <p role="status">
            Ton ciel est rempli. Révèle-le ou annule un tracé pour continuer.
          </p>
        )}
      </div>
    </section>
  );
});
