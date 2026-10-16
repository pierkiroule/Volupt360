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
  const importInput = useRef(null),
    cameraInput = useRef(null);
  const receive = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onAdd(file);
  };
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
        <input
          ref={importInput}
          data-photo-import
          type="file"
          accept="image/*"
          hidden
          onChange={receive}
        />
        <input
          ref={cameraInput}
          data-photo-camera
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={receive}
        />
        <button
          className="add-bird-brush"
          onClick={() => importInput.current?.click()}
          disabled={busy || brushes.length >= max}
        >
          <span aria-hidden="true">{busy ? "…" : "+"}</span>
          <small>{busy ? "Création…" : "Importer une photo"}</small>
        </button>
        <button
          className="add-bird-brush"
          onClick={() => cameraInput.current?.click()}
          disabled={busy || brushes.length >= max}
        >
          <span aria-hidden="true">◎</span>
          <small>Prendre une photo</small>
        </button>
      </div>
      <p className="growing-brush-hint">
        {brushes[0].ready
          ? "Glisser pour guider · maintenir le canevas pour sculpter"
          : "Importez ou prenez une photo pour créer votre première brosse"}
        {brushes.length >= max ? ` · ${max} brosses` : ""}
      </p>
    </section>
  );
}
