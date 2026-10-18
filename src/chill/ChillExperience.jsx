import { createWatercolorAlpha } from "./createWatercolorAlpha.js";
import { useEffect, useRef, useState } from "react";
import { createSoundNest } from "../engine/createSoundNest.js";
import { useTwigBank } from "../sonoizo/useTwigBank.js";
import musicCatalog from "virtual:echo-music";
import {
  CHILL_BRUSHES,
  CHILL_FRAGMENTS,
  CHILL_UNIVERSE,
} from "./chillConfig.js";

export default function ChillExperience() {
  const stage = useRef(null),
    engine = useRef(null),
    timer = useRef(null),
    finalTimer = useRef(null),
    busyText = useRef(false),
    photoUrl = useRef(null),
    generation = useRef(0);
  const twigs = useTwigBank();
  const [started, setStarted] = useState(false),
    [busy, setBusy] = useState(false),
    [ended, setEnded] = useState(false),
    [finalReady, setFinalReady] = useState(false),
    [paused, setPaused] = useState(false),
    [view, setView] = useState("drone"),
    [viewHint, setViewHint] = useState(""),
    [brush, setBrush] = useState(CHILL_BRUSHES[0].id),
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
    document.title =
      "L’Oizo de l’Haïkuarelle Virtuelle — Six minutes pour peindre le ciel";
    try {
      engine.current = createSoundNest(stage.current, {
        onError: setError,
        onHint: setViewHint,
        onSessionProgress: (_, state) => {
          setDeparting(state.departing);
          setPhase(state.phase);
          setLight(state.dawn);
        },
        onSessionInterrupted: () => setPaused(true),
        onPoeticFragment: (fragment) => {
          if (busyText.current || document.hidden) return false;
          busyText.current = true;
          setText(fragment);
          timer.current = setTimeout(() => {
            setText(null);
            busyText.current = false;
          }, 5000);
          return true;
        },
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
      await bank.preparePlayback();
      if (ticket !== generation.current) return;
      engine.current.setMood(CHILL_UNIVERSE, CHILL_BRUSHES);
      engine.current.setPoeticFragments(CHILL_FRAGMENTS);
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
    busyText.current = false;
    setText(null);
    twigs.bank.current?.cancelAmbienceLoad();
    twigs.bank.current?.pauseAmbience();
    twigs.bank.current?.stopAll();
    engine.current?.pauseChillSession(true);
    engine.current?.setPadSource(null);
    engine.current?.reset();
    setStarted(false);
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
      className={`immersive chill-experience ${started ? "is-running" : ""} phase-${phase}`}
      style={{
        "--journey-ink": `rgb(${Math.round(228 - light * 175)}, ${Math.round(236 - light * 160)}, ${Math.round(230 - light * 148)})`,
      }}
    >
      <div id="stage" ref={stage} />
      <header className="brand">
        <h1>OIZO •°</h1>
        <p>L’Oizo de l’Haïkuarelle Virtuelle</p>
      </header>
      {!started && (
        <section className="chill-welcome">
          <span className="chill-eyebrow">
            Un carnet ouvert sur l’invisible
          </span>
          <h2>L’Oizo de l’Haïkuarelle Virtuelle</h2>
          <p>
            Touchez pour peindre, glissez pour guider l’oizo. Sans toucher, il
            rejoint doucement une bulle de haïku.
          </p>
          <p>
            Six minutes pour peindre le ciel. Vous pouvez faire une pause à tout
            moment.
          </p>
          <button disabled={busy} onClick={start}>
            {busy ? "Le papier s’éveille…" : "Prendre son envol"}
          </button>
          <small>
            Une expérience artistique pour faire une pause et explorer son
            attention. Elle ne remplace pas un accompagnement thérapeutique.
          </small>
        </section>
      )}
      {started && !ended && (
        <>
          <nav className="camera-views is-compact" aria-label="Vues caméra">
            {[
              ["drone", "FPV", "FPV"],
              ["gyro", "Gyro 360°", "◎"],
            ].map(([id, label, glyph]) => (
              <button
                key={id}
                aria-label={label}
                aria-pressed={view === id}
                disabled={departing}
                onClick={() => {
                  engine.current.setCameraMode(id);
                  setView(id);
                }}
              >
                {glyph}
              </button>
            ))}
          </nav>
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
          {view === "gyro" && (
            <p className="gyro-guidance" role="status">
              {viewHint}
            </p>
          )}
          {view === "gyro" && (
            <button
              className="gyro-recenter"
              aria-label="Recentrer la vue 360°"
              onClick={() => engine.current.setCameraMode("gyro")}
            >
              ↺
            </button>
          )}
          <section className="landscape-palette" aria-label="Six brosses chill">
            <div role="group" aria-label="Choisir une brosse">
              {CHILL_BRUSHES.map((b) => (
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
          {text && (
            <div key={text.id} className="poetic-fragment" role="status">
              <p>{text.text}</p>
            </div>
          )}
          {departing && (
            <p className="chill-departure" role="status">
              Le geste s’apaise. L’oizo poursuit son chemin.
            </p>
          )}
        </>
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
            <a href={photo} download="Haikuarelle-Virtuelle-souvenir.png">
              Télécharger la photo PNG HD
            </a>
          )}
          <p>Vous pouvez laisser reposer votre regard.</p>
        </section>
      )}
      {(error || twigs.error) && (
        <p className="ambience-error" role="status">
          {error || twigs.error}
        </p>
      )}
    </main>
  );
}
