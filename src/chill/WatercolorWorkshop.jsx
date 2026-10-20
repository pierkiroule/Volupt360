import { useSculptTools } from "./useSculptTools.js";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createSoundNest } from "../engine/createSoundNest.js";
import { useTwigBank } from "../sonoizo/useTwigBank.js";
import musicCatalog from "virtual:echo-music";
import { CHILL_UNIVERSE } from "./chillConfig.js";
import { SENSORY_EMOJIS } from "./sensoryEmojiCatalog.js";
import { ToolIcon } from "./ToolIcon.jsx";

export default function WatercolorWorkshop() {
  const stage = useRef(null),
    engine = useRef(null),
    initialized = useRef(false),
    generation = useRef(0),
    soundWanted = useRef(true);
  const twigs = useTwigBank({ poeticVoices: false });
  const [started, setStarted] = useState(false),
    [vr, setVr] = useState(false),
    [brush, setBrush] = useState("water"),
    [size, setSize] = useState(0.045),
    [opacity, setOpacity] = useState(0.8),
    [depth, setDepth] = useState(4.5),
    [count, setCount] = useState(0),
    [moving, setMoving] = useState(false),
    [gyro, setGyro] = useState(false),
    [sound, setSound] = useState(true),
    [folded, setFolded] = useState(false),
    [error, setError] = useState("");
  const tools = useSculptTools({
    enabled: started,
    sculpting: started,
    traveling: false,
  });
  useEffect(() => {
    document.title = "Ciel en résonance •° — Sculpture 360°";
    engine.current = createSoundNest(stage.current, {
      onError: setError,
      onVRChange: setVr,
      onSpatialChange: (stats) => setCount(stats.strokes),
    });
    engine.current.setPaperVisible(true);
    return () => {
      generation.current++;
      engine.current?.dispose();
    };
  }, []);
  useLayoutEffect(() => {
    engine.current?.setPaperVisible(!started);
    engine.current?.pauseChillSession(!started);
    engine.current?.setSpatialSculptureTool(
      started
        ? { emojiId: brush, size, opacity, depth, touchOnly: true }
        : null,
    );
  }, [started, brush, size, opacity, depth]);
  async function playMusic(ticket) {
    try {
      const bank = twigs.bank.current;
      await bank.preparePlayback();
      if (!soundWanted.current || ticket !== generation.current) return;
      if (!bank.getSnapshot().ambience.loaded) {
        const track =
          musicCatalog.find((t) => /(?:^|\/)gravity\.mp3$/i.test(t)) ??
          musicCatalog[0];
        if (track)
          await bank.loadMoodAmbience(`${import.meta.env.BASE_URL}${track}`);
      }
      if (
        ticket === generation.current &&
        soundWanted.current &&
        bank.getSnapshot().ambience.loaded &&
        !bank.getSnapshot().ambience.playing
      )
        await bank.toggleAmbience();
    } catch (e) {
      if (ticket === generation.current) setError(e.message);
    }
  }
  async function start() {
    const ticket = ++generation.current;
    setError("");
    if (!initialized.current) {
      engine.current.setMood(
        {
          ...CHILL_UNIVERSE,
          background: "#f7f4eb",
          workshop: true,
          resonanceBubbles: false,
          constellation: false,
        },
        [],
      );
      engine.current.setPoeticFragments([]);
      engine.current.setPadSource(twigs.bank.current);
      engine.current.startSpatialSculpture();
      initialized.current = true;
    }
    setStarted(true);
    const permission = engine.current.requestContemplationGyroscope(true);
    void playMusic(ticket);
    try {
      const value = await permission;
      if (ticket === generation.current) setGyro(Boolean(value));
    } catch (e) {
      setError(e.message);
    }
  }
  function exit() {
    generation.current++;
    twigs.bank.current.cancelAmbienceLoad();
    twigs.bank.current.pauseAmbience();
    engine.current.stopPanorama();
    engine.current.setSpatialSculptureTool(null);
    void engine.current.requestContemplationGyroscope(false);
    setGyro(false);
    setMoving(false);
    setStarted(false);
  }
  function travel() {
    if (moving) engine.current.stopPanorama();
    else engine.current.travelPanorama();
    setMoving(!moving);
  }
  function toggleSound() {
    const enable = !soundWanted.current;
    soundWanted.current = enable;
    setSound(enable);
    if (!enable) twigs.bank.current.pauseAmbience();
    else void playMusic(generation.current);
  }
  return (
    <main
      className={`immersive chill-experience watercolor-workshop spatial-workshop ${started ? "is-running" : ""}`}
    >
      <div id="stage" ref={stage} {...tools.stageEvents} />
      {!started && (
        <section className="chill-welcome">
          <span className="chill-eyebrow">Voler · Sculpter · Résonner</span>
          <h1>
            Ciel en résonance
            <br />
            360•°
          </h1>
          <h2>Le voyage devient matière</h2>
          <p>
            Choisis une brosse émoji et touche le ciel : ton vol dépose des
            vagues, des flammes, des filaments et des pigments vivants dans
            l’espace.
          </p>
          <p>
            Glisse pour tourner et dessiner. Maintiens pour accélérer. Relâche
            pour arrêter le tracé et contempler. La musique anime ton paysage, à
            360° ou en VR.
          </p>
          <button onClick={start}>
            {initialized.current
              ? "Reprendre mon atelier"
              : "Entrer dans l’atelier 360°"}
          </button>
        </section>
      )}
      {started && (
        <>
          <p className="fpv-gesture-hint">
            Toucher pour sculpter · glisser pour tourner · relâcher pour
            contempler
          </p>
          <section
            id="spatial-tools"
            className={`spatial-workshop-tools ${tools.hidden ? "is-concealed" : ""}`}
            aria-hidden={tools.hidden}
            inert={tools.hidden}
            {...tools.toolEvents}
            aria-label="Atelier de sculpture 360°"
          >
            {!folded && (
              <>
                <div
                  className="spatial-brushes"
                  role="group"
                  aria-label="Brosses émojis"
                >
                  {SENSORY_EMOJIS.map((e) => (
                    <button
                      key={e.id}
                      aria-label={e.name}
                      title={e.name}
                      aria-pressed={brush === e.id}
                      onClick={() => setBrush(e.id)}
                    >
                      {e.emoji}
                    </button>
                  ))}
                </div>
                <details className="spatial-settings">
                  <summary>Réglages de la matière</summary>
                  <div>
                    <label>
                      Taille
                      <input
                        type="range"
                        aria-label="Taille de la brosse"
                        min=".015"
                        max=".09"
                        step=".005"
                        value={size}
                        onChange={(e) => setSize(Number(e.target.value))}
                      />
                    </label>
                    <label>
                      Opacité
                      <input
                        type="range"
                        aria-label="Opacité de la brosse"
                        min=".15"
                        max="1"
                        step=".05"
                        value={opacity}
                        onChange={(e) => setOpacity(Number(e.target.value))}
                      />
                    </label>
                    <label>
                      Distance
                      <input
                        type="range"
                        aria-label="Distance de dépôt"
                        min="2"
                        max="9"
                        step=".5"
                        value={depth}
                        onChange={(e) => setDepth(Number(e.target.value))}
                      />
                    </label>
                  </div>
                </details>
              </>
            )}
            <nav aria-label="Sculpter et naviguer">
              <button
                aria-label={moving ? "Suspendre le voyage" : "Voyager"}
                aria-pressed={moving}
                onClick={travel}
              >
                <ToolIcon name={moving ? "pause" : "play"} />
              </button>
              <button
                aria-label="Annuler le dernier tracé"
                disabled={!count}
                onClick={() => engine.current.undoSpatialStroke()}
              >
                <ToolIcon name="undo" />
              </button>
              <button
                aria-label={sound ? "Couper la musique" : "Écouter la musique"}
                aria-pressed={sound}
                onClick={toggleSound}
              >
                <ToolIcon name="sound" />
              </button>
              <button
                aria-label={
                  gyro ? "Désactiver le gyroscope" : "Activer le gyroscope"
                }
                aria-pressed={gyro}
                onClick={async () => {
                  try {
                    setGyro(
                      Boolean(
                        await engine.current.requestContemplationGyroscope(
                          !gyro,
                        ),
                      ),
                    );
                  } catch (e) {
                    setError(e.message);
                  }
                }}
              >
                <ToolIcon name="view" />
              </button>
              <button
                aria-label={vr ? "Quitter la VR" : "Entrer en VR"}
                title="Casque VR"
                aria-pressed={vr}
                onClick={async () => {
                  setError("");
                  try {
                    if (vr) await engine.current.exitVR();
                    else await engine.current.enterVR();
                  } catch (e) {
                    setError(e.message);
                  }
                }}
              >
                <ToolIcon name="vr" />
              </button>
              <button
                aria-label={folded ? "Déplier les outils" : "Plier les outils"}
                aria-expanded={!folded}
                onClick={() => setFolded(!folded)}
              >
                <ToolIcon name={folded ? "expand" : "fold"} />
              </button>
            </nav>
            {!folded && (
              <div className="spatial-secondary">
                <button
                  disabled={!count}
                  onClick={() => engine.current.clearSpatialSculpture()}
                >
                  Effacer l’œuvre
                </button>
                <button onClick={exit}>Accueil</button>
              </div>
            )}
            {count >= 80 && (
              <p role="status">
                L’atelier est rempli : annule un tracé ou efface l’œuvre pour
                poursuivre.
              </p>
            )}
          </section>
          {tools.hidden && (
            <nav
              className="spatial-tools-recall"
              aria-label="Accès rapide aux outils"
            >
              <button
                aria-label="Afficher les outils"
                aria-controls="spatial-tools"
                aria-expanded="false"
                onClick={tools.show}
              >
                <span className="active-brush" aria-hidden="true">
                  {SENSORY_EMOJIS.find((e) => e.id === brush)?.emoji}
                </span>
                <span>Outils</span>
              </button>
            </nav>
          )}
        </>
      )}
      {(error || twigs.error) && (
        <p className="ambience-error" role="status">
          {error || twigs.error}
        </p>
      )}
    </main>
  );
}
