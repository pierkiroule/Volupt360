import { useEffect, useRef, useState } from "react";

export default function BrushEditor({ brush, onApply, onClose }) {
  const dialog = useRef(null);
  const [draft, setDraft] = useState({ ...brush });
  const [file, setFile] = useState(null),
    [resetAlpha, setResetAlpha] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  const change = (key, value) =>
    setDraft((previous) => ({ ...previous, [key]: value }));
  return (
    <dialog
      ref={dialog}
      className="brush-editor"
      aria-labelledby="brush-editor-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          try {
            await onApply(draft, { file, resetAlpha });
            onClose();
          } catch (cause) {
            setError(cause.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2 id="brush-editor-title">{brush.name} · matière</h2>
        <p>Ces réglages s’appliquent aux prochains dépôts.</p>
        <label>
          Couleur{" "}
          <input
            type="color"
            value={draft.color}
            onChange={(event) => change("color", event.target.value)}
          />
        </label>
        <label>
          Taille{" "}
          <input
            type="range"
            aria-label="Taille"
            min="0.2"
            max="2"
            step="0.05"
            value={draft.width}
            onChange={(event) => change("width", Number(event.target.value))}
          />
          <output>{draft.width.toFixed(2)}</output>
        </label>
        <label>
          Opacité{" "}
          <input
            type="range"
            aria-label="Opacité"
            min="0.1"
            max="1"
            step="0.01"
            value={draft.opacity}
            onChange={(event) => change("opacity", Number(event.target.value))}
          />
          <output>{Math.round(draft.opacity * 100)} %</output>
        </label>
        <label className="alpha-import">
          Texture alpha{" "}
          <input
            type="file"
            accept="image/png,image/webp,image/jpeg"
            onChange={(event) => {
              setFile(event.target.files?.[0] || null);
              setResetAlpha(false);
            }}
          />
        </label>
        <small>
          {file?.name ||
            (resetAlpha
              ? "Texture d’origine"
              : brush.alphaName || "Texture aquarelle d’origine")}{" "}
          · PNG transparent ou image sombre sur blanc. Tout reste local.
        </small>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setFile(null);
            setResetAlpha(true);
          }}
        >
          Rétablir la texture d’origine
        </button>
        {error && <p role="alert">{error}</p>}
        <div className="brush-editor-actions">
          <button type="button" disabled={busy} onClick={onClose}>
            Annuler
          </button>
          <button disabled={busy}>{busy ? "Préparation…" : "Appliquer"}</button>
        </div>
      </form>
    </dialog>
  );
}
