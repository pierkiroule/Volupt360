import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  type Project,
  type Stroke,
  type BrushId,
  type EffectId,
  newProject,
  uid,
} from "./model";
import { ProjectStore } from "./ProjectStore";
import { BRUSHES } from "./BrushRegistry";
import { EFFECTS, paintEffect } from "./EffectBrushEngine";
import { type DrawingTool, erase } from "./DrawingEngine";
import { DrawingCanvas } from "./DrawingCanvas";
import { drawStroke } from "./Renderer2D";
import { Renderer3D } from "./Renderer3D";
import { AnimationTimeline } from "./AnimationTimeline";
import { AudioEngine } from "./AudioEngine";
import {
  exportPNG,
  exportJSON,
  importJSON,
  exportWebM,
  canRecord,
  download,
} from "./ExportManager";
import { requestGyroscope } from "../scene/gyroOrientation";
import "./studio.css";
function BrushPreview({
  brush,
  color = "#537d78",
}: {
  brush: BrushId;
  color?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current!.getContext("2d")!;
    ctx.clearRect(0, 0, 100, 32);
    ctx.save();
    ctx.scale(100 / 1200, 32 / 900);
    const points = Array.from({ length: 16 }, (_, i) => ({
      x: 0.12 + i * 0.05,
      y: 0.5 + Math.sin(i * 0.38) * 0.13,
      time: i * 20,
      pressure: 0.55 + Math.sin(i * 0.3) * 0.2,
      speed: 1,
    }));
    drawStroke(ctx, {
      id: "preview",
      brush,
      points,
      color,
      size: 80,
      opacity: 0.9,
      seed: 1723,
      createdAt: 0,
      parameters: {},
    });
    ctx.restore();
  }, [brush, color]);
  return <canvas width={100} height={32} ref={canvas} aria-hidden="true" />;
}
class GPUFallback extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
interface History {
  past: Project[];
  present: Project;
  future: Project[];
}
export default function StudioApp() {
  const [history, setHistory] = useState<History>(() => ({
    past: [],
    present: newProject(),
    future: [],
  }));
  const project = history.present;
  const [welcome, setWelcome] = useState(true),
    [ready, setReady] = useState(false),
    [library, setLibrary] = useState<Project[]>([]),
    [saved, setSaved] = useState("Local uniquement"),
    [notice, setNotice] = useState("");
  const [mode, setMode] = useState<"draw" | "animate" | "view">("draw"),
    [brush, setBrush] = useState<BrushId>("watercolor"),
    [secondary, setSecondary] = useState<BrushId | "">(""),
    [size, setSize] = useState(30),
    [opacity, setOpacity] = useState(0.65),
    [color, setColor] = useState("#546e91"),
    [eraser, setEraser] = useState(false);
  const [brushParameters, setBrushParameters] = useState({
    spacing: 1,
    amplitude: 1,
    dispersion: 1,
  });
  const [effect, setEffect] = useState<EffectId>("breathe"),
    [intensity, setIntensity] = useState(0.55),
    [speed, setSpeed] = useState(0.6),
    [radius, setRadius] = useState(0.12),
    [duration, setDuration] = useState(0);
  const [panel, setPanel] = useState<
      null | "brushes" | "effects" | "files" | "settings" | "projects"
    >(null),
    [original, setOriginal] = useState(false),
    [running, setRunning] = useState(
      !matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    [quality, setQuality] = useState(false),
    [audio, setAudio] = useState(false),
    [volume, setVolume] = useState(0.35);
  const [depth, setDepth] = useState(0),
    [immersive, setImmersive] = useState(false),
    [gyro, setGyro] = useState(false),
    [travel, setTravel] = useState(false),
    [recenter, setRecenter] = useState(0),
    [toolsVisible, setToolsVisible] = useState(true),
    [recording, setRecording] = useState(false);
  const timeline = useRef(new AnimationTimeline()).current,
    canvasRef = useRef<HTMLCanvasElement>(null),
    audioEngine = useRef<AudioEngine | null>(null),
    capture = useRef<(() => Promise<Blob>) | null>(null),
    fileInput = useRef<HTMLInputElement>(null),
    noticeTimer = useRef(0),
    hideTimer = useRef(0),
    abortExport = useRef<AbortController | null>(null),
    saveRevision = useRef(0);
  const savedProject = useRef<Project | null>(null);
  const latest = useRef(project);
  latest.current = project;
  const notify = useCallback((text: string) => {
    setNotice(text);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 6000);
  }, []);
  const commit = useCallback((next: Project | ((p: Project) => Project)) => {
    setHistory((h) => {
      const value = typeof next === "function" ? next(h.present) : next;
      if (value === h.present) return h;
      return {
        past: [...h.past, h.present].slice(-80),
        present: { ...value, updatedAt: Date.now() },
        future: [],
      };
    });
  }, []);
  const load = useCallback(
    (p: Project) => {
      setHistory({ past: [], present: p, future: [] });
      timeline.time = p.playhead || 0;
      setWelcome(false);
      setMode("draw");
      setImmersive(false);
      setPanel(null);
      setOriginal(false);
    },
    [timeline],
  );
  useEffect(() => {
    document.title = "SQUIGGLE 360 •° — L’atelier des dessins vivants";
    audioEngine.current = new AudioEngine();
    let alive = true;
    ProjectStore.list()
      .then((p) => {
        if (alive) setLibrary(p);
      })
      .catch(() => {
        if (alive) setSaved("Stockage indisponible · export JSON conseillé");
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    if (import.meta.env.PROD && "serviceWorker" in navigator)
      navigator.serviceWorker
        .register(import.meta.env.BASE_URL + "sw.js")
        .catch(() => {});
    return () => {
      alive = false;
      audioEngine.current?.dispose();
      abortExport.current?.abort();
      clearTimeout(noticeTimer.current);
      clearTimeout(hideTimer.current);
    };
  }, []);
  useEffect(() => {
    timeline.setRunning(running);
    audioEngine.current?.setPaused(!running);
  }, [running, timeline]);
  useEffect(() => {
    audioEngine.current?.setVolume(volume);
  }, [volume]);
  useEffect(() => {
    if (welcome) return;
    setSaved("Sauvegarde…");
    const revision = ++saveRevision.current;
    const timer = setTimeout(() => {
      void ProjectStore.save({ ...project, playhead: timeline.time })
        .then(() => {
          if (revision === saveRevision.current) {
            savedProject.current = project;
            setSaved("Enregistré sur cet appareil");
          }
        })
        .catch(() => {
          if (revision !== saveRevision.current) return;
          setSaved("Échec de sauvegarde · exportez le JSON");
          notify(
            "Le stockage local est indisponible. Votre dessin reste ici : exportez le projet JSON.",
          );
        });
    }, 600);
    return () => clearTimeout(timer);
  }, [project, welcome, timeline, notify]);
  useEffect(() => {
    const save = () => {
      if (!welcome)
        void ProjectStore.save({
          ...latest.current,
          playhead: timeline.time,
        }).catch(() => {});
    };
    window.addEventListener("pagehide", save);
    const guard = (event: BeforeUnloadEvent) => {
      if (
        !welcome &&
        savedProject.current !== latest.current &&
        latest.current.strokes.length > 0
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => {
      window.removeEventListener("pagehide", save);
      window.removeEventListener("beforeunload", guard);
    };
  }, [welcome, saved, timeline]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!welcome && running)
        audioEngine.current?.update(latest.current, timeline.time);
    }, 200);
    return () => clearInterval(timer);
  }, [welcome, running, timeline]);
  const undo = useCallback(
    () =>
      setHistory((h) =>
        h.past.length
          ? {
              past: h.past.slice(0, -1),
              present: h.past.at(-1)!,
              future: [h.present, ...h.future],
            }
          : h,
      ),
    [],
  );
  const redo = useCallback(
    () =>
      setHistory((h) =>
        h.future.length
          ? {
              past: [...h.past, h.present],
              present: h.future[0],
              future: h.future.slice(1),
            }
          : h,
      ),
    [],
  );
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches("input,textarea,select")) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if (e.key === "Escape") {
        setImmersive(false);
        setTravel(false);
        setGyro(false);
        setPanel(null);
        setToolsVisible(true);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [undo, redo]);
  const showTools = useCallback(() => {
    setToolsVisible(true);
    clearTimeout(hideTimer.current);
    if (mode === "view")
      hideTimer.current = window.setTimeout(() => setToolsVisible(false), 4500);
  }, [mode]);
  useEffect(() => {
    showTools();
  }, [mode, immersive, showTools]);
  const saveState = saved.startsWith("Échec")
    ? saved
    : !welcome && savedProject.current !== project
      ? "Sauvegarde…"
      : saved;
  const tool = useMemo<DrawingTool>(
    () => ({
      brush,
      secondary: secondary || undefined,
      color,
      size,
      opacity,
      parameters: brushParameters,
    }),
    [brush, secondary, color, size, opacity, brushParameters],
  );
  const addStroke = useCallback(
    (stroke: Stroke) => {
      commit((p) => {
        if (
          p.strokes.length >= 200 ||
          p.strokes.reduce((n, s) => n + s.points.length, 0) +
            stroke.points.length >
            120000
        ) {
          notify(
            "Cette œuvre contient déjà 200 tracés. Sauvegardez-la pour commencer une nouvelle création.",
          );
          return p;
        }
        return { ...p, strokes: [...p.strokes, stroke] };
      });
    },
    [commit, notify],
  );
  const applyPath = useCallback(
    (path: { x: number; y: number }[]) => {
      if (mode === "draw" && eraser) {
        commit((p) => {
          const erased = erase(p, path, size / 900);
          if (erased.strokes.length > 200) {
            notify(
              "La gomme créerait trop de fragments. Essayez un geste plus court.",
            );
            return p;
          }
          return erased;
        });
        return;
      }
      const created = paintEffect(
        latest.current,
        effect,
        path,
        { intensity, speed, radius, duration },
        timeline.time,
      );
      if (!created) {
        notify("Passe la brosse d’animation sur une partie du dessin.");
        return;
      }
      const weightCount = [...latest.current.effects, created].reduce(
        (n, e) =>
          n + Object.values(e.weights).reduce((a, w) => a + w.length, 0),
        0,
      );
      if (weightCount > 1_000_000) {
        notify(
          "Cette œuvre contient beaucoup d’animations locales. Retirez un effet avant d’en ajouter.",
        );
        return;
      }
      commit((p) => {
        if (p.effects.length >= 80) {
          notify(
            "Cette œuvre contient déjà 80 effets. Retirez-en un pour continuer.",
          );
          return p;
        }
        return { ...p, effects: [...p.effects, created] };
      });
    },
    [
      mode,
      eraser,
      size,
      commit,
      effect,
      intensity,
      speed,
      radius,
      duration,
      timeline,
      notify,
    ],
  );
  const gesture = useCallback(() => {
    if (audio) audioEngine.current?.gesture(brush, 0.5, 0.5, 0.4);
  }, [audio, brush]);
  async function newWork() {
    if (
      !welcome &&
      !confirm(
        "Créer une nouvelle œuvre ? Celle-ci restera dans vos projets locaux.",
      )
    )
      return;
    try {
      if (!welcome)
        await ProjectStore.save({ ...project, playhead: timeline.time });
      load(newProject());
    } catch {
      notify(
        "Sauvegardez le projet JSON avant de quitter cette œuvre : le stockage est indisponible.",
      );
    }
  }
  async function resetWork() {
    if (
      !confirm(
        "Effacer cette œuvre ? Une copie sera conservée dans vos projets locaux.",
      )
    )
      return;
    try {
      await ProjectStore.save({
        ...project,
        id: uid(),
        title: project.title.slice(0, 118) + " · avant effacement",
        playhead: timeline.time,
      });
      commit({ ...project, strokes: [], effects: [] });
      setPanel(null);
    } catch {
      notify(
        "Exportez le projet JSON avant de l’effacer : le stockage est indisponible.",
      );
    }
  }
  async function toggleAudio() {
    try {
      await audioEngine.current?.enable(!audio);
      setAudio(!audio);
    } catch {
      notify(
        "Le navigateur n’a pas activé l’audio. Réessaie avec le bouton Son.",
      );
    }
  }
  async function png() {
    try {
      const blob =
        mode === "view" && capture.current
          ? await capture.current()
          : await exportPNG(project, timeline.time, original);
      download(blob, "squiggle360.png");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function importFile(file: File) {
    try {
      const p = await importJSON(file);
      if (!welcome)
        await ProjectStore.save({ ...project, playhead: timeline.time });
      load({ ...p, id: uid(), updatedAt: Date.now() });
      notify(
        "Projet importé. L’œuvre précédente reste sauvegardée localement.",
      );
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function record() {
    setRecording(true);
    abortExport.current = new AbortController();
    try {
      download(
        await exportWebM(
          { ...project },
          timeline.time,
          abortExport.current.signal,
        ),
        "squiggle360-animation.webm",
      );
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setRecording(false);
    }
  }
  const saveJSON = () =>
    download(
      exportJSON({ ...project, playhead: timeline.time }),
      "squiggle360-projet.json",
    );
  const onCapture = useCallback((fn: (() => Promise<Blob>) | null) => {
    capture.current = fn;
  }, []);
  const unavailable = useCallback(() => {
    setGyro(false);
    notify("Gyroscope indisponible : le glissement tactile reste actif.");
  }, [notify]);
  const changeMode = (next: typeof mode) => {
    setMode(next);
    setPanel(null);
    setImmersive(false);
    setTravel(false);
    setGyro(false);
  };
  const toggleFavorite = (id: BrushId) =>
    commit((p) => {
      if (p.favorites.includes(id))
        return { ...p, favorites: p.favorites.filter((b) => b !== id) };
      if (p.favorites.length >= 6) {
        notify("Six favorites au maximum. Retirez d’abord une étoile.");
        return p;
      }
      return { ...p, favorites: [...p.favorites, id] };
    });
  const drawing = (
    <DrawingCanvas
      project={project}
      tool={tool}
      mode={mode === "animate" ? "effect" : eraser ? "erase" : "draw"}
      timeline={timeline}
      original={original}
      quality={quality}
      onStroke={addStroke}
      onPath={applyPath}
      onGesture={gesture}
      canvasRef={canvasRef}
    />
  );
  return (
    <main
      className={
        "studio " +
        (welcome ? "studio-welcome" : "") +
        (mode === "view" ? " studio-contemplation" : "")
      }
      data-mode={mode}
      data-strokes={project.strokes.length}
      data-effects={project.effects.length}
    >
      {welcome ? (
        <section className="studio-landing">
          <div className="landing-wash wash-one" />
          <div className="landing-wash wash-two" />
          <div className="landing-thread" />
          <span className="studio-kicker">L’atelier des dessins vivants</span>
          <h1>
            SQUIGGLE <span>360 •°</span>
          </h1>
          <p className="studio-motto">Dessiner. Animer. Habiter.</p>
          <p className="studio-intention">
            Un geste devient matière.
            <br />
            Une matière s’éveille.
            <br />
            Un dessin devient un monde à explorer.
          </p>
          <button
            className="studio-primary"
            disabled={!ready}
            onClick={() => void newWork()}
          >
            Créer une œuvre <span>↗</span>
          </button>
          {library[0] && (
            <button onClick={() => load(library[0])}>
              Reprendre mon dernier dessin
            </button>
          )}
          <button onClick={() => fileInput.current?.click()}>
            Importer un projet
          </button>
          <small>
            Un atelier libre. Aucune interprétation.
            <br />
            Vos créations restent sur cet appareil.
          </small>
        </section>
      ) : (
        <>
          <header className="studio-header">
            <button
              className="studio-wordmark"
              aria-label="Projets et fichiers"
              onClick={() => setPanel(panel === "files" ? null : "files")}
            >
              SQUIGGLE <span>360 •°</span>
            </button>
            <nav aria-label="Les trois ateliers">
              {(
                [
                  ["draw", "Dessiner"],
                  ["animate", "Animer"],
                  ["view", "Contempler"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  aria-current={mode === id ? "page" : undefined}
                  onClick={() => changeMode(id)}
                >
                  {label}
                </button>
              ))}
            </nav>
            <button
              aria-label={
                running ? "Mettre en pause" : "Reprendre les animations"
              }
              aria-pressed={!running}
              onClick={() => setRunning((v) => !v)}
            >
              {running ? "Ⅱ" : "▷"}
            </button>
          </header>
          <section
            className="studio-stage"
            onPointerDown={mode === "view" ? showTools : undefined}
            aria-label="Œuvre"
          >
            {mode !== "view" ? (
              drawing
            ) : (
              <GPUFallback
                fallback={
                  <div className="studio-gpu-fallback">
                    <p>
                      La 3D est indisponible. Le tableau vivant reste
                      accessible.
                    </p>
                    <DrawingCanvas
                      project={project}
                      tool={tool}
                      mode="view"
                      timeline={timeline}
                      original={original}
                      quality
                      onStroke={addStroke}
                      onPath={applyPath}
                      onGesture={() => {}}
                      canvasRef={canvasRef}
                    />
                  </div>
                }
              >
                <Renderer3D
                  project={project}
                  depth={immersive ? 1 : depth}
                  original={original}
                  timeline={timeline}
                  immersive={immersive}
                  gyro={gyro}
                  travel={travel}
                  recenter={recenter}
                  quality={quality}
                  onCapture={onCapture}
                  onUnavailable={unavailable}
                  audioEngine={audioEngine.current}
                  paused={!running}
                />
              </GPUFallback>
            )}
            {!project.strokes.length && mode === "draw" && (
              <div className="studio-empty">
                Tout commence par un geste.
                <span>Choisis une matière et dessine librement.</span>
              </div>
            )}
            {mode === "animate" && (
              <div className="studio-mode-hint">
                {EFFECTS.find((e) => e.id === effect)?.name} · Passe sur la
                matière à animer.
              </div>
            )}
            {mode === "view" && (
              <button
                className="studio-return"
                onClick={() => {
                  setImmersive(false);
                  setTravel(false);
                  setGyro(false);
                  changeMode("draw");
                }}
              >
                ← Retour à l’atelier
              </button>
            )}
            {mode === "view" && (
              <div className="studio-quick-controls">
                <button
                  aria-label={
                    running ? "Mettre en pause" : "Reprendre les animations"
                  }
                  aria-pressed={!running}
                  onClick={() => setRunning((v) => !v)}
                >
                  {running ? "Ⅱ" : "▷"}
                </button>
                {audio && (
                  <button
                    aria-label="Couper le son"
                    onClick={() => void toggleAudio()}
                  >
                    ♫
                  </button>
                )}
              </div>
            )}
            {immersive && (
              <button
                className="studio-orbit-return"
                onClick={() => {
                  setImmersive(false);
                  setTravel(false);
                  setGyro(false);
                  setDepth(1);
                }}
              >
                Vue d’ensemble
              </button>
            )}
          </section>
          <footer
            className={
              "studio-toolbar " +
              (mode === "view" && !toolsVisible && !panel ? "tools-hidden" : "")
            }
            onPointerDown={(e) => e.stopPropagation()}
          >
            {mode === "draw" && (
              <>
                <div
                  className="studio-brush-strip"
                  role="group"
                  aria-label="Brosses favorites"
                >
                  {project.favorites.map((id) => (
                    <button
                      key={id}
                      aria-label={
                        "Brosse " + BRUSHES.find((b) => b.id === id)!.name
                      }
                      aria-pressed={brush === id && !eraser}
                      onClick={() => {
                        setBrush(id);
                        setEraser(false);
                      }}
                    >
                      <BrushPreview brush={id} color={color} />
                      <span>{BRUSHES.find((b) => b.id === id)!.name}</span>
                    </button>
                  ))}
                  <button
                    className="studio-more"
                    aria-label="Les douze brosses"
                    onClick={() =>
                      setPanel(panel === "brushes" ? null : "brushes")
                    }
                  >
                    ＋<span>Matières</span>
                  </button>
                </div>
                <div className="studio-settings-row">
                  <label className="studio-color">
                    Couleur
                    <input
                      aria-label="Couleur"
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                    />
                  </label>
                  <label>
                    Taille
                    <input
                      aria-label="Taille"
                      type="range"
                      min="2"
                      max="96"
                      value={size}
                      onChange={(e) => setSize(+e.target.value)}
                    />
                  </label>
                  <label>
                    Opacité
                    <input
                      aria-label="Opacité"
                      type="range"
                      min=".05"
                      max="1"
                      step=".05"
                      value={opacity}
                      onChange={(e) => setOpacity(+e.target.value)}
                    />
                  </label>
                  <button
                    aria-label="Gomme sélective"
                    aria-pressed={eraser}
                    onClick={() => setEraser((v) => !v)}
                  >
                    ▱
                  </button>
                </div>
              </>
            )}
            {mode === "animate" && (
              <>
                <div
                  className="studio-effect-strip"
                  role="group"
                  aria-label="Brosses d’animation"
                >
                  {EFFECTS.map((e) => (
                    <button
                      key={e.id}
                      aria-pressed={effect === e.id}
                      onClick={() => setEffect(e.id)}
                    >
                      <span>{e.glyph}</span>
                      {e.name}
                    </button>
                  ))}
                </div>
                <div className="studio-settings-row">
                  <label>
                    Intensité
                    <input
                      aria-label="Intensité"
                      type="range"
                      min=".05"
                      max="1"
                      step=".05"
                      value={intensity}
                      onChange={(e) => setIntensity(+e.target.value)}
                    />
                  </label>
                  <label>
                    Rayon
                    <input
                      aria-label="Rayon d’application"
                      type="range"
                      min=".03"
                      max=".4"
                      step=".01"
                      value={radius}
                      onChange={(e) => setRadius(+e.target.value)}
                    />
                  </label>
                  <button
                    onClick={() =>
                      setPanel(panel === "effects" ? null : "effects")
                    }
                  >
                    Effets · {project.effects.length}
                  </button>
                </div>
              </>
            )}
            {mode === "view" && (
              <div className="studio-view-tools">
                {!immersive ? (
                  <>
                    <div className="studio-view-pills">
                      <button
                        aria-pressed={depth === 0}
                        onClick={() => setDepth(0)}
                      >
                        Tableau
                      </button>
                      <button
                        aria-pressed={depth > 0}
                        onClick={() => setDepth(0.65)}
                      >
                        Sculpture
                      </button>
                      <button
                        onClick={() => {
                          setDepth(1);
                          setImmersive(true);
                        }}
                      >
                        Entrer dans l’œuvre
                      </button>
                    </div>
                    <label className="studio-depth">
                      Profondeur{" "}
                      <input
                        aria-label="Profondeur"
                        type="range"
                        min="0"
                        max="1"
                        step=".01"
                        value={depth}
                        onChange={(e) => setDepth(+e.target.value)}
                      />
                      <output>{Math.round(depth * 100)} %</output>
                    </label>
                  </>
                ) : (
                  <div className="studio-view-pills">
                    <button
                      aria-pressed={travel}
                      onClick={() => setTravel((v) => !v)}
                    >
                      {travel ? "Arrêter le voyage" : "Voyager"}
                    </button>
                    <button
                      aria-label="Gyroscope"
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
                          unavailable();
                        }
                      }}
                    >
                      ◎ Gyro
                    </button>
                    {gyro && (
                      <button
                        aria-label="Recentrer"
                        onClick={() => setRecenter((n) => n + 1)}
                      >
                        ↺
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="studio-actions">
              <button
                aria-label="Annuler"
                disabled={!history.past.length}
                onClick={undo}
              >
                ↶
              </button>
              <button
                aria-label="Rétablir"
                disabled={!history.future.length}
                onClick={redo}
              >
                ↷
              </button>
              <button
                aria-pressed={original}
                onClick={() => setOriginal((v) => !v)}
              >
                {original ? "Original" : "Voir l’original"}
              </button>
              <button
                aria-label={audio ? "Couper le son" : "Activer le son"}
                aria-pressed={audio}
                onClick={() => void toggleAudio()}
              >
                {audio ? "♫ Son" : "♫ Silence"}
              </button>
              <button
                aria-label="Réglages"
                onClick={() =>
                  setPanel(panel === "settings" ? null : "settings")
                }
              >
                ⚙
              </button>
              <button
                aria-label="Sauvegarder et exporter"
                onClick={() => setPanel(panel === "files" ? null : "files")}
              >
                ↗
              </button>
              <span className="studio-save-state" role="status">
                {saveState}
              </span>
            </div>
          </footer>
        </>
      )}
      {panel && (
        <section
          className="studio-panel"
          role="dialog"
          aria-label={
            panel === "brushes"
              ? "Les douze matières"
              : panel === "effects"
                ? "Animations locales"
                : panel === "projects"
                  ? "Projets locaux"
                  : "Réglages et fichiers"
          }
        >
          <header>
            <strong>
              {panel === "brushes"
                ? "Les matières"
                : panel === "effects"
                  ? "Les mouvements peints"
                  : panel === "projects"
                    ? "Vos projets locaux"
                    : panel === "files"
                      ? "Garder une trace"
                      : "L’atelier à votre rythme"}
            </strong>
            <button
              aria-label="Fermer le panneau"
              onClick={() => setPanel(null)}
            >
              ×
            </button>
          </header>
          {panel === "brushes" && (
            <>
              <div className="studio-palette">
                {BRUSHES.map((b) => (
                  <div key={b.id}>
                    <button
                      aria-label={"Choisir " + b.name}
                      aria-pressed={brush === b.id}
                      title={b.description}
                      onClick={() => {
                        setBrush(b.id);
                        setEraser(false);
                      }}
                    >
                      <BrushPreview brush={b.id} color={color} />
                      {b.name}
                    </button>
                    <button
                      aria-label={"Favorite " + b.name}
                      aria-pressed={project.favorites.includes(b.id)}
                      onClick={() => toggleFavorite(b.id)}
                    >
                      {project.favorites.includes(b.id) ? "★" : "☆"}
                    </button>
                  </div>
                ))}
              </div>
              <label className="studio-field">
                Combiner avec une seconde matière
                <select
                  aria-label="Brosse hybride"
                  value={secondary}
                  onChange={(e) => setSecondary(e.target.value as BrushId | "")}
                >
                  <option value="">Une seule matière</option>
                  {BRUSHES.filter((b) => b.id !== brush).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              {(["spacing", "amplitude", "dispersion"] as const).map((key) => (
                <label className="studio-field" key={key}>
                  {key === "spacing"
                    ? "Espacement"
                    : key === "amplitude"
                      ? "Amplitude"
                      : "Dispersion"}
                  <input
                    aria-label={"Brosse · " + key}
                    type="range"
                    min=".3"
                    max="2"
                    step=".1"
                    value={brushParameters[key]}
                    onChange={(e) =>
                      setBrushParameters((p) => ({
                        ...p,
                        [key]: +e.target.value,
                      }))
                    }
                  />
                </label>
              ))}
            </>
          )}
          {panel === "effects" && (
            <>
              <label className="studio-field">
                Vitesse
                <input
                  aria-label="Vitesse des effets"
                  type="range"
                  min=".1"
                  max="2"
                  step=".1"
                  value={speed}
                  onChange={(e) => setSpeed(+e.target.value)}
                />
              </label>
              <label className="studio-field">
                Durée du prochain effet
                <select
                  value={duration}
                  onChange={(e) => setDuration(+e.target.value)}
                >
                  <option value={0}>Continu</option>
                  <option value={15}>15 secondes</option>
                  <option value={45}>45 secondes</option>
                </select>
              </label>
              <button
                className="studio-primary"
                onClick={() => {
                  const created = paintEffect(
                    project,
                    "breathe",
                    [{ x: 0.5, y: 0.5 }],
                    { intensity: 0.25, speed: 0.35, radius: 1, duration: 0 },
                    timeline.time,
                  );
                  if (
                    created &&
                    [...project.effects, created].reduce(
                      (n, e) =>
                        n +
                        Object.values(e.weights).reduce(
                          (a, w) => a + w.length,
                          0,
                        ),
                      0,
                    ) > 1_000_000
                  ) {
                    notify("Retirez un effet avant d’animer toute l’œuvre.");
                    return;
                  }
                  if (project.effects.length >= 80) {
                    notify("Retirez un effet avant d’en ajouter un autre.");
                    return;
                  }
                  if (created)
                    commit({
                      ...project,
                      effects: [...project.effects, created],
                    });
                }}
              >
                Tout mettre en mouvement
              </button>
              <ul className="studio-effect-list">
                {project.effects.map((e) => (
                  <li key={e.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={e.enabled}
                        onChange={() =>
                          commit({
                            ...project,
                            effects: project.effects.map((x) =>
                              x.id === e.id ? { ...x, enabled: !x.enabled } : x,
                            ),
                          })
                        }
                      />
                      {EFFECTS.find((x) => x.id === e.type)?.name}
                    </label>
                    <button
                      aria-label={
                        "Supprimer " +
                        EFFECTS.find((x) => x.id === e.type)?.name
                      }
                      onClick={() =>
                        commit({
                          ...project,
                          effects: project.effects.filter((x) => x.id !== e.id),
                        })
                      }
                    >
                      ×
                    </button>
                    <input
                      aria-label={
                        "Intensité de " +
                        EFFECTS.find((x) => x.id === e.type)?.name
                      }
                      type="range"
                      min=".05"
                      max="1"
                      step=".05"
                      value={e.intensity}
                      onChange={(event) =>
                        commit({
                          ...project,
                          effects: project.effects.map((x) =>
                            x.id === e.id
                              ? { ...x, intensity: +event.target.value }
                              : x,
                          ),
                        })
                      }
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
          {panel === "settings" && (
            <>
              <label className="studio-field">
                Papier
                <input
                  aria-label="Couleur du fond"
                  type="color"
                  value={project.background}
                  onChange={(e) =>
                    commit({ ...project, background: e.target.value })
                  }
                />
              </label>
              <label className="studio-field">
                Volume
                <input
                  aria-label="Volume général"
                  type="range"
                  min="0"
                  max=".8"
                  step=".02"
                  value={volume}
                  onChange={(e) => setVolume(+e.target.value)}
                />
              </label>
              <label className="studio-field">
                <input
                  type="checkbox"
                  checked={quality}
                  onChange={(e) => setQuality(e.target.checked)}
                />
                Qualité légère
              </label>
              <p>
                Création libre, sans analyse du dessin. Les mouvements et le son
                restent sous votre contrôle.
              </p>
            </>
          )}
          {panel === "files" && (
            <>
              <label className="studio-field">
                Titre
                <input
                  aria-label="Titre du projet"
                  maxLength={120}
                  value={project.title}
                  onChange={(e) =>
                    commit({
                      ...project,
                      title: e.target.value || "Mon dessin vivant",
                    })
                  }
                />
              </label>
              <div className="studio-file-grid">
                <button onClick={() => void png()}>Exporter PNG</button>
                <button onClick={saveJSON}>Exporter le projet JSON</button>
                <button onClick={() => fileInput.current?.click()}>
                  Importer un projet JSON
                </button>
                <button
                  onClick={() => {
                    void ProjectStore.list()
                      .then((p) => {
                        setLibrary(p);
                        setPanel("projects");
                      })
                      .catch(() => notify("Projets locaux indisponibles."));
                  }}
                >
                  Mes projets
                </button>
                <button
                  disabled={!canRecord() || recording}
                  onClick={() => void record()}
                >
                  Exporter l’animation WebM · 8 s
                </button>
                <button onClick={() => void newWork()}>Nouvelle œuvre</button>
                <button onClick={() => void resetWork()}>
                  Réinitialiser cette œuvre
                </button>
              </div>
              <small className="studio-persistence">{saveState}</small>
              <small>
                Le WebM contient l’animation 2D, sans piste sonore. Aucun envoi
                vers un serveur.
              </small>
            </>
          )}
          {panel === "projects" && (
            <div className="studio-project-list">
              {library.map((p) => (
                <button
                  key={p.id}
                  onClick={async () => {
                    try {
                      if (!welcome)
                        await ProjectStore.save({
                          ...project,
                          playhead: timeline.time,
                        });
                      load(p);
                    } catch {
                      notify(
                        "Exportez d’abord le projet courant pour le conserver.",
                      );
                    }
                  }}
                >
                  {p.title}
                  <small>
                    {p.strokes.length} tracés ·{" "}
                    {new Date(p.updatedAt).toLocaleDateString("fr-FR")}
                  </small>
                </button>
              ))}
              {!library.length && (
                <p>Aucun projet enregistré sur cet appareil.</p>
              )}
            </div>
          )}
        </section>
      )}
      {recording && (
        <div className="studio-recording" role="status">
          Enregistrement de l’animation…{" "}
          <button onClick={() => abortExport.current?.abort()}>Annuler</button>
        </div>
      )}
      {notice && (
        <div className="studio-notice" role="alert">
          {notice}
        </div>
      )}
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        aria-label="Importer un fichier projet"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importFile(file);
          e.target.value = "";
        }}
      />
    </main>
  );
}
