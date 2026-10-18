import { createWatercolorAlpha } from "./createWatercolorAlpha.js";
import { useEffect, useRef, useState } from "react";
import { createSoundNest } from "../engine/createSoundNest.js";
import { useTwigBank } from "../sonoizo/useTwigBank.js";
import musicCatalog from "virtual:echo-music";
import { CHILL_UNIVERSE } from "./chillConfig.js";
import {
  MOOD_BRUSHES,
  NEUTRAL_BRUSH,
  OIZO_BULLE_BRUSHES,
} from "./moodBrushes.js";
import { CONTEMPLATIVE_PHRASES } from "./contemplativePhrases.js";

export default function ChillExperience() {
  const stage = useRef(null),
    engine = useRef(null),
    timer = useRef(null),
    finalTimer = useRef(null),
    photoUrl = useRef(null),
    generation = useRef(0);
  const twigs = useTwigBank();
  const [started, setStarted] = useState(false),
    [busy, setBusy] = useState(false),
    [ended, setEnded] = useState(false),
    [finalReady, setFinalReady] = useState(false),
    [paused, setPaused] = useState(false),
    [contemplating, setContemplating] = useState(false),
    [useGyro, setUseGyro] = useState(false),
    [brush, setBrush] = useState(NEUTRAL_BRUSH.id),
    [departing, setDeparting] = useState(false),
    [phase, setPhase] = useState("night"),
    [light, setLight] = useState(0),
    [text, setText] = useState(null),
    [error, setError] = useState(""),
    [photo, setPhoto] = useState(null),
    [photoBusy, setPhotoBusy] = useState(false);
  useEffect(() => {
    stage.current.parentElement.style.setProperty(
      "--paper-alpha",
      `url("${createWatercolorAlpha("wash", 731, 256).toDataURL()}")`,
    );
    document.title = "OIZO-BULLE •° — Sculpter son ciel";
    try {
      engine.current = createSoundNest(stage.current, {
        onError: setError,
        onContemplationChange: (active, fragment) => {
          clearTimeout(timer.current);
          setContemplating(active);
          setText(active ? fragment : null);
          if (active) timer.current = setTimeout(() => setText(null), 5000);
        },
        onSessionProgress: (_, state) => {
          setDeparting(state.departing);
          setPhase(state.phase);
          setLight(state.dawn);
        },
        onSessionInterrupted: () => setPaused(true),
        onSessionComplete: () => {
          clearTimeout(timer.current);
          setText(null);
          twigs.bank.current?.pauseAmbience();
          twigs.bank.current?.stopAll();
          setEnded(true);
          finalTimer.current = setTimeout(() => setFinalReady(true), 3500);
          engine.current?.setCameraMode("global");
        },
      });
    } catch (e) {
      setError(`La scène ne peut pas démarrer : ${e.message}`);
    }
    return () => {
      generation.current++;
      clearTimeout(timer.current);
      clearTimeout(finalTimer.current);
      engine.current?.dispose();
      engine.current = null;
      if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
    };
  }, []);
  async function start() {
    if (busy) return;
    setBusy(true);
    setError("");
    const ticket = ++generation.current;
    try {
      const bank = twigs.bank.current;
      // Start both native unlocks in the trusted click, before any await.
      await Promise.all([
        bank.preparePlayback(),
        engine.current.requestContemplationGyroscope(useGyro),
      ]);
      if (ticket !== generation.current) return;
      engine.current.setMood(
        { ...CHILL_UNIVERSE, resonanceBubbles: true },
        OIZO_BULLE_BRUSHES,
      );
      engine.current.setBrush(NEUTRAL_BRUSH.id);
      setBrush(NEUTRAL_BRUSH.id);
      engine.current.setPoeticFragments(CONTEMPLATIVE_PHRASES);
      engine.current.setPadSource(bank);
      engine.current.setCameraMode("drone");
      const journeyMusic =
        musicCatalog.find((track) => /(?:^|\/)gravity\.mp3$/i.test(track)) ??
        musicCatalog[0];
      if (journeyMusic) {
        const loaded = await bank.loadMoodAmbience(
          `${import.meta.env.BASE_URL}${journeyMusic}`,
        );
        if (ticket !== generation.current) return;
        if (loaded) await bank.toggleAmbience();
      }
      if (ticket !== generation.current) return;
      engine.current.startChillSession();
      setStarted(true);
    } catch (e) {
      setError(e.message);
    } finally {
      if (ticket === generation.current) setBusy(false);
    }
  }
  async function pause() {
    if (!paused) {
      engine.current.pauseChillSession(true);
      twigs.bank.current.pauseAmbience();
      setPaused(true);
      return;
    }
    try {
      await twigs.bank.current.preparePlayback();
      const state = twigs.bank.current.getSnapshot().ambience;
      if (state.loaded && !state.playing)
        await twigs.bank.current.toggleAmbience();
      engine.current.pauseChillSession(false);
      setPaused(false);
    } catch (e) {
      setError(e.message);
    }
  }
  function exit() {
    generation.current++;
    clearTimeout(finalTimer.current);
    clearTimeout(timer.current);
    setText(null);
    twigs.bank.current?.cancelAmbienceLoad();
    twigs.bank.current?.pauseAmbience();
    twigs.bank.current?.stopAll();
    engine.current?.pauseChillSession(true);
    engine.current?.setPadSource(null);
    engine.current?.reset();
    setStarted(false);
    setContemplating(false);
    setEnded(false);
    setFinalReady(false);
    setPaused(false);
    setDeparting(false);
    setPhase("night");
    setLight(0);
    setBusy(false);
    if (photoUrl.current) {
      URL.revokeObjectURL(photoUrl.current);
      photoUrl.current = null;
    }
    setPhoto(null);
  }
  async function souvenir() {
    if (photoBusy) return;
    setPhotoBusy(true);
    const ticket = generation.current;
    try {
      const blob = await engine.current.exportPhoto();
      if (ticket !== generation.current) return;
      if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
      photoUrl.current = URL.createObjectURL(blob);
      setPhoto(photoUrl.current);
    } catch (e) {
      setError(e.message);
    } finally {
      setPhotoBusy(false);
    }
  }
  return (
    <main
      className={`immersive chill-experience ${started ? "is-running" : ""} ${contemplating ? "is-contemplating" : ""} phase-${phase}`}
      style={{
        "--journey-ink": `rgb(${Math.round(228 - light * 175)}, ${Math.round(236 - light * 160)}, ${Math.round(230 - light * 148)})`,
      }}
    >
      <div id="stage" ref={stage} />
      <header className="brand">
        <h1>OIZO-BULLE •°</h1>
        <p>
          On sculpte son ciel émotionnel pour apprendre à le contempler
          autrement.
        </p>
      </header>
      {!started && (
        <section className="chill-welcome">
          <span className="chill-eyebrow">
            Un carnet ouvert sur l’invisible
          </span>
          <h2>OIZO-BULLE •°</h2>
          <p className="oizo-bulle-intention">
            On sculpte son ciel émotionnel pour apprendre à le contempler
            autrement.
          </p>
          <p>
            Touchez pour peindre, glissez pour guider l’oizo. Sans toucher, il
            poursuit son vol. Une bulle peut ouvrir un autre regard sur votre
            ciel.
          </p>
          <p>
            Six minutes pour peindre le ciel. Vous pouvez faire une pause à tout
            moment.
          </p>
          <label className="gyro-opt-in">
            <input
              type="checkbox"
              checked={useGyro}
              onChange={(event) => setUseGyro(event.target.checked)}
            />
            Utiliser le gyroscope dans les bulles (facultatif)
          </label>
          <button disabled={busy} onClick={start}>
            {busy ? "Le papier s’éveille…" : "Prendre son envol"}
          </button>
          <small>
            Une expérience artistique pour faire une pause et explorer son
            attention. Elle ne remplace pas un accompagnement thérapeutique.
          </small>
        </section>
      )}
      {started && !ended && !contemplating && (
        <>
          <button className="chill-pause" onClick={pause}>
            {paused ? "Reprendre" : "Faire une pause"}
          </button>
          <button className="chill-exit" onClick={exit}>
            Sortir
          </button>
          <label className="journey-audio">
            Son
            <input
              aria-label="Volume musical"
              type="range"
              min="0"
              max="1"
              step=".01"
              value={twigs.snapshot.ambience?.volume ?? 0.45}
              onChange={(e) =>
                twigs.bank.current?.setAmbienceVolume(e.target.value)
              }
            />
          </label>
          <section className="landscape-palette" aria-label="Mood Brushes">
            <div role="group" aria-label="Choisir une brosse">
              {[...MOOD_BRUSHES, NEUTRAL_BRUSH].map((b) => (
                <button
                  key={b.id}
                  aria-label={b.name}
                  title={b.name}
                  aria-pressed={brush === b.id}
                  disabled={departing || paused}
                  style={{ "--brush-color": b.color }}
                  onClick={() => {
                    setBrush(b.id);
                    engine.current.setBrush(b.id);
                  }}
                >
                  {b.glyph}
                </button>
              ))}
            </div>
          </section>
          {departing && (
            <p className="chill-departure" role="status">
              Le geste s’apaise. L’oizo poursuit son chemin.
            </p>
          )}
        </>
      )}
      {contemplating && !ended && (
        <section
          className="resonance-contemplation"
          aria-label="Contemplation 360°"
        >
          {text && (
            <div
              key={text.id}
              className="poetic-fragment resonance-phrase"
              role="status"
            >
              <p>{text.text}</p>
            </div>
          )}
          <button
            className="resume-flight"
            onClick={() => engine.current.resumeFlight()}
          >
            Reprendre le vol
          </button>
        </section>
      )}
      {ended && (
        <section className="chill-ending">
          <h2>Votre paysage se dépose</h2>
          <p>Votre passage a laissé ce paysage.</p>
          <button onClick={souvenir} disabled={photoBusy || !finalReady}>
            {!finalReady
              ? "Le paysage s’ouvre…"
              : photoBusy
                ? "Préparation…"
                : "Préparer ma photo souvenir"}
          </button>
          {photo && (
            <a href={photo} download="Oizo-Bulle-souvenir.png">
              Télécharger la photo PNG HD
            </a>
          )}
          <p>Vous pouvez laisser reposer votre regard.</p>
        </section>
      )}
      {!contemplating && (error || twigs.error) && (
        <p className="ambience-error" role="status">
          {error || twigs.error}
        </p>
      )}
    </main>
  );
}
