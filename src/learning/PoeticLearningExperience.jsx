import { useEffect, useRef, useState } from "react";
import { createSoundNest } from "../engine/createSoundNest.js";
import { useTwigBank } from "../sonoizo/useTwigBank.js";
import { CHILL_UNIVERSE } from "../chill/chillConfig.js";
import { HelpResources } from "../chill/HelpResources.jsx";
import { ToolIcon } from "../chill/ToolIcon.jsx";
import { LEARNING_TOPICS } from "./learningContent.js";
import {
  cleanProgress,
  loadProgress,
  saveProgress,
} from "./learningProgress.js";
import musicCatalog from "virtual:echo-music";
import "./learning.css";

export default function PoeticLearningExperience() {
  const stage = useRef(null),
    engine = useRef(null),
    journey = useRef(null),
    generation = useRef(0),
    running = useRef(false),
    messageHeading = useRef(null),
    photoUrl = useRef(null);
  const twigs = useTwigBank();
  const [saved, setSaved] = useState(() => loadProgress()),
    [state, setState] = useState(null),
    [started, setStarted] = useState(false),
    [busy, setBusy] = useState(false),
    [gyro, setGyro] = useState(true),
    [gyroStatus, setGyroStatus] = useState("disabled"),
    [notice, setNotice] = useState(""),
    [muted, setMuted] = useState(false),
    [summary, setSummary] = useState(false),
    [photoBusy, setPhotoBusy] = useState(false);
  useEffect(() => {
    document.title =
      "OIZO•° — Pourquoi cherchons-nous à nous sentir plus légers ?";
    try {
      engine.current = createSoundNest(stage.current, { onError: setNotice });
    } catch (e) {
      setNotice("La scène 3D n’a pas pu démarrer : " + e.message);
    }
    const interrupt = () => {
      if (!running.current) return;
      journey.current?.setPaused(true);
      twigs.bank.current?.pauseAmbience();
    };
    const hidden = () => {
      if (document.hidden) interrupt();
    };
    window.addEventListener("blur", interrupt);
    document.addEventListener("visibilitychange", hidden);
    const statusTimer = setInterval(
      () =>
        setGyroStatus(
          stage.current?.querySelector("canvas")?.dataset.gyroscopeStatus ||
            "disabled",
        ),
      1000,
    );
    return () => {
      generation.current++;
      running.current = false;
      window.removeEventListener("blur", interrupt);
      document.removeEventListener("visibilitychange", hidden);
      clearInterval(statusTimer);
      engine.current?.dispose();
      engine.current = null;
      if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
    };
  }, []);
  const topic = LEARNING_TOPICS.find((item) => item.id === state?.topicId);
  const message =
    topic && state?.message !== null ? topic.messages[state.message] : null;
  const nextIndex = topic
    ? Math.min(2, state?.progress.opened[topic.id].length || 0)
    : 0;
  useEffect(() => {
    if (message) messageHeading.current?.focus();
  }, [state?.topicId, state?.message]);
  async function start(fresh = false) {
    if (busy || !engine.current || !twigs.bank.current) return;
    const ticket = ++generation.current;
    setBusy(true);
    setNotice("");
    setSummary(false);
    try {
      const bank = twigs.bank.current;
      await Promise.all([
        bank.preparePlayback(),
        engine.current.requestContemplationGyroscope(gyro),
      ]);
      if (ticket !== generation.current) return;
      engine.current.setMood(
        { ...CHILL_UNIVERSE, resonanceBubbles: false },
        [],
      );
      const progress = fresh ? cleanProgress(null) : loadProgress();
      journey.current = engine.current.startPoeticLearning({
        progress,
        onChange: setState,
        getAudio: () => bank.getVisualFeatures(),
      });
      saveProgress(progress);
      setSaved(progress);
      setStarted(true);
      running.current = true;
      bank.setAmbienceVolume(muted ? 0 : 0.45);
      const track =
        musicCatalog.find((url) => /(?:^|\/)gravity\.mp3$/i.test(url)) ||
        musicCatalog[0];
      if (track) {
        // Loading a soundtrack never delays exploration or fabricates missing music.
        void bank
          .loadMoodAmbience(import.meta.env.BASE_URL + track)
          .then(async (loaded) => {
            if (!loaded || ticket !== generation.current) return;
            bank.setExperienceMix();
            if (!journey.current?.state.paused) await bank.toggleAmbience();
          })
          .catch(() => {
            if (ticket === generation.current)
              setNotice(
                "La musique est indisponible. L’exploration reste possible en silence.",
              );
          });
      }
    } catch (e) {
      setNotice(e.message);
    } finally {
      if (ticket === generation.current) setBusy(false);
    }
  }
  async function pause() {
    if (!journey.current) return;
    if (!state.paused) {
      journey.current.setPaused(true);
      twigs.bank.current.pauseAmbience();
      return;
    }
    try {
      await twigs.bank.current.preparePlayback();
      const audio = twigs.bank.current.getSnapshot().ambience;
      if (audio.loaded && !audio.playing)
        await twigs.bank.current.toggleAmbience();
      journey.current.setPaused(false);
    } catch {
      setNotice("Touchez à nouveau Reprendre pour réactiver l’audio.");
    }
  }
  function exit() {
    generation.current++;
    running.current = false;
    journey.current?.persist();
    setSaved(loadProgress());
    twigs.bank.current?.cancelAmbienceLoad();
    twigs.bank.current?.pauseAmbience();
    engine.current?.reset();
    engine.current?.setCameraMode("drone");
    journey.current = null;
    setStarted(false);
    setBusy(false);
    setState(null);
    setSummary(false);
  }
  function toggleSound() {
    setMuted(!muted);
    twigs.bank.current?.setAmbienceVolume(muted ? 0.45 : 0);
  }
  async function photo() {
    setPhotoBusy(true);
    try {
      const blob = await engine.current.exportPhoto();
      if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
      photoUrl.current = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = photoUrl.current;
      link.download = "OIZO-poetic-learning.png";
      link.click();
    } catch (e) {
      setNotice(e.message);
    } finally {
      setPhotoBusy(false);
    }
  }
  const targetTopic = LEARNING_TOPICS.find((item) => item.id === state?.target);
  const allRead = state?.progress.visited.length === 12;
  return (
    <main
      className={
        "immersive poetic-learning " + (started ? "learning-running" : "")
      }
    >
      <div id="stage" ref={stage} />
      <HelpResources />
      {!started ? (
        <section className="learning-welcome" aria-labelledby="learning-title">
          <span className="learning-eyebrow">
            Une expérience de Poetic Learning en psychologie
          </span>
          <h1 id="learning-title">
            OIZO<span>•°</span>
          </h1>
          <h2>
            Pourquoi cherchons-nous
            <br />à nous sentir plus légers ?
          </h2>
          <p>
            Un ciel à parcourir. Douze phénomènes à découvrir. Votre voyage
            devient une aquarelle.
          </p>
          <p className="learning-instructions">
            Glissez pour guider l’oizo. Sans geste, il rejoint doucement une
            bulle lumineuse. Au contact, trois découvertes vous attendent à
            360°. Après la première visite, son vol peint le ciel
            automatiquement.
          </p>
          <label className="learning-gyro">
            <input
              type="checkbox"
              checked={gyro}
              onChange={(e) => setGyro(e.target.checked)}
            />{" "}
            Activer le gyroscope dans les bulles (facultatif)
          </label>
          <button
            className="learning-primary"
            disabled={busy || !engine.current}
            onClick={() => start(false)}
          >
            {busy
              ? "Le ciel s’ouvre…"
              : saved.visited.length || saved.elapsed > 10
                ? "Poursuivre mon exploration"
                : "Explorer le ciel"}
          </button>
          {saved.elapsed > 10 && (
            <button
              className="learning-text-button"
              disabled={busy}
              onClick={() => start(true)}
            >
              Recommencer un ciel
            </button>
          )}
          <small>
            Environ 15 minutes, à votre rythme · Pour psychologues,
            hypnothérapeutes et esprits curieux. Un parcours de découverte, sans
            évaluation ni promesse thérapeutique.
          </small>
          <small>
            Seules les découvertes consultées et la durée sont sauvegardées sur
            cet appareil. Aucune donnée émotionnelle. L’œuvre n’est pas
            restaurée après fermeture.
          </small>
          <a className="learning-previous" href="?original=1">
            Retrouver OIZO-BULLE
          </a>
        </section>
      ) : (
        <>
          <header className="learning-heading">
            <span>OIZO•°</span>
            <span aria-label="Bulles découvertes">
              {state?.progress.visited.length || 0}/12
            </span>
          </header>
          {topic && !state?.paused && state?.message === null && (
            <div
              className="learning-reticle"
              aria-hidden="true"
              style={{ "--dwell": (state?.dwell || 0) * 360 + "deg" }}
            >
              <i />
            </div>
          )}
          {!state?.paused && !message && !summary && (
            <section className="learning-guidance" aria-live="polite">
              {topic ? (
                <>
                  <small>{topic.title}</small>
                  <p>{topic.interaction}</p>
                  <span>
                    {
                      ["Mystère", "Découverte scientifique", "Résonance"][
                        nextIndex
                      ]
                    }{" "}
                    · Regardez la bulle colorée
                  </span>
                  <button onClick={() => journey.current.reveal(nextIndex)}>
                    Ouvrir :{" "}
                    {
                      ["Mystère", "Découverte scientifique", "Résonance"][
                        nextIndex
                      ]
                    }
                  </button>
                </>
              ) : (
                <>
                  <p>
                    {targetTopic?.title ||
                      (state?.activeBrush
                        ? "Votre voyage dessine le ciel."
                        : "Glissez pour guider l’oizo. Les bulles lumineuses vous attendent.")}
                  </p>
                  {!state?.target && (
                    <button onClick={() => journey.current.guide()}>
                      Un prochain horizon
                    </button>
                  )}
                </>
              )}
            </section>
          )}
          {message && !state?.paused && !summary && (
            <section
              className="learning-message"
              role="region"
              aria-labelledby="learning-message-title"
              key={topic.id + state.message}
            >
              <small>
                {message.label} · {message.kind}
              </small>
              <h2
                id="learning-message-title"
                ref={messageHeading}
                tabIndex="-1"
              >
                {topic.title}
              </h2>
              <p>{message.text}</p>
              {message.nuance && (
                <p className="learning-nuance">
                  <strong>Ce que cela ne permet pas de conclure.</strong>{" "}
                  {message.nuance}
                </p>
              )}
              {state.message === 1 && (
                <details>
                  <summary>Référence scientifique</summary>
                  <p>{topic.citation}</p>
                  <a
                    href={"https://doi.org/" + topic.doi}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Consulter la publication ↗
                  </a>
                  <small>
                    Une illustration artistique, pas une mesure ou une
                    reproduction du protocole.
                  </small>
                </details>
              )}
              <button
                className="learning-primary"
                onClick={() =>
                  state.message === 2
                    ? journey.current.leave()
                    : journey.current.dismissMessage()
                }
              >
                {state.message === 2
                  ? "Revenir au ciel"
                  : "Poursuivre la découverte"}
              </button>
            </section>
          )}
          {state?.paused && !summary && (
            <section className="learning-pause">
              <h2>Le ciel vous attend</h2>
              <p>Votre exploration est en pause.</p>
              <button className="learning-primary" onClick={pause}>
                Reprendre l’exploration
              </button>
            </section>
          )}
          {(allRead || state?.invitation) && !topic && !summary && (
            <button
              className="learning-conclusion"
              onClick={() => {
                journey.current.setPaused(true);
                setSummary(true);
              }}
            >
              {allRead
                ? "Contempler mon voyage"
                : "Une escale, ou poursuivre ?"}
            </button>
          )}
          {summary && (
            <section className="learning-summary">
              <h2>Un ciel, plusieurs façons de le regarder.</h2>
              <p>
                {state?.progress.visited.length}/12 découvertes parcourues. Les
                questions restent ouvertes.
              </p>
              <p>
                Vous pouvez poursuivre librement ou emporter une image de votre
                ciel.
              </p>
              <button
                className="learning-primary"
                disabled={photoBusy}
                onClick={photo}
              >
                {photoBusy
                  ? "Le papier se prépare…"
                  : "Emporter mon aquarelle · PNG HD"}
              </button>
              <button
                onClick={() => {
                  setSummary(false);
                  void pause();
                }}
              >
                Poursuivre le voyage
              </button>
              <button onClick={exit}>Quitter et garder ma progression</button>
            </section>
          )}
          <nav className="learning-tools" aria-label="Navigation et audio">
            {topic && (
              <button
                className="learning-return"
                onClick={() => journey.current.leave()}
              >
                Revenir au ciel
              </button>
            )}
            {!summary && (
              <>
                <button
                  aria-label={state?.paused ? "Reprendre" : "Pause"}
                  onClick={pause}
                >
                  <ToolIcon name={state?.paused ? "play" : "pause"} />
                </button>
                {!topic && (
                  <button
                    aria-label={
                      state?.travelling
                        ? "Suspendre le déplacement"
                        : "Avancer doucement"
                    }
                    aria-pressed={!state?.travelling}
                    onClick={() =>
                      journey.current.setTravelling(!state.travelling)
                    }
                  >
                    <ToolIcon name="breeze" />
                  </button>
                )}
                <button
                  aria-label={
                    muted ? "Activer la musique" : "Couper la musique"
                  }
                  aria-pressed={muted}
                  onClick={toggleSound}
                >
                  <ToolIcon name="sound" />
                </button>
                <button
                  aria-label="Recentrer le regard"
                  onClick={() => journey.current.recenter()}
                >
                  ◎
                </button>
                <button aria-label="Quitter le parcours" onClick={exit}>
                  <ToolIcon name="exit" />
                </button>
              </>
            )}
          </nav>
          {!state?.paused && !message && (
            <small className="learning-sensor-status">
              {!topic
                ? "Glissez pour guider · relâchez pour explorer"
                : gyroStatus === "active"
                  ? "Regard gyroscope · glissement disponible"
                  : "Glissez pour regarder à 360°"}
            </small>
          )}
          {state?.storageAvailable === false && (
            <small className="learning-storage-warning">
              La sauvegarde locale est indisponible ; le voyage reste
              accessible.
            </small>
          )}
        </>
      )}
      {(notice || twigs.error) && (
        <div className="learning-notice" role="status">
          <p>{notice || twigs.error}</p>
          <button
            aria-label="Fermer le message"
            onClick={() => {
              setNotice("");
              twigs.clearError();
            }}
          >
            ×
          </button>
        </div>
      )}
    </main>
  );
}
