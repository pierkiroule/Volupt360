import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { loadLocalTextures } from "./localTexture.js";
import { EMOJI_INGREDIENTS, generateUniverse } from "./squibbleUniverse.js";
import { SQUIGGLE_BRUSHES } from "./brushes.js";
import { requestGyroscope } from "../scene/gyroOrientation.ts";
import { downloadBlob } from "../utils/sensoryComposition.ts";
import "./squiggle.css";
import "./squibble.css";
import MusicPanel from "./MusicPanel.jsx";
const World = lazy(() => import("./SquiggleWorld.jsx"));
class WorldBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="squibble-unavailable" role="alert">
        La 3D est indisponible sur cet appareil. Essaie avec WebGL activé.
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function SquiggleApp() {
  const [selected, setSelected] = useState([]),
    [inside, setInside] = useState(false),
    [travel, setTravel] = useState(false),
    [paused, setPaused] = useState(
      matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    [gyro, setGyro] = useState(false),
    [recenter, setRecenter] = useState(0),
    [localMatter, setLocalMatter] = useState([]),
    [notice, setNotice] = useState(""),
    [capturing, setCapturing] = useState(false);
  const audioRef = useRef(null);
  const capture = useRef(null),
    noticeTimer = useRef(0);
  useEffect(() => {
    document.title = "Squibble360 — Un monde à ressentir";
    if (import.meta.env.PROD && "serviceWorker" in navigator)
      navigator.serviceWorker
        .register(import.meta.env.BASE_URL + "sw.js")
        .catch(() => {});
    let alive = true;
    loadLocalTextures().then((value) => {
      if (alive) setLocalMatter(value);
    });
    return () => {
      alive = false;
      clearTimeout(noticeTimer.current);
    };
  }, []);
  const notify = useCallback((text) => {
    setNotice(text);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 4500);
  }, []);
  const materials = useMemo(
    () =>
      localMatter.length
        ? Object.fromEntries(
            SQUIGGLE_BRUSHES.map((b, i) => [
              b.id,
              localMatter[i % localMatter.length],
            ]),
          )
        : {},
    [localMatter],
  );
  const choices = useMemo(
    () =>
      selected.map((emoji) => EMOJI_INGREDIENTS.find((e) => e.emoji === emoji)),
    [selected],
  );
  const strokes = useMemo(() => generateUniverse(choices), [choices]);
  const onCapture = useCallback((fn) => {
    capture.current = fn;
  }, []);
  function toggle(emoji) {
    if (selected.includes(emoji))
      setSelected(selected.filter((e) => e !== emoji));
    else if (selected.length < 3) setSelected([...selected, emoji]);
    else notify("Trois emojis au maximum · touche un choix pour le retirer.");
  }
  function leave() {
    setInside(false);
    setTravel(false);
    setGyro(false);
    capture.current = null;
    setNotice("");
  }
  async function photo() {
    if (!capture.current || capturing) return;
    setCapturing(true);
    try {
      downloadBlob(
        await capture.current(),
        "squibble360-" + new Date().toISOString().replaceAll(":", "-") + ".png",
      );
      notify("Ta photo a été téléchargée.");
    } catch {
      notify("Photo indisponible. Réessaie dans un instant.");
    } finally {
      setCapturing(false);
    }
  }
  const world = (
    <WorldBoundary>
      <Suspense
        fallback={
          <div className="squibble-loading">Ton monde prend forme…</div>
        }
      >
        <World
          key={inside ? "inside" : "orb"}
          strokes={strokes}
          audioRef={audioRef}
          materials={materials}
          draft={null}
          preview={!inside}
          paint={false}
          travel={travel}
          paused={paused}
          gyro={gyro}
          recenter={recenter}
          tool={{ erase: false }}
          onCapture={onCapture}
          onGyroUnavailable={() => {
            setGyro(false);
            notify(
              "Gyroscope indisponible · glisse pour regarder autour de toi.",
            );
          }}
        />
      </Suspense>
    </WorldBoundary>
  );
  return (
    <main
      className={
        "squiggle-app squibble " + (inside ? "is-inside" : "is-choosing")
      }
      data-choices={selected.length}
    >
      {!inside ? (
        <>
          <header className="squibble-intro">
            <h1>
              Squibble<span>360</span>
            </h1>
            <p>Un monde à ressentir, un regard à explorer.</p>
          </header>
          <section
            className="squibble-selector"
            aria-label="Composer sa bulle-monde"
          >
            <div className="squibble-orb">{world}</div>
            <button
              className="squibble-portal"
              aria-label="Entrer dans mon monde"
              disabled={!selected.length}
              onClick={() => {
                setInside(true);
                setTravel(true);
              }}
            >
              <span>{selected.length ? "Entrer ↗" : "Choisis tes emojis"}</span>
            </button>
            <div
              className="squibble-ring"
              role="group"
              aria-label="Emojis de ton univers"
            >
              {EMOJI_INGREDIENTS.map((e, i) => {
                const angle =
                  (i * Math.PI * 2) / EMOJI_INGREDIENTS.length - Math.PI / 2;
                return (
                  <button
                    key={e.emoji}
                    aria-label={e.name}
                    aria-pressed={selected.includes(e.emoji)}
                    style={{
                      "--x": Math.cos(angle),
                      "--y": Math.sin(angle),
                      "--tint": e.color,
                    }}
                    onClick={() => toggle(e.emoji)}
                  >
                    <span aria-hidden="true">{e.emoji}</span>
                  </button>
                );
              })}
            </div>
          </section>
          <footer className="squibble-invitation">
            <p>1 à 3 emojis. Laisse émerger un univers.</p>
            <div className="squibble-chosen" aria-label="Tes choix">
              {selected.length ? (
                selected.map((e) => (
                  <button
                    key={e}
                    aria-label={
                      "Retirer " +
                      EMOJI_INGREDIENTS.find((x) => x.emoji === e).name
                    }
                    onClick={() => toggle(e)}
                  >
                    {e}
                    <small>×</small>
                  </button>
                ))
              ) : (
                <span>Tout commence par une rencontre.</span>
              )}
            </div>
            <small>
              Une exploration artistique et projective, sans interprétation de
              tes choix.
            </small>
          </footer>
        </>
      ) : (
        <>
          {world}
          <header className="squibble-flight-header">
            <button aria-label="Revenir à ma bulle" onClick={leave}>
              ← Bulle
            </button>
            <span aria-label="Emojis choisis">{selected.join(" ")}</span>
          </header>
          <nav
            className="squibble-flight-tools"
            aria-label="Explorer et photographier"
          >
            <button
              aria-label={travel ? "Contempler" : "Voyager en FPV"}
              aria-pressed={travel}
              onClick={() => setTravel(!travel)}
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
                  notify(
                    "Gyroscope indisponible · le glissement tactile reste disponible.",
                  );
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
            <button
              aria-label="Photographier ce regard"
              disabled={capturing}
              onClick={photo}
            >
              ▣ Photo
            </button>
            <button
              aria-label={
                paused
                  ? "Reprendre les animations"
                  : "Mettre les animations en pause"
              }
              aria-pressed={paused}
              onClick={() => setPaused(!paused)}
            >
              {paused ? "▷" : "❚❚"}
            </button>
          </nav>
          <p className="squibble-flight-hint">
            {travel
              ? "Glisse pour tourner · Maintiens pour accélérer"
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
