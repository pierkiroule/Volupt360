import { useEffect, useRef } from "react";
export default function GrowingBrushMenu({
  brushes,
  selected,
  busy,
  error,
  onSelect,
  onAdd,
  max,
}) {
  const selectedButton = useRef(null);
  useEffect(() => {
    selectedButton.current?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [selected, brushes.length]);
  return (
    <section
      className="growing-brush-menu"
      aria-label="Mes matières naturelles"
    >
      {error && (
        <p role="status" className="growing-brush-error">
          {error}
        </p>
      )}
      <div className="growing-brush-row">
        <div
          className="growing-brush-list"
          role="group"
          aria-label="Choisir une brosse"
        >
          {brushes.map((brush, index) => (
            <button
              key={brush.id}
              ref={selected === brush.id ? selectedButton : null}
              className="generated-brush"
              aria-label={`Brosse ${index + 1} · ${brush.name}`}
              aria-pressed={selected === brush.id}
              disabled={!brush.ready}
              onClick={() => onSelect(brush.id)}
              style={{ "--brush-color": brush.color || "#8babb7" }}
            >
              {brush.thumbnail ? (
                <img src={brush.thumbnail} alt="" />
              ) : (
                <span aria-hidden="true">≈</span>
              )}
              <span>{brush.name}</span>
            </button>
          ))}
        </div>
        <button
          className="add-bird-brush"
          onClick={onAdd}
          disabled={busy || brushes.length >= max}
          aria-label={
            brushes[0].ready
              ? "Nouvelle matière"
              : "Réessayer la première brosse"
          }
        >
          <span aria-hidden="true">{busy ? "…" : "+"}</span>
          <small>
            {busy
              ? "Création…"
              : brushes[0].ready
                ? "Nouvelle matière"
                : "Réessayer"}
          </small>
        </button>
      </div>
      <p className="growing-brush-hint">
        Glisser pour guider · maintenir le canevas pour sculpter
        {brushes.length >= max ? ` · ${max} brosses` : ""}
      </p>
    </section>
  );
}
