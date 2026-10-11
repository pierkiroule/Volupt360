const brushes = [
  ["danse", "〰 Voiles"],
  ["vegetal", "✺ Pigments"],
  ["calligraphie", "✒ Filaments"],
  ["bulles", "◌ Bulles légères"],
  ["splatch", "✱ Splatch noir"],
];

export default function BrushSelector() {
  return (
    <div className="styles" role="group" aria-label="Style de tracé">
      <span className="style-label">Pinceau</span>
      {brushes.map(([style, label]) => (
        <button
          key={style}
          type="button"
          className="style-btn"
          data-style={style}
          aria-pressed={style === "danse"}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
