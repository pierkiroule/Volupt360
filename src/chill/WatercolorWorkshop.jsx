import { useEffect, useRef, useState } from "react";
import { createSoundNest } from "../engine/createSoundNest.js";
import { useTwigBank } from "../sonoizo/useTwigBank.js";
import musicCatalog from "virtual:echo-music";
import { CHILL_UNIVERSE } from "./chillConfig.js";
import { ToolIcon } from "./ToolIcon.jsx";
import { WORKSHOP_BRUSHES, DEFAULT_WORKSHOP_BRUSH } from "./workshopBrushes.js";
import { createPaintingCanvas } from "./createPaintingCanvas.js";

export default function WatercolorWorkshop() {
  const stage = useRef(null),
    engine = useRef(null),
    paper = useRef(null),
    generation = useRef(0);
  const twigs = useTwigBank();
  const [started, setStarted] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [world, setWorld] = useState(false),
    [worldBusy, setWorldBusy] = useState(false),
    [count, setCount] = useState(0);
  const [brush, setBrush] = useState(DEFAULT_WORKSHOP_BRUSH.id),
    [color, setColor] = useState(DEFAULT_WORKSHOP_BRUSH.color),
    [size, setSize] = useState(18),
    [opacity, setOpacity] = useState(0.9);
  const [gyro, setGyro] = useState(false),
    [moving, setMoving] = useState(false),
    [dial, setDial] = useState(0),
    [paused, setPaused] = useState(false),
    [open, setOpen] = useState(true),
    [audioOpen, setAudioOpen] = useState(false),
    [vr, setVR] = useState(false);
  useEffect(() => {
    document.title = "OIZO •° — Un trait, plusieurs mondes";
    engine.current = createSoundNest(stage.current, { onError: setError });
    engine.current.setPaperVisible(true);
    paper.current = createPaintingCanvas(stage.current, setCount);
    paper.current.setVisible(false);
    let disposed = false;
    navigator.xr
      ?.isSessionSupported("immersive-vr")
      .then((v) => {
        if (!disposed) setVR(v);
      })
      .catch(() => {});
    return () => {
      disposed = true;
      generation.current++;
      paper.current?.dispose();
      paper.current = null;
      engine.current?.dispose();
      engine.current = null;
    };
  }, []);
  useEffect(() => {
    paper.current?.setConfig({ brush, color, size, opacity });
  }, [brush, color, size, opacity]);
  useEffect(() => {
    paper.current?.setVisible(started && !world);
    paper.current?.setEnabled(started && !paused && !world);
    engine.current?.setPaperVisible(!started || !world);
  }, [started, world, paused]);
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
      engine.current.setPadSource(bank);
      engine.current.pauseChillSession(false);
      paper.current.clear();
      setWorld(false);
      setMoving(false);
      setGyro(false);
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
  async function switchDimension() {
    if (worldBusy) return;
    setWorldBusy(true);
    setError("");
    const ticket = generation.current;
    try {
      engine.current.stopPanorama();
      setMoving(false);
      if (world) {
        await engine.current.requestContemplationGyroscope(false);
        setGyro(false);
        setWorld(false);
      } else {
        const doc = paper.current.getDocument();
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );
        if (ticket !== generation.current) return;
        engine.current.loadPaintingWorld(doc);
        setDial(0);
        setWorld(true);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      if (ticket === generation.current) setWorldBusy(false);
    }
  }
  async function toggleGyro() {
    try {
      setGyro(
        Boolean(await engine.current.requestContemplationGyroscope(!gyro)),
      );
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
        const a = twigs.bank.current.getSnapshot().ambience;
        if (a.loaded && !a.playing) await twigs.bank.current.toggleAmbience();
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
    setWorldBusy(false);
    setWorld(false);
  }
  return (
    <main
      className={`immersive chill-experience watercolor-workshop ${started ? "is-running" : ""}`}
      style={{ "--journey-ink": "#334452" }}
    >
      <div id="stage" ref={stage} />
      {!started && (
        <section className="chill-welcome">
          <span className="chill-eyebrow">Un trait, plusieurs mondes</span>
          <h1>OIZO •°</h1>
          <h2>Atelier de squiggles</h2>
          <p>
            Un fil, une vague, une empreinte… Dessinez librement sur le papier.
            À chaque matière, chacun peut donner son sens.
          </p>
          <p>
            Entrez ensuite dans ce même tableau : les couleurs deviennent un
            monde à 360°, vivant au rythme de la musique.
          </p>
          <button disabled={busy} onClick={start}>
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
              <div className="dimension-switch">
                <button
                  onClick={switchDimension}
                  disabled={worldBusy || (!world && !count)}
                  aria-label={
                    world
                      ? "Revenir au tableau 2D"
                      : "Entrer dans le tableau 3D"
                  }
                >
                  {worldBusy
                    ? "Ouverture…"
                    : world
                      ? "← Tableau 2D"
                      : "Explorer en 3D →"}
                </button>
              </div>
              {!world && (
                <>
                  <section
                    className="landscape-palette symbolic-palette"
                    aria-label="Matières symboliques"
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
                            setColor(b.color);
                          }}
                        >
                          <ToolIcon name={b.glyph} />
                          <span className="brush-name">{b.name}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                  <div className="paper-settings">
                    <label>
                      Couleur
                      <input
                        type="color"
                        aria-label="Couleur de la brosse"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                      />
                    </label>
                    <label>
                      Taille
                      <input
                        type="range"
                        aria-label="Taille de la brosse"
                        min="2"
                        max="80"
                        value={size}
                        onChange={(e) => setSize(Number(e.target.value))}
                      />
                    </label>
                    <label>
                      Opacité
                      <input
                        type="range"
                        aria-label="Opacité de la brosse"
                        min=".1"
                        max="1"
                        step=".05"
                        value={opacity}
                        onChange={(e) => setOpacity(Number(e.target.value))}
                      />
                    </label>
                    <button
                      aria-label="Annuler le dernier trait"
                      title="Annuler le dernier trait"
                      disabled={!count || paused}
                      onClick={() => paper.current.undo()}
                    >
                      <ToolIcon name="undo" />
                    </button>
                  </div>
                </>
              )}
              {world && (
                <label className="sculpture-depth">
                  Panorama
                  <input
                    aria-label="Molette panorama"
                    type="range"
                    min="-180"
                    max="180"
                    value={dial}
                    onChange={(e) => {
                      setDial(Number(e.target.value));
                      engine.current.setPanoramaDial(e.target.value);
                    }}
                  />
                  <output>{dial}°</output>
                </label>
              )}
              <div className="pictorial-commands">
                {world && (
                  <>
                    <button
                      disabled={paused}
                      onClick={toggleTravel}
                      aria-label={
                        moving
                          ? "Pause du voyage"
                          : "Voyager dans la direction du regard"
                      }
                      title={moving ? "Pause du voyage" : "Voyager"}
                    >
                      <ToolIcon name={moving ? "pause" : "play"} />
                    </button>
                    <button
                      onClick={toggleGyro}
                      aria-label={
                        gyro
                          ? "Désactiver le gyroscope"
                          : "Activer le gyroscope"
                      }
                      aria-pressed={gyro}
                    >
                      <ToolIcon name="view" />
                    </button>
                    {vr && (
                      <button
                        aria-label="Entrer en VR"
                        title="Entrer en VR"
                        onClick={() =>
                          engine.current
                            .enterVR()
                            .catch((e) => setError(e.message))
                        }
                      >
                        <ToolIcon name="vr" />
                      </button>
                    )}
                  </>
                )}
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
