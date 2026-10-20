import { useEffect, useMemo, useRef } from "react";
import { useSensoryStore } from "../store/useSensoryStore.ts";
import { seededRandom, transduce } from "../transduction/engine.ts";
import type { Capture } from "./SensoryScene.tsx";
export default function SensoryFallback({
  onCapture,
}: {
  onCapture: (capture: Capture) => void;
}) {
  const state = useSensoryStore(),
    ref = useRef<SVGSVGElement>(null),
    p = useMemo(() => transduce(state.composition), [state.composition]);
  const forms = useMemo(() => {
    const r = seededRandom(state.composition.seed);
    return Array.from({ length: 16 }, () => ({
      x: r() * 1000,
      y: r() * 800,
      rx: 90 + r() * 200,
      ry: 30 + r() * 90,
      rotation: r() * 180,
    }));
  }, [state.composition.seed]);
  useEffect(
    () =>
      onCapture(
        () =>
          new Promise((resolve, reject) => {
            const svg = ref.current;
            if (!svg) return reject(Error("Vue indisponible."));
            const url = URL.createObjectURL(
                new Blob([new XMLSerializer().serializeToString(svg)], {
                  type: "image/svg+xml",
                }),
              ),
              img = new Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              canvas.width = 1600;
              canvas.height = 1280;
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                URL.revokeObjectURL(url);
                return reject(Error("Capture indisponible."));
              }
              ctx.drawImage(img, 0, 0, 1600, 1280);
              URL.revokeObjectURL(url);
              canvas.toBlob((b) =>
                b ? resolve(b) : reject(Error("Capture indisponible.")),
              );
            };
            img.onerror = () => {
              URL.revokeObjectURL(url);
              reject(Error("Capture indisponible."));
            };
            img.src = url;
          }),
      ),
    [onCapture],
  );
  const colors = p.palette.map(
    (c) => `rgb(${c.map((v) => Math.round(v * 255)).join(",")})`,
  );
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1000 800"
      preserveAspectRatio="xMidYMid slice"
      className={`sensory-fallback ${state.paused || state.reduced ? "is-still" : ""}`}
      role="img"
      aria-label="Univers émotionnel simplifié, voiles de pigments"
    >
      <defs>
        <filter id="sky-grain">
          <feTurbulence
            baseFrequency=".016"
            numOctaves="3"
            seed={state.composition.seed % 1000}
          />
          <feDisplacementMap in="SourceGraphic" scale="32" />
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <style>{`@keyframes drift{to{transform:translate(15px,-12px)}} .sky-veil{animation:drift 12s ease-in-out infinite alternate}.is-still .sky-veil{animation-play-state:paused}`}</style>
      </defs>
      <rect width="1000" height="800" fill="#101b2c" />
      {forms.map((f, i) => (
        <g key={i} className="sky-veil" style={{ animationDelay: `-${i}s` }}>
          <ellipse
            cx={f.x}
            cy={f.y}
            rx={f.rx * p.spread}
            ry={f.ry * p.stretch}
            transform={`rotate(${f.rotation} ${f.x} ${f.y})`}
            fill={colors[i % 3]}
            opacity={0.1 + p.density * 0.15}
            filter="url(#sky-grain)"
          />
        </g>
      ))}
    </svg>
  );
}
