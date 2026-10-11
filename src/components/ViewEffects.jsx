import { useState } from "react";
import { NATURAL_VIEW } from "../engine/createViewEffects.js";

export default function ViewEffects({ values, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="view-effects">
      <button
        aria-expanded={open}
        aria-controls="view-effects-controls"
        onClick={() => setOpen(!open)}
      >
        Rendu
      </button>
      {open && (
        <div
          id="view-effects-controls"
          className="view-effects-controls"
          role="group"
          aria-label="Effets de la vue"
        >
          {[
            ["contrast", "Contraste", 0.6, 1.8],
            ["saturation", "Saturation", 0, 1.8],
            ["threshold", "Seuil d’encre", 0, 1],
          ].map(([key, label, min, max]) => (
            <label key={key}>
              <span>{label}</span>
              <input
                aria-label={label}
                type="range"
                min={min}
                max={max}
                step="0.01"
                value={values[key]}
                onChange={(event) =>
                  onChange({ ...values, [key]: Number(event.target.value) })
                }
              />
              <output>
                {key === "threshold"
                  ? `${Math.round(values[key] * 100)} %`
                  : values[key].toFixed(2)}
              </output>
            </label>
          ))}
          <button onClick={() => onChange({ ...NATURAL_VIEW })}>Naturel</button>
        </div>
      )}
    </div>
  );
}
