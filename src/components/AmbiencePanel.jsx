import { useRef } from "react";

export default function AmbiencePanel({
  bank,
  snapshot,
  clearError,
  compact = false,
}) {
  const input = useRef(null),
    state = snapshot.ambience || {};
  return (
    <section
      className={`ambience-panel ${compact ? "is-compact" : ""}`}
      aria-label="Ambiance musicale globale"
    >
      <input
        ref={input}
        type="file"
        accept="audio/*,.mp3"
        className="sr-only"
        aria-label="Importer une ambiance MP3"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) {
            clearError();
            void bank.current?.importAmbience(file);
          }
        }}
      />
      <button
        aria-label={
          state.loaded ? "Remplacer l’ambiance MP3" : "Choisir une ambiance MP3"
        }
        title={state.name || "Importer une ambiance musicale"}
        onClick={() => input.current?.click()}
        disabled={state.loading}
      >
        {state.loading
          ? "…"
          : compact
            ? "♫"
            : state.loaded
              ? "Remplacer MP3"
              : "Ambiance MP3"}
      </button>
      <span title={state.name}>
        {state.name || "La musique accompagne les voix."}
      </span>
      {state.loaded && (
        <>
          <button
            aria-label={
              state.playing ? "Mettre l’ambiance en pause" : "Lire l’ambiance"
            }
            onClick={() => void bank.current?.toggleAmbience()}
          >
            {state.playing ? "Ⅱ" : "▷"}
          </button>
          {!compact && (
            <button
              aria-label="Retirer l’ambiance"
              onClick={() => bank.current?.removeAmbience()}
            >
              ×
            </button>
          )}
        </>
      )}
    </section>
  );
}
