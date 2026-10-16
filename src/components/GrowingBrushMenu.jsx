import BrushWorkshop from "./BrushWorkshop.jsx";
import { useEffect, useRef, useState } from "react";
export default function GrowingBrushMenu({
  brushes,
  selected,
  busy,
  error,
  onSelect,
  onAdd,
  max,
  onSave,
  saveMessage,
}) {
  const selectedButton = useRef(null);
  const [workshopOpen, setWorkshopOpen] = useState(false);
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
          aria-label="Créer une brosse"
          onClick={() => setWorkshopOpen(true)}
          disabled={busy || brushes.length >= max}
        >
          <span aria-hidden="true">+</span>
          <small>Créer</small>
        </button>
        <button
          className="save-brush-palette"
          onClick={onSave}
          disabled={!brushes[0].ready}
          aria-label="Sauvegarder la palette"
        >
          ♡
        </button>
      </div>
      <p className="growing-brush-hint">
        {brushes[0].ready
          ? "Glisser pour guider · maintenir le canevas pour sculpter"
          : "Touchez + pour composer votre première brosse"}
        {brushes.length >= max ? ` · ${max} brosses` : ""}
      </p>
      {saveMessage && (
        <p role="status" className="growing-brush-hint">
          {saveMessage}
        </p>
      )}
      {workshopOpen && (
        <BrushWorkshop
          busy={busy}
          error={error}
          onCreate={onAdd}
          onClose={() => setWorkshopOpen(false)}
        />
      )}
    </section>
  );
}
