import { useEffect, useRef, useState } from "react";
import { createSoundNest } from "../engine/createSoundNest.js";
import { useTwigBank } from "../sonoizo/useTwigBank.js";
import musicCatalog from "virtual:echo-music";
import { CHILL_UNIVERSE } from "./chillConfig.js";
import { ToolIcon } from "./ToolIcon.jsx";
import { WORKSHOP_BRUSHES, DEFAULT_WORKSHOP_BRUSH } from "./workshopBrushes.js";

export default function WatercolorWorkshop() {
  const stage = useRef(null),
    engine = useRef(null),
    generation = useRef(0);
  const twigs = useTwigBank();
  const [started, setStarted] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [brush, setBrush] = useState(DEFAULT_WORKSHOP_BRUSH.id),
    [gyro, setGyro] = useState(false),
    [moving, setMoving] = useState(false),
    [dial, setDial] = useState(0),
    [paused, setPaused] = useState(false),
    [open, setOpen] = useState(true),
    [audioOpen, setAudioOpen] = useState(false),
    [depth, setDepth] = useState(0);
  useEffect(() => {
    document.title = "OIZO •° — Atelier aquarelle";
    engine.current = createSoundNest(stage.current, {
      onError: setError,
      onSculptureDepthChange: setDepth,
    });
    return () => {
      generation.current++;
      engine.current?.dispose();
      engine.current = null;
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
      engine.current.setMood(
        {
          ...CHILL_UNIVERSE,
          background: "#ffffff",
          workshop: true,
          resonanceBubbles: false,
          constellation: false,
        },
        WORKSHOP_BRUSHES,
      );
      engine.current.setPoeticFragments([]);
      engine.current.setSculptureDepth(0);
      engine.current.setBrush(DEFAULT_WORKSHOP_BRUSH.id);
      engine.current.setPadSource(bank);
      engine.current.setCameraMode("panorama");
      engine.current.pauseChillSession(false);
      setBrush(DEFAULT_WORKSHOP_BRUSH.id);
      setGyro(false);
      setMoving(false);
      setDial(0);
      setPaused(false);
      const track =
        musicCatalog.find((t) => /(?:^|\/)gravity\.mp3$/i.test(t)) ??
        musicCatalog[0];
      if (track) {
        const loaded = await bank.loadMoodAmbience(
          `${import.meta.env.BASE_URL}${track}`,
        );
        if (ticket !== generation.current) return;
        if (loaded) await bank.toggleAmbience();
      }
      if (ticket === generation.current) setStarted(true);
    } catch (e) {
      setError(e.message);
    } finally {
      if (ticket === generation.current) setBusy(false);
    }
  }
  async function switchView() {
    try {
      const enabled = await engine.current.requestContemplationGyroscope(!gyro);
      setGyro(Boolean(enabled));
    } catch (e) {
      setError(e.message);
    }
  }
  function toggleTravel() {
    if (moving) engine.current.stopPanorama();
    else engine.current.travelPanorama();
    setMoving(!moving);
  }
  async function togglePause() {
    try {
      if (paused) {
        await twigs.bank.current.preparePlayback();
        const audio = twigs.bank.current.getSnapshot().ambience;
        if (audio.loaded && !audio.playing)
          await twigs.bank.current.toggleAmbience();
      } else twigs.bank.current.pauseAmbience();
      engine.current.pauseChillSession(!paused);
      setPaused(!paused);
    } catch (e) {
      setError(e.message);
    }
  }
  function exit() {
    generation.current++;
    twigs.bank.current?.cancelAmbienceLoad();
    twigs.bank.current?.pauseAmbience();
    twigs.bank.current?.stopAll();
    engine.current.pauseChillSession(true);
    engine.current.setPadSource(null);
    engine.current.reset();
    setStarted(false);
    setBusy(false);
  }
  return (
    <main
      className={`immersive chill-experience watercolor-workshop ${started ? "is-running" : ""}`}
      style={{ "--journey-ink": "#334452" }}
    >
      <div id="stage" ref={stage} />
      {!started && (
        <section className="chill-welcome">
          <span className="chill-eyebrow">
            Un ciel de papier, un vol d’encre
          </span>
          <h1>OIZO •°</h1>
          <h2>Atelier aquarelle</h2>
          <p>
            Peignez avec un doigt dans un panorama à 360°. Deux doigts ou la
            molette orientent le regard ; pincez pour choisir la profondeur.
          </p>
          <p>
            Visez une direction puis touchez Voyager. La pause du voyage permet
            de peindre sur place. Activez le gyroscope pour regarder autour de
            vous avec le téléphone.
          </p>
          <button onClick={start} disabled={busy}>
            {busy ? "Le papier s’éveille…" : "Ouvrir l’atelier"}
          </button>
        </section>
      )}
      {started && (
        <nav
          className={`pictorial-tools ${open ? "is-open" : "is-folded"}`}
          aria-label="Outils de peinture"
        >
          {open && (
            <div id="pictorial-tool-panel">
              <section
                className="landscape-palette"
                aria-label="Matières picturales"
              >
                <div role="group" aria-label="Choisir une brosse">
                  {WORKSHOP_BRUSHES.map((b) => (
                    <button
                      key={b.id}
                      aria-label={b.name}
                      title={b.name}
                      aria-pressed={brush === b.id}
                      disabled={paused}
                      style={{ "--brush-color": b.color }}
                      onClick={() => {
                        setBrush(b.id);
                        engine.current.setBrush(b.id);
                      }}
                    >
                      <ToolIcon name={b.glyph} />
                    </button>
                  ))}
                </div>
              </section>
              {
                <label className="sculpture-depth">
                  Profondeur
                  <input
                    aria-label="Profondeur de dessin"
                    type="range"
                    min="-10"
                    max="10"
                    step=".25"
                    value={depth}
                    onChange={(e) =>
                      engine.current.setSculptureDepth(e.target.value)
                    }
                  />
                  <output>{depth.toFixed(1)}</output>
                </label>
              }
              <label className="sculpture-depth">
                Panorama
                <input
                  aria-label="Molette panorama"
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={dial}
                  onChange={(e) => {
                    setDial(Number(e.target.value));
                    engine.current.setPanoramaDial(e.target.value);
                  }}
                />
                <output>{dial}°</output>
              </label>
              <div className="pictorial-commands">
                <button
                  onClick={toggleTravel}
                  disabled={paused}
                  aria-label={
                    moving
                      ? "Pause du voyage"
                      : "Voyager dans la direction du regard"
                  }
                  title={moving ? "Pause du voyage" : "Voyager"}
                  aria-pressed={moving}
                >
                  <ToolIcon name={moving ? "pause" : "play"} />
                </button>
                <button
                  onClick={switchView}
                  aria-label={
                    gyro ? "Désactiver le gyroscope" : "Activer le gyroscope"
                  }
                  title={"Orientation du téléphone"}
                  aria-pressed={gyro}
                >
                  <ToolIcon name="view" />
                </button>
                <button
                  onClick={togglePause}
                  aria-label={paused ? "Reprendre" : "Faire une pause"}
                >
                  <ToolIcon name={paused ? "play" : "pause"} />
                </button>
                <button
                  onClick={() => setAudioOpen(!audioOpen)}
                  aria-label="Réglage du son"
                  aria-expanded={audioOpen}
                >
                  <ToolIcon name="sound" />
                </button>
                <button onClick={exit} aria-label="Sortir">
                  <ToolIcon name="exit" />
                </button>
              </div>
              {audioOpen && (
                <div id="pictorial-volume">
                  <input
                    aria-label="Volume musical"
                    type="range"
                    min="0"
                    max="1"
                    step=".01"
                    value={twigs.snapshot.ambience?.volume ?? 0.45}
                    onChange={(e) =>
                      twigs.bank.current.setAmbienceVolume(e.target.value)
                    }
                  />
                </div>
              )}
            </div>
          )}
          <button
            className="tools-toggle"
            aria-label={open ? "Replier les outils" : "Déplier les outils"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <ToolIcon name={open ? "fold" : "expand"} />
          </button>
        </nav>
      )}
      {(error || twigs.error) && (
        <p className="ambience-error" role="status">
          {error || twigs.error}
        </p>
      )}
    </main>
  );
}
