import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import SketchSurface from "./SketchSurface.jsx";
import { SQUIGGLE_BRUSHES } from "./brushes.js";
import { requestGyroscope } from "../scene/gyroOrientation.ts";
import { downloadBlob } from "../utils/sensoryComposition.ts";
import "./squiggle.css";
const World = lazy(() => import("./SquiggleWorld.jsx"));
class WorldBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="squiggle-fallback">
        La 3D n’est pas disponible ici. Le dessin 2D reste accessible.
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function SquiggleApp() {
  const [erase, setErase] = useState(false),
    [recenter, setRecenter] = useState(0);
  const [strokes, setStrokes] = useState([]),
    [brush, setBrush] = useState("anger"),
    [size, setSize] = useState(48),
    [opacity, setOpacity] = useState(0.85),
    [mode, setMode] = useState("2d"),
    [paint, setPaint] = useState(true),
    [travel, setTravel] = useState(false),
    [source, setSource] = useState(null),
    [more, setMore] = useState(false),
    [paused, setPaused] = useState(
      matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    [gyro, setGyro] = useState(false),
    [error, setError] = useState(""),
    [draft, setDraft] = useState(null);
  const history = useRef([]),
    future = useRef([]),
    counter = useRef(1),
    capture2d = useRef(null),
    capture3d = useRef(null),
    documentRef = useRef(strokes);
  documentRef.current = strokes;
  const tool = {
    emotionId: brush,
    color: SQUIGGLE_BRUSHES.find((b) => b.id === brush).color,
    size,
    opacity,
    id: counter.current,
    erase,
  };
  const onCapture2d = useCallback((fn) => {
      capture2d.current = fn;
    }, []),
    onCapture3d = useCallback((fn) => {
      capture3d.current = fn;
    }, []),
    onSource = useCallback((value) => setSource(value), []);
  const commit = useCallback((stroke) => {
    const current = documentRef.current;
    if (current.length >= 120) {
      setError("120 tracés : annule un geste pour continuer.");
      return;
    }
    history.current.push(current);
    if (history.current.length > 60) history.current.shift();
    future.current = [];
    const next = [...current, { ...stroke, id: counter.current++ }];
    documentRef.current = next;
    setStrokes(next);
  }, []);
  const eraseAt = useCallback(
    (p) => {
      const current = documentRef.current;
      let index = -1,
        best = Infinity;
      for (let i = 0; i < current.length; i++)
        for (const q of current[i].points) {
          const dx = Math.abs(q.x - p.x),
            distance = Math.hypot(
              mode === "360" ? Math.min(dx, 1 - dx) : dx,
              q.y - p.y,
            );
          if (distance < best && distance < current[i].size / 768 + 0.018) {
            best = distance;
            index = i;
          }
        }
      if (index < 0) return;
      history.current.push(current);
      if (history.current.length > 60) history.current.shift();
      future.current = [];
      const next = current.filter((_, i) => i !== index);
      documentRef.current = next;
      setStrokes(next);
    },
    [mode],
  );
  const undo = useCallback(() => {
    if (!history.current.length) return;
    future.current.push(documentRef.current);
    const next = history.current.pop();
    documentRef.current = next;
    setStrokes(next);
    setDraft(null);
  }, []);
  const redo = () => {
    if (!future.current.length) return;
    history.current.push(strokes);
    const next = future.current.pop();
    documentRef.current = next;
    setStrokes(next);
  };
  useEffect(() => {
    document.title = "Squiggle 360 — Dessine, entre, explore";
    const key = (e) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "z" &&
        !e.target.matches("input")
      ) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [undo]);
  const changeMode = () => {
    setTravel(false);
    setMode(mode === "2d" ? "360" : "2d");
    setGyro(false);
    setDraft(null);
  };
  const png = async () => {
    try {
      const fn = mode === "2d" ? capture2d.current : capture3d.current;
      if (!fn) return;
      downloadBlob(await fn(), "squiggle-360.png");
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <main className={`squiggle-app is-${mode}`}>
      <SketchSurface
        strokes={strokes}
        tool={tool}
        active={mode === "2d"}
        paused={paused}
        onErase={eraseAt}
        onStroke={commit}
        onSource={onSource}
        onCapture={onCapture2d}
      />
      {mode === "360" && source && (
        <WorldBoundary>
          <Suspense
            fallback={
              <div className="squiggle-fallback">Entrer dans le dessin…</div>
            }
          >
            <World
              strokes={strokes}
              draft={draft}
              source={source}
              paint={paint}
              travel={travel}
              tool={tool}
              paused={paused}
              gyro={gyro}
              recenter={recenter}
              onGyroUnavailable={() => {
                setGyro(false);
                setError(
                  "Gyroscope indisponible : glisse pour regarder autour de toi.",
                );
              }}
              onErase={eraseAt}
              onStroke={commit}
              onDraft={setDraft}
              onCapture={onCapture3d}
            />
          </Suspense>
        </WorldBoundary>
      )}
      <header className="squiggle-header">
        <div>
          <h1>
            Squiggle <span>360</span>
          </h1>
          <p>
            {mode === "2d"
              ? "Un geste. Une matière. Ton monde."
              : travel
                ? "Glisse pour piloter · Maintiens pour accélérer."
                : paint
                  ? "Dessine dans ton univers."
                  : "Glisse pour regarder autour de toi."}
          </p>
        </div>
        <button
          className="squiggle-switch"
          onClick={changeMode}
          disabled={!source}
          aria-label={mode === "2d" ? "Entrer en 360" : "Revenir au dessin 2D"}
        >
          {mode === "2d" ? "360° ↗" : "← 2D"}
        </button>
      </header>
      {mode === "360" && (
        <div className="squiggle-view-tools">
          <button
            aria-pressed={paint}
            onClick={() => {
              setPaint(true);
              setTravel(false);
              setErase(false);
              setGyro(false);
            }}
          >
            ✎ Peindre
          </button>
          <button
            aria-pressed={!paint && !travel}
            onClick={() => {
              setPaint(false);
              setTravel(false);
            }}
          >
            ◉ Regarder
          </button>
          <button
            aria-pressed={travel}
            aria-label={travel ? "Arrêter le voyage FPV" : "Voyager en FPV"}
            onClick={() => {
              setPaint(false);
              setTravel(!travel);
            }}
          >
            {travel ? "Ⅱ Pause vol" : "➤ Voyager"}
          </button>
          {!paint && (
            <button
              aria-pressed={gyro}
              aria-label="Gyroscope 360"
              onClick={async () => {
                try {
                  if (!gyro) await requestGyroscope();
                  setGyro(!gyro);
                } catch (e) {
                  setError(e.message);
                }
              }}
            >
              ◎ Gyro
            </button>
          )}
          {gyro && (
            <button
              aria-label="Recentrer le regard"
              onClick={() => setRecenter((n) => n + 1)}
            >
              ↺
            </button>
          )}
        </div>
      )}
      <section className="squiggle-tools" aria-label="Outils de dessin">
        <div
          className="squiggle-brushes"
          role="group"
          aria-label="Brosses émoji"
        >
          {SQUIGGLE_BRUSHES.map((b) => (
            <button
              key={b.id}
              title={b.name}
              aria-label={b.name}
              aria-pressed={brush === b.id && !erase}
              onClick={() => {
                setBrush(b.id);
                setPaint(true);
                setTravel(false);
                setErase(false);
                setGyro(false);
              }}
            >
              <span aria-hidden="true">{b.emoji}</span>
            </button>
          ))}
        </div>
        <div className="squiggle-controls">
          <label>
            Taille
            <input
              aria-label="Taille de la brosse"
              type="range"
              min="18"
              max="100"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            />
          </label>
          <button
            aria-label="Annuler le tracé"
            disabled={!history.current.length}
            onClick={undo}
          >
            ↶
          </button>
          <button
            aria-label="Autres outils"
            aria-expanded={more}
            onClick={() => setMore(!more)}
          >
            •••
          </button>
        </div>
        {more && (
          <div className="squiggle-more">
            <label>
              Opacité
              <input
                aria-label="Opacité de la brosse"
                type="range"
                min=".15"
                max="1"
                step=".05"
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
              />
            </label>
            <button
              onClick={redo}
              disabled={!future.current.length}
              aria-label="Rétablir le tracé"
            >
              ↷
            </button>
            <button
              onClick={() => setPaused(!paused)}
              aria-label={
                paused
                  ? "Reprendre les animations"
                  : "Mettre les animations en pause"
              }
            >
              {paused ? "▷" : "Ⅱ"}
            </button>
            <button
              aria-pressed={erase}
              onClick={() => {
                setErase(!erase);
                setPaint(true);
                setTravel(false);
                setGyro(false);
              }}
            >
              🧽 Effacer un tracé
            </button>
            <button onClick={png}>PNG ↓</button>
            <button
              onClick={() => {
                if (!strokes.length) return;
                history.current.push(strokes);
                future.current = [];
                documentRef.current = [];
                setStrokes([]);
              }}
            >
              Effacer tout
            </button>
          </div>
        )}
      </section>
      {error && (
        <div role="alert" className="squiggle-error">
          {error}
          <button aria-label="Fermer le message" onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}
    </main>
  );
}
