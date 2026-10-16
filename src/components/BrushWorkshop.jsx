import { useEffect, useRef, useState } from "react";
import { BRUSHES } from "../engine/brushes.js";
import {
  EFFECTS,
  LIFE_STYLES,
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
    const frame = requestAnimationFrame(() => {
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
    });
    return () => cancelAnimationFrame(frame);
  }, [draft.seed, draft.color, draft.effect]);
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
            style={{ opacity: draft.opacity }}
          />
          <span aria-hidden="true">
            {BRUSHES.find((item) => item.id === draft.baseId)?.glyph}
          </span>
        </div>
        <label>
          Forme
          <select
            aria-label="Forme"
            value={draft.baseId}
            onChange={(e) => change("baseId", e.target.value)}
          >
            {BRUSHES.map((brush) => (
              <option key={brush.id} value={brush.id}>
                {brush.name}
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
          Matière
          <select
            aria-label="Matière"
            value={draft.effect}
            onChange={(e) => change("effect", e.target.value)}
          >
            {EFFECTS.map((effect) => (
              <option key={effect}>{effect}</option>
            ))}
          </select>
        </label>
        <fieldset className="brush-life">
          <legend>Mouvement vivant</legend>
          {LIFE_STYLES.map((life) => (
            <button
              key={life}
              type="button"
              aria-pressed={draft.life === life}
              onClick={() => change("life", life)}
            >
              {life}
            </button>
          ))}
        </fieldset>
        <details className="brush-refinements">
          <summary>Affiner</summary>
          <label>
            Nom
            <input
              value={draft.name}
              maxLength={32}
              onChange={(e) => change("name", e.target.value)}
            />
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
            Opacité
            <input
              type="range"
              min="0.2"
              max="1"
              step="0.05"
              value={draft.opacity}
              onChange={(e) => change("opacity", Number(e.target.value))}
            />
          </label>
        </details>
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
          Chaque brosse évolue avec le temps et la musique. Palette sauvegardée
          sur cet appareil.
        </small>
      </form>
    </dialog>
  );
}
