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
  const twigs = useTwigBank({ poeticVoices: false });
  const [started, setStarted] = useState(false),
    [world, setWorld] = useState(false),
    [busy, setBusy] = useState(false),
    [count, setCount] = useState(0);
  const [brush, setBrush] = useState(DEFAULT_WORKSHOP_BRUSH.id),
    [moving, setMoving] = useState(false),
    [gyro, setGyro] = useState(false),
    [sound, setSound] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    document.title = "Haïkuarelle Virtuelle •° — Mon ciel émotionnel";
    engine.current = createSoundNest(stage.current, { onError: setError });
    engine.current.setPaperVisible(true);
    paper.current = createPaintingCanvas(stage.current, setCount);
    paper.current.setVisible(false);
    return () => {
      generation.current++;
      paper.current?.dispose();
      engine.current?.dispose();
    };
  }, []);
  useEffect(() => {
    const b = WORKSHOP_BRUSHES.find((b) => b.id === brush);
    paper.current?.setConfig({
      brush: b.id,
      color: b.color,
      size: b.paperSize,
      opacity: b.opacity,
    });
  }, [brush]);
  useLayoutEffect(() => {
    paper.current?.setVisible(started && !world);
    paper.current?.setEnabled(started && !world);
    engine.current?.setPaperVisible(!started || !world);
    engine.current?.setWorldPainting(false, null);
    engine.current?.pauseChillSession(!world);
  }, [started, world]);
  function start() {
    engine.current.setMood(
      {
        ...CHILL_UNIVERSE,
        background: "#f7f4eb",
        workshop: true,
        resonanceBubbles: false,
        constellation: false,
      },
      WORKSHOP_BRUSHES,
    );
    engine.current.setPoeticFragments([]);
    engine.current.setPadSource(twigs.bank.current);
    paper.current.clear();
    worldSource.current = null;
    setStarted(true);
    setError("");
  }
  async function reveal() {
    if (busy || !count) return;
    const ticket = generation.current;
    setBusy(true);
    setError("");
    // Permission requests stay inside the validating touch.
    const permission = engine.current.requestContemplationGyroscope(true);
    try {
      await twigs.bank.current.preparePlayback();
      if (ticket !== generation.current) return;
      const doc = paper.current.getDocument(),
        source = JSON.stringify(doc);
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
      if (ticket !== generation.current) return;
      if (source !== worldSource.current) {
        engine.current.loadPaintingWorld(doc);
        worldSource.current = source;
      }
      setWorld(true);
      setMoving(false);
      setGyro(Boolean(await permission));
      const bank = twigs.bank.current;
      if (sound) {
        let snapshot = bank.getSnapshot().ambience;
        if (!snapshot.loaded) {
          const track =
            musicCatalog.find((t) => /(?:^|\/)gravity\.mp3$/i.test(t)) ??
            musicCatalog[0];
          if (track)
            await bank.loadMoodAmbience(`${import.meta.env.BASE_URL}${track}`);
        }
        if (ticket !== generation.current) return;
        snapshot = bank.getSnapshot().ambience;
        if (snapshot.loaded && !snapshot.playing) await bank.toggleAmbience();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      if (ticket === generation.current) setBusy(false);
    }
  }
  function back() {
    generation.current++;
    twigs.bank.current.cancelAmbienceLoad();
    twigs.bank.current.pauseAmbience();
    engine.current.stopPanorama();
    void engine.current.requestContemplationGyroscope(false);
    setGyro(false);
    setMoving(false);
    setBusy(false);
    setWorld(false);
  }
  function travel() {
    if (moving) engine.current.stopPanorama();
    else engine.current.travelPanorama();
    setMoving(!moving);
  }
  async function toggleSound() {
    try {
      const bank = twigs.bank.current;
      if (sound) bank.pauseAmbience();
      else {
        await bank.preparePlayback();
        if (
          bank.getSnapshot().ambience.loaded &&
          !bank.getSnapshot().ambience.playing
        )
          await bank.toggleAmbience();
      }
      setSound(!sound);
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <main
      className={`immersive chill-experience watercolor-workshop sky-disc-workshop ${started ? "is-running" : ""}`}
    >
      <div id="stage" ref={stage} />
      {!started && (
        <section className="chill-welcome">
          <span className="chill-eyebrow">Dessiner · Révéler · Contempler</span>
          <h1>
            Haïkuarelle
            <br />
            Virtuelle •°
          </h1>
          <h2>Mon ciel émotionnel</h2>
          <p>
            Douze couleurs, douze matières d’aquarelle et d’encre. Dessinez
            votre ciel émotionnel sur un disque de papier.
          </p>
          <p>
            Validez : votre dessin devient un paysage vivant à 360°. Regardez
            autour de vous ou laissez le voyage vous porter.
          </p>
          <p className="sensory-note">
            Vos associations vous appartiennent. La musique accompagne seulement
            la découverte en 3D.
          </p>
          <button onClick={start}>Dessiner mon ciel</button>
        </section>
      )}
      {started && !world && (
        <nav
          className="sky-disc-tools"
          aria-label="Douze brosses émotionnelles"
        >
          <div
            className="sky-brushes"
            role="group"
            aria-label="Choisir une brosse"
          >
            {WORKSHOP_BRUSHES.map((b) => (
              <button
                key={b.id}
                aria-label={b.emotion}
                title={`${b.emotion} · ${b.name}`}
                aria-pressed={brush === b.id}
                style={{ "--brush-color": b.color }}
                onClick={() => setBrush(b.id)}
              >
                <MaterialGlyph id={b.id} />
              </button>
            ))}
          </div>
          <p className="sky-selected" aria-live="polite">
            {WORKSHOP_BRUSHES.find((b) => b.id === brush).emotion} ·{" "}
            {WORKSHOP_BRUSHES.find((b) => b.id === brush).name}
          </p>
          <div className="sky-actions">
            <button
              aria-label="Annuler le dernier trait"
              disabled={!count}
              onClick={() => paper.current.undo()}
            >
              <ToolIcon name="undo" />
            </button>
            <button
              className="sky-validate"
              disabled={!count || busy}
              onClick={reveal}
            >
              {busy ? "Le ciel se révèle…" : "Révéler mon ciel"}
            </button>
          </div>
        </nav>
      )}
      {started && world && (
        <nav className="sky-world-tools" aria-label="Contempler le ciel">
          <button
            aria-label="Revenir au dessin"
            title="Revenir au dessin"
            onClick={back}
          >
            <ToolIcon name="undo" />
          </button>
          <button
            aria-label={moving ? "Suspendre le voyage" : "Voyager"}
            aria-pressed={moving}
            onClick={travel}
          >
            <ToolIcon name={moving ? "pause" : "play"} />
            <span>{moving ? "Contempler" : "Voyager"}</span>
          </button>
          <button
            aria-label={sound ? "Couper la musique" : "Écouter la musique"}
            aria-pressed={sound}
            onClick={toggleSound}
          >
            <ToolIcon name="sound" />
          </button>
          {!gyro && (
            <button
              aria-label="Activer le gyroscope"
              title="Activer le gyroscope"
              onClick={async () => {
                try {
                  setGyro(
                    Boolean(
                      await engine.current.requestContemplationGyroscope(true),
                    ),
                  );
                } catch (e) {
                  setError(e.message);
                }
              }}
            >
              <ToolIcon name="view" />
            </button>
          )}
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
