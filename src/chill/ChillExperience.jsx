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
    busyText = useRef(false),
    photoUrl = useRef(null),
    generation = useRef(0);
  const twigs = useTwigBank();
  const [started, setStarted] = useState(false),
    [busy, setBusy] = useState(false),
    [ended, setEnded] = useState(false),
    [paused, setPaused] = useState(false),
    [view, setView] = useState("drone"),
    [brush, setBrush] = useState(CHILL_BRUSHES[0].id),
    [seconds, setSeconds] = useState(0),
    [text, setText] = useState(null),
    [score, setScore] = useState(0),
    [error, setError] = useState(""),
    [photo, setPhoto] = useState(null),
    [photoBusy, setPhotoBusy] = useState(false);
  useEffect(() => {
    stage.current.parentElement.style.setProperty(
      "--paper-alpha",
      `url("${createWatercolorAlpha("wash", 731, 256).toDataURL()}")`,
    );
    document.title =
      "L’Oizo de l’Haïkuarelle Virtuelle — cinq minutes d’aquarelle et d’encre";
    try {
      engine.current = createSoundNest(stage.current, {
        onError: setError,
        onBubbleScore: setScore,
        onSessionProgress: setSeconds,
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
          engine.current?.setCameraMode("global");
        },
      });
    } catch (e) {
      setError(`La scène ne peut pas démarrer : ${e.message}`);
    }
    return () => {
      generation.current++;
      clearTimeout(timer.current);
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
      if (musicCatalog[0]) {
        const loaded = await bank.loadMoodAmbience(
          `${import.meta.env.BASE_URL}${musicCatalog[0]}`,
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
    const next = !paused;
    setPaused(next);
    engine.current.pauseChillSession(next);
    if (next) twigs.bank.current.pauseAmbience();
    else {
      await twigs.bank.current.preparePlayback();
      if (
        twigs.bank.current.getSnapshot().ambience.loaded &&
        !twigs.bank.current.getSnapshot().ambience.playing
      )
        await twigs.bank.current.toggleAmbience();
    }
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
    <main className="immersive chill-experience">
      <div id="stage" ref={stage} />
      <header className="brand">
        <h1>L’Oizo de l’Haïkuarelle Virtuelle</h1>
        <p>Cinq minutes d’aquarelle et d’encre</p>
      </header>
      {!started && (
        <section className="chill-welcome">
          <span className="chill-eyebrow">
            Un carnet ouvert sur l’invisible
          </span>
          <h2>
            Laisser les couleurs
            <br />
            respirer
          </h2>
          <p>
            Guidez l’oizo du bout du doigt. Ses traces deviennent un paysage.
            Sans toucher, il rejoint les bulles de haïkus.
          </p>
          <p>
            Un voyage d’aquarelle et d’encre de cinq minutes, à votre rythme.
            Vous pouvez faire une pause à tout moment.
          </p>
          <button disabled={busy} onClick={start}>
            {busy ? "Le papier s’éveille…" : "Prendre cinq minutes"}
          </button>
          <small>
            Une expérience artistique pour faire une pause et explorer son
            attention. Elle ne remplace pas un accompagnement thérapeutique.
          </small>
        </section>
      )}
      {started && !ended && (
        <>
          <output className="chill-time" aria-label="Temps restant">
            {Math.floor(Math.max(0, 300 - seconds) / 60)}:
            {String(Math.max(0, 300 - seconds) % 60).padStart(2, "0")}
          </output>
          <nav className="camera-views is-compact" aria-label="Vues caméra">
            {[
              ["drone", "FPV", "FPV"],
              ["gyro", "Gyro 360°", "◎"],
            ].map(([id, label, glyph]) => (
              <button
                key={id}
                aria-label={label}
                aria-pressed={view === id}
                disabled={seconds >= 300}
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
          <section className="landscape-palette" aria-label="Six brosses chill">
            <div role="group" aria-label="Choisir une brosse">
              {CHILL_BRUSHES.map((b) => (
                <button
                  key={b.id}
                  aria-label={b.name}
                  title={b.name}
                  aria-pressed={brush === b.id}
                  disabled={seconds >= 300 || paused}
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
          <output className="bubble-score">Haïkus révélés · {score}/24</output>
          {text && (
            <div key={text.id} className="poetic-fragment" role="status">
              <p>{text.text}</p>
            </div>
          )}
          {seconds >= 300 && (
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
          <button onClick={souvenir} disabled={photoBusy}>
            {photoBusy ? "Préparation…" : "Préparer ma photo souvenir"}
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
