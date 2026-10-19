import { HaikuGift } from "./HaikuGift.jsx";
import { MaterialGlyph } from "./MaterialGlyph.jsx";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
    generation = useRef(0),
    worldSource = useRef(null);
  const twigs = useTwigBank();
  const [haiku, setHaiku] = useState(null);
  const [started, setStarted] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [world, setWorld] = useState(false),
    [worldBusy, setWorldBusy] = useState(false),
    [count, setCount] = useState(0);
  const [draw3D, setDraw3D] = useState(true);
  const [stickerMode, setStickerMode] = useState(false);
  const [stickerSize, setStickerSize] = useState(64);
  const [stickerOpacity, setStickerOpacity] = useState(0.9);
  const [brush, setBrush] = useState(DEFAULT_WORKSHOP_BRUSH.id),
    [color, setColor] = useState(DEFAULT_WORKSHOP_BRUSH.color),
    [size, setSize] = useState(18),
    [opacity, setOpacity] = useState(0.72);
  const [gyro, setGyro] = useState(false),
    [moving, setMoving] = useState(false),
    [dial, setDial] = useState(0),
    [paused, setPaused] = useState(false),
    [open, setOpen] = useState(true),
    [audioOpen, setAudioOpen] = useState(false),
    [vr, setVR] = useState(false);
  useEffect(() => {
    document.title =
      "Haïkuarelle Virtuelle •° — Un geste, un paysage, un poème";
    engine.current = createSoundNest(stage.current, {
      onError: setError,
      onHaikuReveal: setHaiku,
    });
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
    paper.current?.setConfig({
      mode: stickerMode ? "sticker" : "paint",
      glyph: brush,
      brush,
      color,
      size: !world && stickerMode ? stickerSize : size,
      opacity: !world && stickerMode ? stickerOpacity : opacity,
    });
  }, [
    brush,
    color,
    size,
    opacity,
    stickerMode,
    stickerSize,
    stickerOpacity,
    world,
  ]);
  useLayoutEffect(() => {
    paper.current?.setVisible(started && !world);
    paper.current?.setEnabled(started && !paused && !world);
    engine.current?.setPaperVisible(!started || !world);
  }, [started, world, paused]);
  useEffect(() => {
    engine.current?.setWorldPainting(
      started && world && draw3D && !paused && !haiku,
      world ? { brush, color, size, opacity } : null,
    );
  }, [started, world, draw3D, paused, brush, color, size, opacity, haiku]);
  useEffect(() => {
    engine.current?.pauseChillSession(paused || Boolean(haiku));
  }, [paused, haiku]);
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
      worldSource.current = null;
      setHaiku(null);
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
        // Request sensor access inside the trusted click, before yielding a frame.
        const gyroRequest = engine.current.requestContemplationGyroscope(true);
        const doc = paper.current.getDocument();
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );
        if (ticket !== generation.current) return;
        const source = JSON.stringify(doc);
        if (worldSource.current !== source) {
          engine.current.loadPaintingWorld(doc);
          worldSource.current = source;
        }
        setDial(0);
        setWorld(true);
        setGyro(Boolean(await gyroRequest));
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
          <span className="chill-eyebrow">
            Un geste · Un paysage · Un poème
          </span>
          <h1>
            Haïkuarelle
            <br />
            Virtuelle •°
          </h1>
          <h2>Le papier abrite un ciel</h2>
          <p>
            Un trait, une tache, un peu d’eau… Laissez les pigments inventer un
            paysage, puis entrez dans votre aquarelle à 360°.
          </p>
          <p>
            Quelque part dans vos traces, une bulle-graine abrite un haïku.
            Trouvez-la, touchez-la : le paysage vous offre un poème.
          </p>
          <p className="sensory-note">
            Rien à réussir. Chaque matière, chaque rencontre peut prendre le
            sens que vous lui donnez. Aucune interprétation psychologique
            automatique.
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
              {
                <>
                  {!world ? (
                    <div
                      className="paper-mode"
                      role="group"
                      aria-label="Mode de création"
                    >
                      <button
                        aria-pressed={!stickerMode}
                        onClick={() => setStickerMode(false)}
                      >
                        Peindre
                      </button>
                      <button
                        aria-pressed={stickerMode}
                        onClick={() => setStickerMode(true)}
                      >
                        Stickers
                      </button>
                    </div>
                  ) : (
                    <div
                      className="paper-mode"
                      role="group"
                      aria-label="Interaction en 3D"
                    >
                      <button
                        aria-pressed={draw3D}
                        onClick={() => setDraw3D(true)}
                      >
                        Peindre en 3D
                      </button>
                      <button
                        aria-pressed={!draw3D}
                        onClick={() => setDraw3D(false)}
                      >
                        Regarder
                      </button>
                    </div>
                  )}
                  <section
                    className="landscape-palette symbolic-palette"
                    aria-label="Matières symboliques"
                  >
                    <div role="group" aria-label="Choisir une brosse">
                      {WORKSHOP_BRUSHES.map((b) => (
                        <button
                          key={b.id}
                          aria-label={b.name}
                          title={`${b.name} · ${b.sensory.quality}`}
                          aria-pressed={brush === b.id}
                          disabled={paused}
                          style={{ "--brush-color": b.color }}
                          onClick={() => {
                            setBrush(b.id);
                            setColor(b.color);
                          }}
                        >
                          <MaterialGlyph id={b.id} />
                          <span className="brush-name">{b.name}</span>
                        </button>
                      ))}
                    </div>
                    <p className="sensory-hint" aria-live="polite">
                      {
                        WORKSHOP_BRUSHES.find((b) => b.id === brush)?.sensory
                          .quality
                      }{" "}
                      · à votre façon
                    </p>
                  </section>
                  <details
                    key={!world && stickerMode ? "sticker" : "paint"}
                    className="paper-adjustments"
                    open={(!world && stickerMode) || undefined}
                  >
                    <summary aria-label="Réglages de la brosse">
                      Réglages
                    </summary>
                    <div className="paper-settings">
                      {(world || !stickerMode) && (
                        <label>
                          Couleur
                          <input
                            type="color"
                            aria-label="Couleur de la brosse"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                          />
                        </label>
                      )}
                      <label>
                        Taille
                        <input
                          type="range"
                          aria-label={
                            !world && stickerMode
                              ? "Taille du sticker"
                              : "Taille de la brosse"
                          }
                          min="2"
                          max={!world && stickerMode ? "160" : "80"}
                          value={!world && stickerMode ? stickerSize : size}
                          onChange={(e) =>
                            (!world && stickerMode ? setStickerSize : setSize)(
                              Number(e.target.value),
                            )
                          }
                        />
                      </label>
                      <label>
                        Opacité
                        <input
                          type="range"
                          aria-label={
                            !world && stickerMode
                              ? "Opacité du sticker"
                              : "Opacité de la brosse"
                          }
                          min=".1"
                          max="1"
                          step=".05"
                          value={
                            !world && stickerMode ? stickerOpacity : opacity
                          }
                          onChange={(e) =>
                            (!world && stickerMode
                              ? setStickerOpacity
                              : setOpacity)(Number(e.target.value))
                          }
                        />
                      </label>
                    </div>
                  </details>
                </>
              }
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
                {!world && (
                  <button
                    aria-label="Annuler le dernier trait"
                    title="Annuler le dernier trait"
                    disabled={!count || paused}
                    onClick={() => paper.current.undo()}
                  >
                    <ToolIcon name="undo" />
                  </button>
                )}

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
            aria-controls="pictorial-tool-panel"
            onClick={() => setOpen(!open)}
          >
            <ToolIcon name={open ? "fold" : "expand"} />
          </button>
        </nav>
      )}
      {haiku && <HaikuGift poem={haiku} onClose={() => setHaiku(null)} />}
      {(error || twigs.error) && (
        <p className="ambience-error" role="status">
          {error || twigs.error}
        </p>
      )}
    </main>
  );
}
