import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { TextureLibraryFactory } from "./textures/TextureLibraryFactory.js";
import { loadLocalTextures } from "./localTexture.js";
import { EMOJI_INGREDIENTS } from "./squibbleUniverse.js";
import { LAND_BRUSHES } from "./landscapeModel.js";
import { requestGyroscope } from "../scene/gyroOrientation.ts";
import { downloadBlob } from "../utils/sensoryComposition.ts";
import MusicPanel from "./MusicPanel.jsx";
import "./squiggle.css";
import "./squibble.css";
import "./landscape.css";
const World = lazy(() => import("./LandscapeWorld.jsx"));
class WorldBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="squibble-unavailable" role="alert">
        La 3D est indisponible sur cet appareil.
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function SquiggleApp() {
  const [inside, setInside] = useState(false),
    [active, setActive] = useState(LAND_BRUSHES[0].emoji);
  const [strokes, setStrokes] = useState([]),
    [draft, setDraft] = useState(null),
    [size, setSize] = useState(1.15),
    [opacity, setOpacity] = useState(0.7);
  const [materials, setMaterials] = useState({}),
    [libraryState, setLibraryState] = useState("idle");
  const [travel, setTravel] = useState(false),
    [gyro, setGyro] = useState(false),
    [recenter, setRecenter] = useState(0);
  const [paused, setPaused] = useState(
      matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    [notice, setNotice] = useState("");
  const audioRef = useRef(null),
    factory = useRef(null),
    capture = useRef(null),
    timer = useRef(0);
  useEffect(() => {
    document.title = "Squibble360 — Peindre un paysage intérieur";
    if (import.meta.env.PROD && "serviceWorker" in navigator)
      navigator.serviceWorker
        .register(import.meta.env.BASE_URL + "sw.js")
        .catch(() => {});
    const library = new TextureLibraryFactory();
    factory.current = library;
    let alive = true;
    loadLocalTextures().then((sources) => {
      if (alive && sources.length)
        setMaterials((old) =>
          Object.fromEntries(
            LAND_BRUSHES.map((b, i) => [
              b.emoji,
              old[b.emoji] || sources[i % sources.length],
            ]),
          ),
        );
    });
    return () => {
      alive = false;
      library.dispose();
      clearTimeout(timer.current);
    };
  }, []);
  const notify = useCallback((text) => {
    setNotice(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(""), 4500);
  }, []);
  useEffect(() => {
    let alive = true;
    setLibraryState("loading");
    factory.current
      .compose([EMOJI_INGREDIENTS.find((e) => e.emoji === active)])
      .then((result) => {
        if (!alive) return;
        const surface = result && Object.values(result.photos)[0];
        if (surface) setMaterials((old) => ({ ...old, [active]: surface }));
        setLibraryState(surface ? "ready" : "fallback");
      });
    return () => {
      alive = false;
    };
  }, [active]);
  const choices = useMemo(() => {
    const emojis = [...new Set(strokes.map((s) => s.emoji))];
    return (emojis.length ? emojis : [active]).map((emoji) =>
      EMOJI_INGREDIENTS.find((e) => e.emoji === emoji),
    );
  }, [strokes, active]);
  const onCapture = useCallback((fn) => {
    capture.current = fn;
  }, []);
  const addStroke = useCallback(
    (stroke) => setStrokes((old) => (old.length < 80 ? [...old, stroke] : old)),
    [],
  );
  const tool = useMemo(
    () => ({ emoji: active, size, opacity }),
    [active, size, opacity],
  );
  const brush = LAND_BRUSHES.find((b) => b.emoji === active);
  async function photo() {
    try {
      if (capture.current)
        downloadBlob(await capture.current(), "squibble360-paysage.png");
    } catch {
      notify("Photo indisponible. Réessaie dans un instant.");
    }
  }
  const world = (
    <WorldBoundary>
      <Suspense
        fallback={
          <div className="squibble-loading">Le paysage prend forme…</div>
        }
      >
        <World
          editor={!inside}
          strokes={strokes}
          draft={draft}
          materials={materials}
          tool={tool}
          onDraft={setDraft}
          onStroke={addStroke}
          onCapture={onCapture}
          audioRef={audioRef}
          travel={travel}
          gyro={gyro}
          recenter={recenter}
          paused={paused}
          onGyroUnavailable={() => {
            setGyro(false);
            notify("Gyroscope indisponible · glisse pour regarder.");
          }}
        />
      </Suspense>
    </WorldBoundary>
  );
  return (
    <main
      className={
        "squiggle-app squibble landscape-app " +
        (inside ? "is-inside" : "is-choosing")
      }
      data-texture-library={libraryState}
      data-strokes={strokes.length}
    >
      {!inside ? (
        <>
          <header className="squibble-intro">
            <h1>
              Squibble<span>360</span>
            </h1>
            <p>Peins un monde. Entre dans son paysage.</p>
          </header>
          <section
            className="squibble-selector"
            aria-label="Peindre le disque paysage"
          >
            <div className="landscape-disk">{world}</div>
            <div
              className="squibble-ring"
              role="group"
              aria-label="Palette de brosses"
            >
              {LAND_BRUSHES.map((b, i) => {
                const angle =
                  (i * Math.PI * 2) / LAND_BRUSHES.length - Math.PI / 2;
                return (
                  <button
                    key={b.emoji}
                    aria-label={b.name}
                    title={b.name}
                    aria-pressed={active === b.emoji}
                    style={{
                      "--x": Math.cos(angle),
                      "--y": Math.sin(angle),
                      "--tint": b.color,
                    }}
                    onClick={() => setActive(b.emoji)}
                  >
                    {b.emoji}
                  </button>
                );
              })}
            </div>
          </section>
          <footer className="landscape-editor-tools">
            <p>
              {brush.name} <span>· Dessine dans le disque</span>
            </p>
            <div className="landscape-settings">
              <label>
                Taille{" "}
                <input
                  aria-label="Taille de la brosse"
                  type="range"
                  min=".45"
                  max="2.4"
                  step=".05"
                  value={size}
                  onChange={(e) => setSize(+e.target.value)}
                />
              </label>
              <label>
                Opacité{" "}
                <input
                  aria-label="Opacité de la brosse"
                  type="range"
                  min=".2"
                  max="1"
                  step=".05"
                  value={opacity}
                  onChange={(e) => setOpacity(+e.target.value)}
                />
              </label>
            </div>
            <div className="landscape-actions">
              <button
                aria-label="Annuler le dernier tracé"
                disabled={!strokes.length}
                onClick={() => setStrokes((s) => s.slice(0, -1))}
              >
                ↶
              </button>
              <button
                disabled={!strokes.length}
                onClick={() => {
                  setDraft(null);
                  setInside(true);
                  setTravel(false);
                }}
              >
                Entrer dans mon paysage ↗
              </button>
              <button aria-label="Photographier le disque" onClick={photo}>
                ▣
              </button>
            </div>
            <small>
              {strokes.length >= 80
                ? "Palette pleine pour cette œuvre · annule un tracé pour continuer."
                : "Chaque geste dépose sa matière et façonne le relief."}
            </small>
          </footer>
        </>
      ) : (
        <>
          <div className="landscape-immersive">{world}</div>
          <header className="squibble-flight-header">
            <button
              onClick={() => {
                setInside(false);
                setTravel(false);
                setGyro(false);
              }}
            >
              ← Peindre
            </button>
          </header>
          <nav
            className="squibble-flight-tools"
            aria-label="Explorer le paysage"
          >
            <button
              aria-label={travel ? "Contempler" : "Voyager en FPV"}
              aria-pressed={travel}
              onClick={() => setTravel((v) => !v)}
            >
              {travel ? "Ⅱ Contempler" : "➤ Voyager"}
            </button>
            <button
              aria-label="Gyroscope 360"
              aria-pressed={gyro}
              onClick={async () => {
                if (gyro) {
                  setGyro(false);
                  return;
                }
                try {
                  await requestGyroscope();
                  setGyro(true);
                } catch {
                  notify("Glisse pour regarder · gyroscope indisponible.");
                }
              }}
            >
              ◎ Gyro
            </button>
            {gyro && (
              <button
                aria-label="Recentrer le regard"
                onClick={() => setRecenter((n) => n + 1)}
              >
                ↺
              </button>
            )}
            <button aria-label="Photographier ce regard" onClick={photo}>
              ▣ Photo
            </button>
            <button
              aria-label={
                paused
                  ? "Reprendre les animations"
                  : "Mettre les animations en pause"
              }
              aria-pressed={paused}
              onClick={() => setPaused((v) => !v)}
            >
              {paused ? "▷" : "❚❚"}
            </button>
          </nav>
          <p className="squibble-flight-hint">
            {travel
              ? "Glisse pour orienter le voyage entre les reliefs"
              : "Glisse ou tourne ton téléphone pour contempler"}
          </p>
        </>
      )}
      <MusicPanel choices={choices} audioRef={audioRef} />
      <div className="squibble-notice" role="status">
        {notice}
      </div>
    </main>
  );
}
