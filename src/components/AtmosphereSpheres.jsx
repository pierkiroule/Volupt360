import { useRef } from "react";

const NAMES = ["ÉTHER", "ABYSSE", "MÉMOIRE"];
export function AtmosphereSpheres({
  value,
  onMix,
  onEnter,
  echo,
  hypnos,
  onAtmosphere,
  acousticControls = true,
}) {
  const drag = useRef(null);
  function blend(event) {
    const box = event.currentTarget.getBoundingClientRect();
    const position = Math.max(
      0,
      Math.min(2, (event.clientX - box.left - box.width / 6) / (box.width / 3)),
    );
    const left = Math.min(1, Math.floor(position)),
      fraction = position - left;
    const weights = [0, 0, 0];
    weights[left] = 1 - fraction;
    weights[left + 1] = fraction;
    onMix(weights);
  }
  return (
    <div className="ambient-atmospheres">
      <div
        className="atmosphere-spheres"
        aria-label="Mélanger les atmosphères"
        onPointerDown={(event) => {
          if (event.target.closest("button")) {
            drag.current = { x: event.clientX, moved: false };
            const buttons = [...event.currentTarget.querySelectorAll("button")];
            const index = buttons.indexOf(event.target.closest("button"));
            onMix(NAMES.map((_, i) => (i === index ? 1 : 0)));
            event.currentTarget.setPointerCapture(event.pointerId);
          }
        }}
        onPointerMove={(event) => {
          if (drag.current && Math.abs(event.clientX - drag.current.x) > 6) {
            drag.current.moved = true;
            blend(event);
          }
        }}
        onPointerUp={(event) => {
          if (!drag.current) return;
          const moved = drag.current.moved;
          drag.current = null;
          if (!moved) {
            const box = event.currentTarget.getBoundingClientRect();
            const index = Math.max(
              0,
              Math.min(
                2,
                Math.floor((event.clientX - box.left) / (box.width / 3)),
              ),
            );
            onMix(NAMES.map((_, i) => (i === index ? 1 : 0)));
          }
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        {NAMES.map((name, i) => (
          <button
            key={name}
            className={`atmosphere-sphere sphere-${i}`}
            aria-label={`Choisir ${name}`}
            aria-pressed={value[i] > 0.5}
            aria-description={`${Math.round(value[i] * 100)} % dans le mélange`}
            style={{ "--presence": value[i] }}
            onClick={(event) => {
              if (event.detail === 0)
                onMix(NAMES.map((_, j) => (i === j ? 1 : 0)));
            }}
          >
            <strong>{name}</strong>
            <small>
              {
                ["Le ciel suspendu", "Le jardin englouti", "Les échos du rêve"][
                  i
                ]
              }
            </small>
          </button>
        ))}
      </div>
      <p className="ambient-hint">
        {acousticControls
          ? "Glisser entre les sphères pour mêler les paysages"
          : "Choisissez un univers. Chaque planète porte un chant réel d’oiseau."}
      </p>
      {acousticControls && (
        <div className="ambient-controls">
          <label>
            ÉCHO{" "}
            <input
              aria-label="ÉCHO"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={echo}
              onChange={(event) =>
                onAtmosphere({ echo: Number(event.target.value), hypnos })
              }
            />
          </label>
          <label>
            HYPNOS{" "}
            <input
              aria-label="HYPNOS"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={hypnos}
              onChange={(event) =>
                onAtmosphere({ echo, hypnos: Number(event.target.value) })
              }
            />
          </label>
        </div>
      )}
      <button className="ambient-enter" onClick={onEnter}>
        Entrer dans le paysage
      </button>
    </div>
  );
}
