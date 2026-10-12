import { useEffect, useRef, useState } from "react";
import TexturePalette from "./TexturePalette.jsx";
import { BRUSHES } from "../engine/brushes.js";
import { MAX_TWIG_SECONDS } from "../sonoizo/createTwigBank.js";

export default function TwigWorkshop({
  mode,
  bank,
  snapshot,
  error,
  clearError,
  onTexture,
  textures = {},
}) {
  const audioInput = useRef(null);
  const [textureOpen, setTextureOpen] = useState(false);
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
  const poetic = Object.values(snapshot.slots).some((item) => item.text);
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
    <section
      className={`twig-workshop ${mode === "jouer" ? "is-playing-mode" : ""}`}
      aria-label="Bouquet sonore"
    >
      <div className="twig-heading">
        <span>
          {mode === "cueillir"
            ? poetic
              ? "Chaque parole ouvre un courant."
              : "On cueille des sons comme des brindilles."
            : poetic
              ? "Un tap libère un fragment de fluidité."
              : snapshot.fireflies
                ? "Les brosses sculptent · les lucioles murmurent."
                : "Un tap chante · maintenir prolonge le son."}
        </span>
        <span
          aria-label={poetic ? "Nombre de fragments" : "Nombre de brindilles"}
        >
          {count} / 12
        </span>
      </div>
      <div
        className="twig-pads"
        role="group"
        aria-label={
          poetic
            ? "Douze fragments, douze brosses"
            : "Douze brindilles, douze brosses"
        }
      >
        {BRUSHES.map((brush) => {
          const item = snapshot.slots[brush.id];
          const listening = mode === "jouer";
          return (
            <button
              key={brush.id}
              className={`twig-pad twig-${brush.id} ${item.duration ? "is-filled" : ""} ${item.playing ? "is-playing" : ""}`}
              style={{ "--twig-color": brush.color }}
              aria-label={
                snapshot.fireflies
                  ? `Sculpter avec ${brush.name}`
                  : `${listening ? (item.text ? "Jouer le fragment" : "Jouer la brindille") : item.text ? "Fragment" : "Brindille"} ${brush.name}`
              }
              title={
                item.text ||
                `${brush.name} · ${item.duration ? `${item.duration.toFixed(1)} s` : "à cueillir"}`
              }
              data-duration={item.duration.toFixed(1)}
              data-looping={Boolean(item.looping)}
              aria-pressed={listening ? item.playing : current.id === brush.id}
              disabled={
                Boolean(recording) ||
                (listening &&
                  (!item.duration ||
                    (!snapshot.fireflies &&
                      snapshot.vocalBusy &&
                      snapshot.activeVocalId !== brush.id)))
              }
              onClick={(event) => {
                if (!listening) {
                  setSelected(brush.id);
                  clearError();
                } else {
                  // iOS may only authorize Web Audio on release/click, not pointerdown.
                  void bank.current?.preparePlayback();
                  if (event.detail === 0) void bank.current?.trigger(brush.id);
                }
              }}
              onPointerDown={
                listening ? (event) => press(event, brush.id) : undefined
              }
              onPointerUp={
                listening
                  ? (event) => {
                      void bank.current?.preparePlayback();
                      release(event);
                    }
                  : undefined
              }
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
              <span className="twig-glyph" aria-hidden="true">
                {brush.glyph}
              </span>
            </button>
          );
        })}
      </div>
      {mode === "cueillir" && !snapshot.fireflies && (
        <div className="twig-editor">
          <div className="twig-editor-caption">
            <strong>{current.name}</strong>
            <span role="status">
              {recording?.status === "permission"
                ? "Autorisez le microphone…"
                : ["decoding", "importing"].includes(recording?.status)
                  ? "La brindille prend forme…"
                  : recording
                    ? `${elapsed.toFixed(1)} / ${MAX_TWIG_SECONDS} s`
                    : slot.duration
                      ? slot.text
                        ? `Lecture française · ${slot.duration.toFixed(1)} s`
                        : `${slot.duration.toFixed(1)} secondes cueillies`
                      : "Micro ou MP3 · 5 secondes maximum"}
            </span>
          </div>
          {slot.text && <p className="poetic-fragment">{slot.text}</p>}
          {!slot.text && (
            <input
              ref={audioInput}
              className="sr-only"
              type="file"
              accept="audio/*,.mp3"
              aria-label={`Importer un son pour ${current.name}`}
              disabled={Boolean(recording)}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) {
                  clearError();
                  void bank.current?.importSample(current.id, file);
                }
              }}
            />
          )}
          <div className="twig-actions">
            {!slot.text && (
              <button
                disabled={Boolean(recording)}
                onClick={() => audioInput.current?.click()}
              >
                Importer MP3
              </button>
            )}
            {!slot.text &&
              (recording ? (
                <button
                  className="twig-record is-recording"
                  disabled={recording.status === "decoding"}
                  onClick={() =>
                    ["permission", "importing"].includes(recording.status)
                      ? bank.current?.cancelRecording()
                      : bank.current?.stopRecording()
                  }
                >
                  {recording.status === "importing"
                    ? "Annuler l’import"
                    : recording.status === "permission"
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
              ))}
            <button
              disabled={
                !slot.duration || Boolean(recording) || snapshot.vocalBusy
              }
              aria-label={`Écouter ${current.name}`}
              onClick={() => {
                clearError();
                void bank.current?.listen(current.id);
              }}
            >
              Écouter
            </button>
            <button
              disabled={Boolean(recording)}
              aria-label={`Modifier la texture ${current.name}`}
              aria-expanded={textureOpen}
              onClick={() => setTextureOpen(!textureOpen)}
            >
              Texture
            </button>
            {!slot.text && (
              <button
                disabled={!slot.duration || Boolean(recording)}
                aria-label={`Supprimer ${current.name}`}
                onClick={() => bank.current?.remove(current.id)}
              >
                Supprimer
              </button>
            )}
          </div>
          {textureOpen && (
            <TexturePalette
              brush={current.name}
              selected={textures[current.id]?.id}
              disabled={Boolean(recording)}
              onSelect={(id) => onTexture(current.id, id)}
            />
          )}
          {recording?.status === "recording" && (
            <progress
              aria-label="Durée de l’enregistrement"
              max={MAX_TWIG_SECONDS}
              value={elapsed}
            />
          )}
        </div>
      )}
      {mode === "cueillir" && snapshot.fireflies && (
        <div className="twig-editor">
          <strong>{current.name}</strong>
          <TexturePalette
            brush={current.name}
            selected={textures[current.id]?.id}
            onSelect={(id) => onTexture(current.id, id)}
          />
        </div>
      )}
      {error && (
        <p className="twig-error" role="alert">
          {error}
        </p>
      )}
      <p className="twig-note">
        {mode === "cueillir"
          ? poetic
            ? "Les voix dessinent leurs matières dans l’espace."
            : "Un bouquet local, conservé pendant cette session."
          : "La buse danse en continu. Vos pads sculptent son sillage."}
      </p>
    </section>
  );
}
