import { TouchButton as Button } from "./TouchButton.jsx";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbEditor } from "./OrbEditor.jsx";
import {
  EMOTIONS,
  EVOLUTIONS,
  createSkyTexture,
  describeSky,
  direction,
} from "./skyModel.js";
import { createSoundNest } from "../engine/createSoundNest.js";
import { CHILL_UNIVERSE } from "../chill/chillConfig.js";
import { ToolIcon } from "../chill/ToolIcon.jsx";
export default function OrbExperience() {
  const host = useRef(null),
    engine = useRef(null),
    rotation = useRef(new THREE.Quaternion()),
    counter = useRef(1),
    past = useRef([]),
    future = useRef([]);
  const [tags, setTags] = useState([]),
    [selected, setSelected] = useState("peace"),
    [intensity, setIntensity] = useState(2),
    [mode, setMode] = useState("compose"),
    [evolution, setEvolution] = useState("original"),
    [question, setQuestion] = useState(0),
    [questionOpen, setQuestionOpen] = useState(false),
    [reflection, setReflection] = useState(false),
    [reading, setReading] = useState("coexistence"),
    [need, setNeed] = useState(""),
    [word, setWord] = useState(""),
    [erase, setErase] = useState(false),
    [gyro, setGyro] = useState(false),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  const summary = useMemo(() => describeSky(tags), [tags]);
  useEffect(() => {
    document.title = "EmoCiel360 — Composer et traverser son ciel";
    const owner = createSoundNest(host.current, { onError: setError });
    engine.current = owner;
    owner.setMood(
      {
        ...CHILL_UNIVERSE,
        background: "#f6f2ec",
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
  function change(next) {
    past.current.push(tags);
    if (past.current.length > 80) past.current.shift();
    future.current = [];
    setTags(next);
    setRevision((v) => v + 1);
  }
  function place(point) {
    if (erase) {
      const d = direction(point.u, point.v);
      let index = -1,
        best = 0.96;
      tags.forEach((t, i) => {
        const q = direction(t.u, t.v),
          dot = q.reduce((s, v, k) => s + v * d[k], 0);
        if (dot > best) {
          best = dot;
          index = i;
        }
      });
      if (index >= 0) change(tags.filter((_, i) => i !== index));
      return;
    }
    if (tags.length >= 96) {
      setError(
        "Ta bulle contient 96 tags. Tu peux en retirer ou annuler un dépôt.",
      );
      return;
    }
    change([
      ...tags,
      {
        id: counter.current++,
        emotionId: selected,
        ...point,
        intensity,
        meaning: word.trim().slice(0, 48),
      },
    ]);
  }
  function undo() {
    if (!past.current.length) return;
    future.current.push(tags);
    setTags(past.current.pop());
    setRevision((v) => v + 1);
  }
  function redo() {
    if (!future.current.length) return;
    past.current.push(tags);
    setTags(future.current.pop());
    setRevision((v) => v + 1);
  }
  function enter() {
    engine.current.setResonantDrawing(createSkyTexture(tags), {
      autonomous: true,
    });
    engine.current.setResonantAnimation("flow");
    engine.current.setSkyEvolution(evolution);
    engine.current.setPanoramaTranslation(false);
    engine.current.setPaperVisible(false);
    const recent = tags.at(-1);
    if (recent) engine.current.lookPanorama(direction(recent.u, recent.v));
    setMode("contemplate");
  }
  function setFlight(flying) {
    engine.current.setPanoramaTranslation(flying);
    if (flying) engine.current.travelPanorama();
    else engine.current.stopPanorama();
    setMode(flying ? "fly" : "contemplate");
  }
  function back() {
    engine.current.stopPanorama();
    engine.current.setPanoramaTranslation(true);
    engine.current.setPaperVisible(true);
    void engine.current.requestContemplationGyroscope(false);
    setGyro(false);
    setMode("compose");
    setQuestionOpen(false);
  }
  function evolve(id) {
    const item = EVOLUTIONS.find((e) => e.id === id);
    setEvolution(id);
    engine.current.setSkyEvolution(id);
    engine.current.setResonantAnimation(item.style);
    setQuestion(0);
    setQuestionOpen(id !== "original");
  }
  const invitation =
    EVOLUTIONS.find((e) => e.id === evolution) || EVOLUTIONS[0];
  return (
    <main
      className={`orb-experience ${mode !== "compose" ? "orb-inside" : ""}`}
    >
      <div id="stage" ref={host} />
      <header className="orb-header">
        <div>
          <h1>
            EmoCiel<span>360</span>
          </h1>
          <p>
            {mode === "compose"
              ? "Compose ton ciel, sans avoir à l’expliquer."
              : mode === "fly"
                ? "Traverse ton ciel · glisse pour virer, maintiens pour accélérer."
                : "Un regard depuis l’intérieur de ton ciel."}
          </p>
        </div>
        <Button
          className="orb-primary"
          disabled={mode === "compose" && !tags.length}
          onClick={mode === "compose" ? enter : back}
        >
          {mode === "compose" ? "Entrer dans ma bulle" : "Recomposer"}
        </Button>
      </header>
      <OrbEditor
        tags={tags}
        onPlace={place}
        active={mode === "compose"}
        rotation={rotation}
      />
      {mode === "compose" && (
        <p className="orb-hint">
          Choisis un ressenti, puis touche la bulle. Glisse pour la faire
          tourner.
        </p>
      )}
      <section
        className="orb-tools"
        aria-label={
          mode === "compose" ? "Composer ma bulle" : "Explorer mon ciel"
        }
      >
        {mode === "compose" ? (
          <>
            <div
              className="orb-palette"
              role="group"
              aria-label="Émotions à déposer"
            >
              {EMOTIONS.map((e) => (
                <Button
                  key={e.id}
                  title={e.label}
                  aria-label={e.label}
                  aria-pressed={selected === e.id && !erase}
                  onClick={() => {
                    setSelected(e.id);
                    setErase(false);
                  }}
                >
                  <span>{e.emoji}</span>
                  <small>{e.label}</small>
                </Button>
              ))}
            </div>
            <div className="orb-row">
              <label>
                Présence choisie
                <input
                  type="range"
                  aria-label="Présence du ressenti"
                  min="1"
                  max="3"
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                />
              </label>
              <Button
                aria-label="Annuler le dernier tag"
                disabled={!past.current.length}
                onClick={undo}
              >
                <ToolIcon name="undo" />
              </Button>
              <Button
                aria-label="Rétablir le tag"
                disabled={!future.current.length}
                onClick={redo}
              >
                ↷
              </Button>
              <Button aria-pressed={erase} onClick={() => setErase(!erase)}>
                {erase ? "Retrait actif" : "Retirer"}
              </Button>
            </div>
            <details className="orb-meaning">
              <summary>Donner mon propre sens · facultatif</summary>
              <label>
                Mon mot pour ce dépôt
                <input
                  aria-label="Mon mot"
                  value={word}
                  maxLength="48"
                  onChange={(e) => setWord(e.target.value)}
                  placeholder="Ces mots et symboles t’appartiennent"
                />
              </label>
            </details>
          </>
        ) : (
          <>
            <div className="orb-row">
              <Button
                className={mode === "contemplate" ? "is-selected" : ""}
                onClick={() => setFlight(false)}
              >
                Contempler
              </Button>
              <Button
                className={mode === "fly" ? "is-selected" : ""}
                onClick={() => setFlight(true)}
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
              <Button onClick={() => setReflection(!reflection)}>
                Lire mon ciel
              </Button>
            </div>
            <label className="orb-evolution">
              Une dynamique à explorer
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
            {!questionOpen && evolution !== "original" && (
              <Button
                className="orb-question-recall"
                onClick={() => setQuestionOpen(true)}
              >
                Retrouver la question
              </Button>
            )}
          </>
        )}
      </section>
      {questionOpen && mode !== "compose" && (
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
            La variation visuelle est réversible. Tes tags ne sont pas modifiés.
          </small>
        </section>
      )}
      {reflection && (
        <section
          className="orb-reflection"
          aria-label="Lecture descriptive de mon ciel"
        >
          <Button
            className="orb-close"
            aria-label="Fermer la lecture"
            onClick={() => setReflection(false)}
          >
            ×
          </Button>
          <h2>Ce que tu as déposé</h2>
          <p>
            {summary.total} tags · {summary.diversity} ressentis nommés
          </p>
          <ul>
            {summary.labels.map((item) => (
              <li key={item.label}>
                {item.label} × {item.count}
              </li>
            ))}
          </ul>
          <p>
            Disposition des tags :{" "}
            {summary.dispersion < 0.3
              ? "plutôt rassemblés"
              : summary.dispersion < 0.65
                ? "plusieurs zones occupées"
                : "répartis autour de la bulle"}
            .
          </p>
          {tags.some((t) => t.meaning) && (
            <p>
              Tes mots :{" "}
              {[...new Set(tags.map((t) => t.meaning).filter(Boolean))].join(
                " · ",
              )}
              .
            </p>
          )}
          {summary.neighbours.length > 0 && (
            <p>
              Voisinages sur la bulle :{" "}
              {summary.neighbours.slice(0, 4).join(" ; ")}.
            </p>
          )}
          <label>
            Comment nommerais-tu leurs liens ?
            <select
              aria-label="Ma lecture de ces ressentis"
              value={reading}
              onChange={(e) => setReading(e.target.value)}
            >
              <option value="coexistence">Ils coexistent</option>
              <option value="contrast">Je ressens des contrastes</option>
              <option value="ambivalence">J’y reconnais une ambivalence</option>
              <option value="open">Je ne sais pas encore</option>
            </select>
          </label>
          <label>
            Un besoin à explorer, si tu le souhaites
            <select
              aria-label="Besoin à explorer"
              value={need}
              onChange={(e) => setNeed(e.target.value)}
            >
              <option value="">Je laisse la question ouverte</option>
              <option>Du lien</option>
              <option>Du repos</option>
              <option>Un appui</option>
              <option>De l’espace</option>
              <option>De l’expression</option>
              <option>Une possibilité d’agir</option>
            </select>
          </label>
          {need && (
            <Button
              onClick={() => {
                const map = {
                  "Du lien": "connect",
                  "Du repos": "space",
                  "Un appui": "support",
                  "De l’espace": "space",
                  "De l’expression": "connect",
                  "Une possibilité d’agir": "perspective",
                };
                setReflection(false);
                evolve(map[need] || "perspective");
              }}
            >
              Explorer ce besoin
            </Button>
          )}
          <p className="orb-note">
            Ce descriptif reprend tes choix. Il ne mesure ni ton état
            psychologique, ni un risque, ni une progression thérapeutique. Les
            interprétations t’appartiennent.
          </p>
        </section>
      )}
      {mode === "compose" && (
        <details className="orb-about">
          <summary>À propos de cette exploration</summary>
          <p>
            Une médiation artistique pour représenter et explorer ce que tu
            ressens. Aucun ressenti à réussir ou à effacer. Les créations et les
            mots restent dans cette session, sans envoi ni sauvegarde
            automatique. Export et sauvegarde de projet ne sont pas encore
            proposés.
          </p>
        </details>
      )}
      {error && (
        <p className="orb-error" role="alert">
          {error}
          <Button aria-label="Fermer le message" onClick={() => setError("")}>
            ×
          </Button>
        </p>
      )}
    </main>
  );
}
