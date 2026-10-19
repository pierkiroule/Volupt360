import { SensoryDisc } from "./SensoryDisc.jsx";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createSoundNest } from "../engine/createSoundNest.js";
import { useTwigBank } from "../sonoizo/useTwigBank.js";
import musicCatalog from "virtual:echo-music";
import { CHILL_UNIVERSE } from "./chillConfig.js";
import { ToolIcon } from "./ToolIcon.jsx";

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
  const [instruction, setInstruction] = useState(
    "ce que tu ressens, ici et maintenant.",
  );
  const soundWanted = useRef(true);
  const [moving, setMoving] = useState(false),
    [gyro, setGyro] = useState(false),
    [sound, setSound] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    document.title = "Paysage sensoriel 360•° — Mon monde en résonance";
    engine.current = createSoundNest(stage.current, { onError: setError });
    engine.current.setPaperVisible(true);
    return () => {
      generation.current++;
      engine.current?.dispose();
    };
  }, []);
  useLayoutEffect(() => {
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
      [],
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
        engine.current.loadSensoryWorld(doc);
        worldSource.current = source;
      }
      setWorld(true);
      setMoving(false);
      setGyro(Boolean(await permission));
      const bank = twigs.bank.current;
      if (soundWanted.current) {
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
        if (soundWanted.current && snapshot.loaded && !snapshot.playing)
          await bank.toggleAmbience();
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
    const enable = !soundWanted.current;
    soundWanted.current = enable;
    setSound(enable);
    try {
      const bank = twigs.bank.current;
      if (!enable) bank.pauseAmbience();
      else {
        await bank.preparePlayback();
        if (
          soundWanted.current &&
          bank.getSnapshot().ambience.loaded &&
          !bank.getSnapshot().ambience.playing
        )
          await bank.toggleAmbience();
      }
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
          <span className="chill-eyebrow">Composer · Relier · Voyager</span>
          <h1>
            Paysage sensoriel
            <br />
            360•°
          </h1>
          <h2>Mon monde en résonance</h2>
          <p>
            Des émojis pour composer ton ciel. Glisse-les sur le disque,
            rapproche-les : leurs rencontres tissent des liens.
          </p>
          <details className="welcome-instruction">
            <summary>Personnaliser la consigne</summary>
            <label>
              Décore ton ciel avec les émojis qui résonnent avec…
              <textarea
                aria-label="Consigne du thérapeute"
                maxLength={240}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
              />
            </label>
          </details>
          <p>
            Révèle ton paysage : les émojis et leurs liens deviennent un réseau
            vivant au rythme de la musique. Regarde autour de toi ou laisse le
            voyage te porter.
          </p>
          <button onClick={start}>Composer mon ciel</button>
        </section>
      )}
      <SensoryDisc
        ref={paper}
        visible={started && !world}
        onChange={setCount}
        onReveal={reveal}
        busy={busy}
        instruction={instruction}
        onInstruction={setInstruction}
      />
      {started && world && (
        <nav className="sky-world-tools" aria-label="Contempler le ciel">
          <button
            aria-label="Revenir à la composition"
            title="Revenir à la composition"
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
