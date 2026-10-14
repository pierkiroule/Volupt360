import { useEffect, useRef } from "react";
export function ImageBrushPicker({ open, busy, error, onFile, onClose }) {
  const camera = useRef(null),
    library = useRef(null);
  const panel = useRef(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    panel.current?.querySelector("button")?.focus();
    return () => previous?.focus?.();
  }, [open]);
  if (!open) return null;
  return (
    <div className="image-brush-backdrop">
      <section
        ref={panel}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
          if (event.key === "Tab") {
            const buttons = [
              ...panel.current.querySelectorAll("button:not(:disabled)"),
            ];
            if (event.shiftKey && document.activeElement === buttons[0]) {
              event.preventDefault();
              buttons.at(-1)?.focus();
            } else if (
              !event.shiftKey &&
              document.activeElement === buttons.at(-1)
            ) {
              event.preventDefault();
              buttons[0]?.focus();
            }
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-brush-title"
        className="image-brush-picker"
      >
        <h2 id="image-brush-title">Une image pour Voiles</h2>
        <p>
          Ses couleurs, son grain et ses contours deviennent matière et
          résonance. Traitement local, sans envoi.
        </p>
        <input
          ref={camera}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          capture="environment"
          className="sr-only"
          aria-label="Photographier la matière de Voiles"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onFile(file);
          }}
        />
        <input
          ref={library}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          className="sr-only"
          aria-label="Importer l’image de Voiles"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onFile(file);
          }}
        />
        <button disabled={busy} onClick={() => camera.current?.click()}>
          Prendre une photo
        </button>
        <button disabled={busy} onClick={() => library.current?.click()}>
          Importer une image
        </button>
        {busy && <p role="status">La matière prend forme…</p>}
        {error && <p role="alert">{error}</p>}
        <button onClick={onClose}>Fermer</button>
      </section>
    </div>
  );
}
