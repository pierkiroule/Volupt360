import { useEffect, useState } from "react";
import { BRUSHES } from "../engine/brushes.js";
import { MAX_TWIG_SECONDS } from "../sonoizo/createTwigBank.js";

export default function TwigWorkshop({
  mode,
  bank,
  snapshot,
  error,
  clearError,
}) {
  const [selected, setSelected] = useState(BRUSHES[0].id);
  const [elapsed, setElapsed] = useState(0);
  const recording = snapshot.recording;
  useEffect(() => {
    if (recording?.status !== "recording") {
      setElapsed(0);
      return;
    }
    const tick = () =>
      setElapsed(
        Math.min(
          MAX_TWIG_SECONDS,
          (performance.now() - recording.startedAt) / 1000,
        ),
      );
    tick();
    const timer = setInterval(tick, 100);
    return () => clearInterval(timer);
  }, [recording?.status, recording?.startedAt]);
  const current = BRUSHES.find(
    (brush) => brush.id === (recording?.id || selected),
  );
  const slot = snapshot.slots[current.id];
  const count = Object.values(snapshot.slots).filter(
    (item) => item.duration > 0,
  ).length;
  function press(event, id) {
    if (event.button > 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    clearError();
    bank.current?.press(id, event.pointerId);
  }
  function release(event, cancel = false) {
    bank.current?.release(event.pointerId, cancel);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  return (
    <section className="twig-workshop" aria-label="Bouquet sonore">
      <div className="twig-heading">
        <span>
          {mode === "cueillir"
            ? "On cueille des sons comme des brindilles."
            : "Un tap chante · maintenir prolonge le son."}
        </span>
        <span aria-label="Nombre de brindilles">{count} / 12</span>
      </div>
      <div
        className="twig-pads"
        role="group"
        aria-label="Douze brindilles, douze brosses"
      >
        {BRUSHES.map((brush, index) => {
          const item = snapshot.slots[brush.id];
          const listening = mode === "jouer";
          return (
            <button
              key={brush.id}
              className={`twig-pad twig-${brush.id} ${item.duration ? "is-filled" : ""} ${item.playing ? "is-playing" : ""}`}
              style={{ "--twig-color": brush.color }}
              aria-label={`${listening ? "Jouer la brindille" : "Brindille"} ${brush.name}`}
              aria-pressed={listening ? item.playing : current.id === brush.id}
              disabled={Boolean(recording) || (listening && !item.duration)}
              onClick={(event) => {
                if (!listening) {
                  setSelected(brush.id);
                  clearError();
                } else if (event.detail === 0)
                  void bank.current?.listen(brush.id);
              }}
              onPointerDown={
                listening ? (event) => press(event, brush.id) : undefined
              }
              onPointerUp={listening ? (event) => release(event) : undefined}
              onPointerCancel={
                listening ? (event) => release(event, true) : undefined
              }
              onLostPointerCapture={
                listening
                  ? (event) => bank.current?.release(event.pointerId)
                  : undefined
              }
              onKeyDown={
                listening
                  ? (event) => {
                      if (!["Enter", " "].includes(event.key)) return;
                      event.preventDefault();
                      if (!event.repeat)
                        bank.current?.press(brush.id, `key-${brush.id}`);
                    }
                  : undefined
              }
              onKeyUp={
                listening
                  ? (event) => {
                      if (["Enter", " "].includes(event.key)) {
                        event.preventDefault();
                        bank.current?.release(`key-${brush.id}`);
                      }
                    }
                  : undefined
              }
              onBlur={
                listening
                  ? () => bank.current?.release(`key-${brush.id}`, true)
                  : undefined
              }
            >
              <span className="twig-index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="twig-glyph" aria-hidden="true">
                {brush.glyph}
              </span>
              <span>{brush.name}</span>
              <small>
                {item.looping
                  ? "en boucle"
                  : item.duration
                    ? `${item.duration.toFixed(1)} s`
                    : "à cueillir"}
              </small>
            </button>
          );
        })}
      </div>
      {mode === "cueillir" && (
        <div className="twig-editor">
          <div className="twig-editor-caption">
            <strong>{current.name}</strong>
            <span role="status">
              {recording?.status === "permission"
                ? "Autorisez le microphone…"
                : recording?.status === "decoding"
                  ? "La brindille prend forme…"
                  : recording
                    ? `${elapsed.toFixed(1)} / 10 s`
                    : slot.duration
                      ? `${slot.duration.toFixed(1)} secondes cueillies`
                      : "10 secondes maximum · commencez avec un seul son"}
            </span>
          </div>
          <div className="twig-actions">
            {recording ? (
              <button
                className="twig-record is-recording"
                disabled={recording.status === "decoding"}
                onClick={() =>
                  recording.status === "permission"
                    ? bank.current?.cancelRecording()
                    : bank.current?.stopRecording()
                }
              >
                {recording.status === "permission"
                  ? "Annuler la demande"
                  : recording.status === "decoding"
                    ? "Préparation…"
                    : "Arrêter l’enregistrement"}
              </button>
            ) : (
              <button
                className="twig-record"
                onClick={() => {
                  clearError();
                  void bank.current?.record(current.id);
                }}
              >
                {slot.duration
                  ? `Remplacer ${current.name}`
                  : `Enregistrer ${current.name}`}
              </button>
            )}
            <button
              disabled={!slot.duration || Boolean(recording)}
              aria-label={`Écouter ${current.name}`}
              onClick={() => {
                clearError();
                void bank.current?.listen(current.id);
              }}
            >
              Écouter
            </button>
            <button
              disabled={!slot.duration || Boolean(recording)}
              aria-label={`Supprimer ${current.name}`}
              onClick={() => bank.current?.remove(current.id)}
            >
              Supprimer
            </button>
          </div>
          {recording?.status === "recording" && (
            <progress
              aria-label="Durée de l’enregistrement"
              max="10"
              value={elapsed}
            />
          )}
        </div>
      )}
      {error && (
        <p className="twig-error" role="alert">
          {error}
        </p>
      )}
      <p className="twig-note">
        {mode === "cueillir"
          ? "Un bouquet local, conservé pendant cette session."
          : "Jouez plusieurs brindilles ensemble. Leur danse prendra vie au prochain acte."}
      </p>
    </section>
  );
}
