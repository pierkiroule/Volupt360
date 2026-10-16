import { useEffect, useRef, useState } from "react";
import { BRUSHES } from "../engine/brushes.js";
import {
  EFFECTS,
  createProceduralBrush,
  randomBrush,
} from "../materials/proceduralBrush.js";
import { createWatercolorTexture } from "../engine/createWatercolorTexture.js";
export default function BrushWorkshop({ busy, onCreate, onClose, error }) {
  const [draft, setDraft] = useState(randomBrush);
  const [preview, setPreview] = useState("");
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    element.showModal();
    return () => {
      element.close();
      opener?.focus();
    };
  }, []);
  useEffect(() => {
    const profile = createProceduralBrush(draft);
    const binding = createWatercolorTexture(
      { color: profile.color },
      profile.seed,
      128,
      profile.acoustic,
      profile.visual,
    );
    setPreview(binding.texture.image.toDataURL());
    binding.texture.dispose();
  }, [draft]);
  const change = (key, value) =>
    setDraft((previous) => ({ ...previous, [key]: value }));
  return (
    <dialog
      className="brush-workshop"
      aria-labelledby="brush-workshop-title"
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (await onCreate(draft)) onClose();
        }}
      >
        <h2 id="brush-workshop-title">Créer une brosse</h2>
        {error && <p role="alert">{error}</p>}
        <div className="brush-preview" style={{ "--brush-color": draft.color }}>
          <img
            src={preview || undefined}
            alt="Aperçu de la matière procédurale"
          />
          <span aria-hidden="true">
            {BRUSHES.find((item) => item.id === draft.baseId)?.glyph}
          </span>
        </div>
        <label>
          Nom
          <input
            value={draft.name}
            maxLength={32}
            onChange={(e) => change("name", e.target.value)}
          />
        </label>
        <label>
          Forme
          <select
            aria-label="Forme"
            value={draft.baseId}
            onChange={(e) => change("baseId", e.target.value)}
          >
            {BRUSHES.map((brush) => (
              <option key={brush.id} value={brush.id}>
                {brush.name} · {brush.detail}
              </option>
            ))}
          </select>
        </label>
        <label>
          Couleur
          <input
            type="color"
            value={draft.color}
            onChange={(e) => change("color", e.target.value)}
          />
        </label>
        <label>
          Effet
          <select
            aria-label="Effet"
            value={draft.effect}
            onChange={(e) => change("effect", e.target.value)}
          >
            {EFFECTS.map((effect) => (
              <option key={effect}>{effect}</option>
            ))}
          </select>
        </label>
        <label>
          Épaisseur
          <input
            type="range"
            min="0.3"
            max="2.5"
            step="0.05"
            value={draft.width}
            onChange={(e) => change("width", Number(e.target.value))}
          />
        </label>
        <label>
          Transparence
          <input
            type="range"
            min="0.2"
            max="1"
            step="0.05"
            value={draft.opacity}
            onChange={(e) => change("opacity", Number(e.target.value))}
          />
        </label>
        <div className="workshop-actions">
          <button
            type="button"
            disabled={busy}
            onClick={() => setDraft(randomBrush())}
          >
            Surprise
          </button>
          <button type="button" disabled={busy} onClick={onClose}>
            Annuler
          </button>
          <button type="submit" disabled={busy}>
            {busy ? "Création…" : "Créer la brosse"}
          </button>
        </div>
        <small>
          La matière est générée ici. La palette est sauvegardée sur cet
          appareil.
        </small>
      </form>
    </dialog>
  );
}
