export default function LandscapeBrushMenu({ selected, onSelect, brushes }) {
  return (
    <section className="landscape-palette" aria-label="Huit brosses aquarelles">
      <div role="group" aria-label="Choisir une brosse">
        {brushes.map((brush) => (
          <button
            key={brush.id}
            aria-label={brush.name}
            title={brush.detail}
            aria-pressed={selected === brush.id}
            onClick={() => onSelect(brush.id)}
            style={{ "--brush-color": brush.color }}
          >
            <span aria-hidden="true">{brush.glyph}</span>
            <small>{brush.name}</small>
          </button>
        ))}
      </div>
      <p>Glisser doucement pour guider · maintenir pour peindre</p>
    </section>
  );
}
