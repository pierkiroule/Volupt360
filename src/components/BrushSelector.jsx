import { BRUSHES } from "../engine/brushes.js";

export default function BrushSelector({ selected, onChange }) {
  return (
    <div
      className="brush-palette"
      role="group"
      aria-label="Palette aquarelle : six brosses"
    >
      {BRUSHES.map((brush) => (
        <button
          key={brush.id}
          className={`brush brush-${brush.id}`}
          aria-label={brush.name}
          aria-pressed={selected === brush.id}
          title={brush.detail}
          onClick={() => onChange(brush.id)}
          style={{ "--pigment": brush.color }}
        >
          <span className="brush-swatch" aria-hidden="true">
            {brush.glyph}
          </span>
          <span>{brush.name}</span>
        </button>
      ))}
    </div>
  );
}
