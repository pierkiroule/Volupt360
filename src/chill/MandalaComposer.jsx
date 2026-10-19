import {
  forwardRef,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import { SENSORY_EMOJIS } from "./sensoryEmojiCatalog.js";
import { generateMandala } from "./mandalaGenerator.js";

export const MandalaComposer = forwardRef(function MandalaComposer(
  { visible, onChange, onReveal, busy },
  ref,
) {
  const [choices, setChoices] = useState([]),
    [variation, setVariation] = useState(0);
  const id = useId().replace(/:/g, ""),
    doc = useMemo(
      () => generateMandala(choices, variation),
      [choices, variation],
    );
  const current = useRef(doc);
  current.current = doc;
  useImperativeHandle(
    ref,
    () => ({
      getDocument: () => current.current,
      clear: () => {
        setChoices([]);
        setVariation(0);
      },
    }),
    [],
  );
  useEffect(() => {
    onChange(choices.length);
  }, [choices, onChange]);
  function toggle(value) {
    setChoices((old) =>
      old.includes(value)
        ? old.filter((x) => x !== value)
        : old.length < 3
          ? [...old, value]
          : old,
    );
  }
  return (
    <section
      className="mandala-composer"
      hidden={!visible}
      aria-label="Composer un mandala"
    >
      <header>
        <span className="chill-eyebrow">Un geste · Un écho · Un monde</span>
        <h1>Ton mandala en résonance</h1>
        <p>Choisis de 1 à 3 émojis. Leurs rencontres composent ton paysage.</p>
      </header>
      <div className="mandala-paper">
        <svg
          viewBox="-.51 -.51 1.02 1.02"
          role="img"
          aria-label={
            choices.length
              ? "Mandala généré à partir des émojis sélectionnés"
              : "Disque vierge : choisis un émoji"
          }
        >
          <defs>
            <filter
              id={`${id}-grain`}
              x="-10%"
              y="-10%"
              width="120%"
              height="120%"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="130"
                numOctaves="2"
                seed="8"
                result="noise"
              />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale=".0025" />
            </filter>
          </defs>
          <circle r=".5" fill="#faf7ef" />
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
                fill={p.color}
                fillOpacity={p.width > 0.002 ? 0.08 : 0}
                stroke={p.color}
                strokeWidth={p.width}
                strokeOpacity={p.opacity}
                strokeLinecap="round"
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
              opacity=".65"
            />
          ))}
        </svg>
        {!choices.length && (
          <p className="mandala-empty">
            Une rencontre suffit
            <br />
            pour faire éclore une forme.
          </p>
        )}
      </div>
      <div className="mandala-controls">
        <div
          className="mandala-palette"
          role="group"
          aria-label="Émojis du mandala"
        >
          {SENSORY_EMOJIS.map((e) => (
            <button
              key={e.id}
              aria-label={e.name}
              aria-pressed={choices.includes(e.id)}
              disabled={!choices.includes(e.id) && choices.length === 3}
              onClick={() => toggle(e.id)}
              title={e.name}
            >
              {e.emoji}
            </button>
          ))}
        </div>
        <p className="mandala-selection" aria-live="polite">
          {choices.length} / 3{" "}
          <span>
            {choices
              .map((id) => SENSORY_EMOJIS.find((e) => e.id === id).emoji)
              .join(" · ")}
          </span>
        </p>
        <div className="mandala-actions">
          <button
            disabled={!choices.length || busy}
            onClick={() => setVariation((v) => v + 1)}
          >
            Autre éclosion
          </button>
          <button
            className="mandala-reveal"
            disabled={!choices.length || busy}
            onClick={onReveal}
          >
            {busy ? "Le paysage éclot…" : "Entrer dans mon mandala"}
          </button>
        </div>
      </div>
    </section>
  );
});
