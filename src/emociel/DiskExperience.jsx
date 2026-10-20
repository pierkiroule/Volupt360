import { useEffect, useMemo, useRef, useState } from "react";
import { EmotionDisk } from "./EmotionDisk.jsx";
import {
  EMOTION_BRUSHES,
  MAX_EMOTION_STROKES,
  projectDiskToSky,
  strokeCenter,
  diskUV,
  diskWorld,
} from "./emotionPainting.js";
import { EVOLUTIONS, describeSky } from "./skyModel.js";
import { TouchButton as Button } from "./TouchButton.jsx";
import { createSoundNest } from "../engine/createSoundNest.js";
import { CHILL_UNIVERSE } from "../chill/chillConfig.js";
import { ToolIcon } from "../chill/ToolIcon.jsx";
export default function DiskExperience() {
  const stage = useRef(null),
    engine = useRef(null),
    source = useRef(null),
    counter = useRef(1),
    past = useRef([]),
    future = useRef([]);
  const [strokes, setStrokes] = useState([]),
    [emotion, setEmotion] = useState("anger"),
    [size, setSize] = useState(55),
    [opacity, setOpacity] = useState(0.8),
    [mode, setMode] = useState("paint"),
    [evolution, setEvolution] = useState("original"),
    [question, setQuestion] = useState(0),
    [questionOpen, setQuestionOpen] = useState(false),
    [readingOpen, setReadingOpen] = useState(false),
    [gyro, setGyro] = useState(false),
    [reading, setReading] = useState("open"),
    [need, setNeed] = useState(""),
    [error, setError] = useState("");
  const summary = useMemo(
    () =>
      describeSky(
        strokes.map((s) => ({
          ...s,
          ...diskUV(strokeCenter(s)),
          intensity: 2,
        })),
      ),
    [strokes],
  );
  useEffect(() => {
    document.title = "EmoCiel360 — Peindre et traverser son ciel";
    const owner = createSoundNest(stage.current, { onError: setError });
    engine.current = owner;
    owner.setMood(
      {
        ...CHILL_UNIVERSE,
        background: "#f8f5ed",
        workshop: true,
        resonanceBubbles: false,
        constellation: false,
      },
      [],
    );
    owner.setPoeticFragments([]);
    owner.startSpatialSculpture();
    owner.setPaperVisible(true);
    owner.pauseChillSession(false);
    return () => owner.dispose();
  }, []);
  function append(s) {
    if (strokes.length >= MAX_EMOTION_STROKES) {
      setError(
        "Le disque contient 120 gestes : annule un tracé pour continuer.",
      );
      return;
    }
    past.current.push(strokes);
    if (past.current.length > 80) past.current.shift();
    future.current = [];
    counter.current++;
    setStrokes([...strokes, s]);
  }
  function undo() {
    if (!past.current.length) return;
    future.current.push(strokes);
    setStrokes(past.current.pop());
  }
  function redo() {
    if (!future.current.length) return;
    past.current.push(strokes);
    setStrokes(future.current.pop());
  }
  function enter() {
    if (!source.current) return;
    engine.current.setEmotionPainting(
      projectDiskToSky(source.current),
      strokes,
    );
    engine.current.setSkyEvolution(evolution);
    engine.current.setPanoramaTranslation(false);
    engine.current.setPaperVisible(false);
    const p = diskWorld(strokeCenter(strokes.at(-1)));
    engine.current.lookPanorama([p[0], p[1], p[2] - 20]);
    setMode("contemplate");
  }
  function back() {
    engine.current.stopPanorama();
    engine.current.setPanoramaTranslation(true);
    engine.current.setPaperVisible(true);
    void engine.current.requestContemplationGyroscope(false);
    setGyro(false);
    setMode("paint");
    setQuestionOpen(false);
    setReadingOpen(false);
  }
  function travel(fly) {
    engine.current.setPanoramaTranslation(fly);
    if (fly) engine.current.travelPanorama();
    else engine.current.stopPanorama();
    setMode(fly ? "fly" : "contemplate");
  }
  function evolve(id) {
    setEvolution(id);
    engine.current.setSkyEvolution(id);
    engine.current.setResonantAnimation(
      EVOLUTIONS.find((e) => e.id === id).style,
    );
    setQuestion(0);
    setQuestionOpen(id !== "original");
  }
  const invitation = EVOLUTIONS.find((e) => e.id === evolution);
  return (
    <main
      className={`orb-experience disk-experience ${mode !== "paint" ? "orb-inside" : ""}`}
    >
      <div id="stage" ref={stage} />
      <header className="orb-header">
        <div>
          <h1>
            EmoCiel<span>360</span>
          </h1>
          <p>
            {mode === "paint"
              ? "Peins tes ressentis. Tes gestes deviennent un monde."
              : mode === "fly"
                ? "Glisse pour tourner · maintiens pour accélérer."
                : "Un ciel de matières à contempler à 360°."}
          </p>
        </div>
        <Button
          className="orb-primary"
          disabled={mode === "paint" && !strokes.length}
          onClick={mode === "paint" ? enter : back}
        >
          {mode === "paint" ? "Entrer dans mon ciel" : "Revenir peindre"}
        </Button>
      </header>
      <EmotionDisk
        strokes={strokes}
        tool={{ id: counter.current, emotionId: emotion, size, opacity }}
        onStroke={append}
        onSource={(canvas) => {
          source.current = canvas;
        }}
        active={mode === "paint"}
      />
      {mode === "paint" && (
        <p className="orb-hint">
          Choisis une brosse émotionnelle et trace sur le disque.
        </p>
      )}
      <section
        className="orb-tools"
        aria-label={
          mode === "paint" ? "Brosses émotionnelles" : "Explorer mon ciel"
        }
      >
        {mode === "paint" ? (
          <>
            <div
              className="orb-palette"
              role="group"
              aria-label="Brosses émojis"
            >
              {EMOTION_BRUSHES.map((b) => (
                <Button
                  key={b.id}
                  aria-label={b.label}
                  title={`${b.label} · ${b.symbol}`}
                  aria-pressed={emotion === b.id}
                  onClick={() => setEmotion(b.id)}
                >
                  <span>{b.emoji}</span>
                  <small>{b.label}</small>
                </Button>
              ))}
            </div>
            <p className="emotion-language" aria-live="polite">
              {EMOTION_BRUSHES.find((b) => b.id === emotion)?.symbol}
            </p>
            <div className="disk-controls">
              <label>
                Taille
                <input
                  aria-label="Taille"
                  type="range"
                  min="18"
                  max="120"
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                />
              </label>
              <label>
                Opacité
                <input
                  aria-label="Opacité"
                  type="range"
                  min=".2"
                  max="1"
                  step=".05"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                />
              </label>
              <Button
                aria-label="Annuler le tracé"
                disabled={!past.current.length}
                onClick={undo}
              >
                <ToolIcon name="undo" />
              </Button>
              <Button
                aria-label="Rétablir le tracé"
                disabled={!future.current.length}
                onClick={redo}
              >
                ↷
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="orb-row">
              <Button
                onClick={() => travel(false)}
                aria-pressed={mode === "contemplate"}
              >
                Contempler
              </Button>
              <Button
                onClick={() => travel(true)}
                aria-pressed={mode === "fly"}
              >
                Vol FPV
              </Button>
              <Button
                aria-label="Gyroscope"
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
              </Button>
              <Button onClick={() => setReadingOpen(!readingOpen)}>
                Mon ciel
              </Button>
            </div>
            <label className="orb-evolution">
              Une piste à explorer
              <select
                aria-label="Dynamique à explorer"
                value={evolution}
                onChange={(e) => evolve(e.target.value)}
              >
                {EVOLUTIONS.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </section>
      {questionOpen && mode !== "paint" && (
        <section className="orb-question" aria-label="Invitation métaphorique">
          <Button
            className="orb-close"
            aria-label="Fermer la question"
            onClick={() => setQuestionOpen(false)}
          >
            ×
          </Button>
          <span>Une invitation, sans réponse obligatoire</span>
          <p>{invitation.questions[question]}</p>
          <Button
            onClick={() =>
              setQuestion((question + 1) % invitation.questions.length)
            }
          >
            Une autre piste
          </Button>
          <small>
            Une variation visuelle réversible. Tes tracés restent intacts.
          </small>
        </section>
      )}
      {readingOpen && (
        <section className="orb-reflection" aria-label="Les ressentis peints">
          <Button
            className="orb-close"
            aria-label="Fermer la lecture"
            onClick={() => setReadingOpen(false)}
          >
            ×
          </Button>
          <h2>Les matières de ton ciel</h2>
          <ul>
            {summary.labels.map((l) => (
              <li key={l.label}>
                {l.label} · {l.count} tracé{l.count > 1 ? "s" : ""}
              </li>
            ))}
          </ul>
          <label>
            Comment ces ressentis se répondent-ils ?
            <select
              aria-label="Ma lecture des ressentis"
              value={reading}
              onChange={(e) => setReading(e.target.value)}
            >
              <option value="open">Je laisse la question ouverte</option>
              <option value="coexist">Ils coexistent</option>
              <option value="contrast">Je ressens un contraste</option>
              <option value="ambivalence">J’y reconnais une ambivalence</option>
            </select>
          </label>
          <label>
            Un besoin à explorer
            <select
              aria-label="Besoin à explorer"
              value={need}
              onChange={(e) => setNeed(e.target.value)}
            >
              <option value="">Aucun choix nécessaire</option>
              <option value="connect">Du lien</option>
              <option value="space">Du repos ou de l’espace</option>
              <option value="support">Un appui</option>
              <option value="perspective">Une possibilité d’agir</option>
            </select>
          </label>
          {need && (
            <Button
              onClick={() => {
                setReadingOpen(false);
                evolve(need);
              }}
            >
              Explorer cette piste
            </Button>
          )}
          <p>
            Le feu, la pluie et les orages sont des métaphores graphiques
            proposées. Leur sens t’appartient ; aucune interprétation
            psychologique n’est calculée.
          </p>
        </section>
      )}
      {error && (
        <p role="alert" className="orb-error">
          {error}
          <Button aria-label="Fermer le message" onClick={() => setError("")}>
            ×
          </Button>
        </p>
      )}
    </main>
  );
}
