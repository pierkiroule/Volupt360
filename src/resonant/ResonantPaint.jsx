import { PROJECTIVE_TOOLS } from "./projectivePigment.js";
import { createPaperLife } from "./createPaperLife.js";
import { useEffect, useRef, useState } from "react";
import { createDrawingSurface, DRAWING_TOOLS } from "./drawingSurface.js";
import { ANIMATION_STYLES } from "./createResonantWorld.js";
import { createSoundNest } from "../engine/createSoundNest.js";
import { CHILL_UNIVERSE } from "../chill/chillConfig.js";
import { useTwigBank } from "../sonoizo/useTwigBank.js";
import { ToolIcon } from "../chill/ToolIcon.jsx";
const COLORS = [
  "#273744",
  "#456f9c",
  "#429b91",
  "#778d55",
  "#c4a34e",
  "#d77c55",
  "#b45267",
  "#8a6b9c",
  "#ffffff",
  "#000000",
];
export default function ResonantPaint({ projective = false }) {
  const stage = useRef(null),
    paper = useRef(null),
    engine = useRef(null),
    drawing = useRef(null),
    pointer = useRef(null),
    mode = useRef("2d"),
    life = useRef(null),
    exportTouch = useRef(false);
  const twigs = useTwigBank({ poeticVoices: false });
  const [dimension, setDimension] = useState("2d"),
    [tool, setTool] = useState(projective ? "watercolor" : "paint"),
    [color, setColor] = useState("#456f9c"),
    [size, setSize] = useState(projective ? 70 : 22),
    [opacity, setOpacity] = useState(0.85),
    [filled, setFilled] = useState(true),
    [shape, setShape] = useState("star"),
    [stats, setStats] = useState({ count: 0, canUndo: false, canRedo: false }),
    [style, setStyle] = useState("flow"),
    [moving, setMoving] = useState(true),
    [folded, setFolded] = useState(false),
    [volume, setVolume] = useState(0.65),
    [error, setError] = useState(""),
    [gyro, setGyro] = useState(false),
    [vr, setVr] = useState(false);
  mode.current = dimension;
  function refresh() {
    const c = paper.current;
    if (!c || !drawing.current) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(drawing.current.canvas, 0, 0);
  }
  useEffect(() => {
    document.title = projective
      ? "EmoCiel360 — Peins ton ciel émotionnel"
      : "Resonant Paint 360 — Le dessin résonant";
    const surface = createDrawingSurface(
      (state) => {
        setStats({
          count: state.count,
          canUndo: state.canUndo,
          canRedo: state.canRedo,
        });
        if (paper.current) {
          paper.current.dataset.actions = String(state.count);
          const c = paper.current.getContext("2d");
          c.clearRect(0, 0, 1200, 800);
          c.drawImage(state.canvas, 0, 0);
        }
        life.current?.update();
      },
      { projective },
    );
    drawing.current = surface;
    const owner = createSoundNest(stage.current, {
      onError: setError,
      onVRChange: setVr,
    });
    engine.current = owner;
    owner.setMood(
      {
        ...CHILL_UNIVERSE,
        background: "#faf8f2",
        workshop: true,
        resonanceBubbles: false,
        constellation: false,
      },
      [],
    );
    owner.setPoeticFragments([]);
    if (!projective) owner.setPadSource(twigs.bank.current);
    owner.startSpatialSculpture();
    owner.setPaperVisible(true);
    owner.pauseChillSession(false);
    const shortcut = (e) => {
      if (
        mode.current !== "2d" ||
        !(e.ctrlKey || e.metaKey) ||
        /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)
      )
        return;
      if (e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? surface.redo() : surface.undo();
      }
      if (e.key.toLowerCase() === "y") {
        e.preventDefault();
        surface.redo();
      }
    };
    const finishInterrupted = () => {
      surface.finish();
      pointer.current = null;
    };
    window.addEventListener("blur", finishInterrupted);
    window.addEventListener("keydown", shortcut);
    return () => {
      window.removeEventListener("blur", finishInterrupted);
      window.removeEventListener("keydown", shortcut);
      owner.dispose();
      surface.dispose();
      drawing.current = null;
    };
  }, []);
  useEffect(() => {
    if (dimension === "2d") {
      refresh();
      paper.current.dataset.actions = String(stats.count);
      if (projective)
        life.current = createPaperLife(
          paper.current,
          drawing.current.canvas,
          () => pointer.current !== null,
        );
    }
    return () => {
      life.current?.dispose();
      life.current = null;
    };
  }, [dimension]);
  function point(e) {
    const r = paper.current.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * 1200,
      y: ((e.clientY - r.top) / r.height) * 800,
    };
  }
  function down(e) {
    if (!e.isPrimary || e.button > 0 || pointer.current !== null) return;
    paper.current.setPointerCapture(e.pointerId);
    pointer.current = e.pointerId;
    if (
      !drawing.current.begin(point(e), {
        tool,
        color,
        size,
        opacity,
        filled,
        shape,
      })
    ) {
      pointer.current = null;
      setError(
        "La limite de 300 gestes est atteinte. Annule un geste ou exporte ton dessin.",
      );
    }
    refresh();
  }
  function move(e) {
    if (pointer.current !== e.pointerId) return;
    drawing.current.move(point(e));
    refresh();
  }
  function finish(e) {
    if (pointer.current !== e.pointerId) return;
    pointer.current = null;
    drawing.current.finish();
    refresh();
  }
  async function enterWorld() {
    drawing.current.finish();
    pointer.current = null;
    engine.current.setResonantDrawing(drawing.current.canvas, {
      autonomous: projective,
    });
    engine.current.setResonantAnimation(style);
    engine.current.setPaperVisible(false);
    engine.current.travelPanorama();
    setMoving(true);
    setDimension("3d");
    if (projective) return;
    try {
      await twigs.bank.current.preparePlayback();
      if (
        twigs.bank.current.getSnapshot().ambience.loaded &&
        !twigs.bank.current.getSnapshot().ambience.playing
      )
        await twigs.bank.current.toggleAmbience();
    } catch (e) {
      setError(e.message);
    }
  }
  function returnToPaper() {
    engine.current.stopPanorama();
    engine.current.setPaperVisible(true);
    void engine.current.requestContemplationGyroscope(false);
    twigs.bank.current.pauseAmbience();
    setGyro(false);
    setDimension("2d");
  }
  async function importMusic(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    try {
      const bank = twigs.bank.current;
      await bank.preparePlayback();
      await bank.importAmbience(file);
      bank.setAmbienceVolume(volume);
      if (mode.current === "3d" && !bank.getSnapshot().ambience.playing)
        await bank.toggleAmbience();
    } catch (e) {
      setError(e.message);
    }
  }
  function exportPNG() {
    const a = document.createElement("a");
    a.href = drawing.current.exportPNG();
    a.download = projective ? "emociel360.png" : "resonant-paint-360.png";
    a.click();
  }
  const ambience = twigs.snapshot.ambience;
  return (
    <main
      className={`resonant-app ${projective ? "emociel-app" : ""} ${dimension === "3d" ? "resonant-world" : ""}`}
    >
      <div id="stage" ref={stage} />
      <header className="resonant-header">
        <div>
          <h1>
            {projective ? (
              <>
                EmoCiel<span>360</span>
              </>
            ) : (
              <>
                Resonant Paint <span>360</span>
              </>
            )}
          </h1>
          <p>
            {projective ? (
              dimension === "2d" ? (
                "Peins ton ciel émotionnel, à ta façon."
              ) : (
                "Contemple et traverse ta peinture."
              )
            ) : (
              <>
                Le dessin résonant ·{" "}
                {dimension === "2d"
                  ? "Dessiner librement"
                  : "Habiter son dessin"}
              </>
            )}
          </p>
        </div>
        <button
          className="resonant-primary"
          onClick={dimension === "2d" ? enterWorld : returnToPaper}
        >
          {dimension === "2d"
            ? projective
              ? "Entrer dans mon ciel"
              : "Animer en 360°"
            : "Retour au dessin"}
        </button>
      </header>
      {dimension === "2d" && (
        <section className="resonant-paper-area" aria-label="Atelier de dessin">
          <canvas
            ref={paper}
            width="1200"
            height="800"
            aria-label="Dessin 2D"
            role="img"
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={finish}
            onPointerCancel={finish}
            onLostPointerCapture={finish}
          />
        </section>
      )}
      <section
        className="resonant-toolbar"
        aria-label={
          dimension === "2d" ? "Outils de dessin" : "Animation du dessin"
        }
      >
        <div className="resonant-toolbar-top">
          {dimension === "2d" ? (
            <>
              <button
                disabled={!stats.canUndo}
                onClick={() => drawing.current.undo()}
                aria-label="Annuler"
              >
                <ToolIcon name="undo" />
              </button>
              <button
                disabled={!stats.canRedo}
                onClick={() => drawing.current.redo()}
                aria-label="Rétablir"
              >
                ↷
              </button>
              <button
                onPointerDown={() => {
                  exportTouch.current = false;
                }}
                onPointerUp={(e) => {
                  if (e.pointerType === "touch") {
                    exportTouch.current = true;
                    exportPNG();
                  }
                }}
                onClick={(e) => {
                  if (e.detail === 0 || !exportTouch.current) exportPNG();
                  exportTouch.current = false;
                }}
              >
                PNG
              </button>
            </>
          ) : (
            <>
              <label>
                Animation
                <select
                  aria-label="Style d’animation"
                  value={style}
                  onChange={(e) => {
                    setStyle(e.target.value);
                    engine.current.setResonantAnimation(e.target.value);
                  }}
                >
                  {ANIMATION_STYLES.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                aria-label={moving ? "Suspendre le voyage" : "Voyager"}
                onClick={() => {
                  if (moving) engine.current.stopPanorama();
                  else engine.current.travelPanorama();
                  setMoving(!moving);
                }}
              >
                <ToolIcon name={moving ? "pause" : "play"} />
              </button>
              <button
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
              </button>
              <button
                aria-label="Casque VR"
                aria-pressed={vr}
                onClick={async () => {
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
            </>
          )}
          <button
            className="resonant-fold"
            aria-label={folded ? "Déplier les outils" : "Plier les outils"}
            aria-expanded={!folded}
            onClick={() => setFolded(!folded)}
          >
            <ToolIcon name={folded ? "expand" : "fold"} />
          </button>
        </div>
        {!folded &&
          (dimension === "2d" ? (
            <>
              <div
                className="resonant-drawing-tools"
                role="group"
                aria-label="Outils"
              >
                {(projective ? PROJECTIVE_TOOLS : DRAWING_TOOLS).map(
                  ([id, name, glyph]) => (
                    <button
                      key={id}
                      aria-label={name}
                      title={name}
                      aria-pressed={tool === id}
                      onClick={() => setTool(id)}
                    >
                      <span>{glyph}</span>
                      <small>{name}</small>
                    </button>
                  ),
                )}
              </div>
              <div
                className="resonant-swatches"
                role="group"
                aria-label="Couleurs"
              >
                {COLORS.map((c) => (
                  <button
                    key={c}
                    aria-label={`Couleur ${c}`}
                    aria-pressed={color === c}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
                <input
                  type="color"
                  aria-label="Couleur personnalisée"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </div>
              <div className="resonant-controls">
                <label>
                  Taille
                  <input
                    type="range"
                    aria-label="Taille"
                    min="2"
                    max={projective ? "160" : "100"}
                    value={size}
                    onChange={(e) => setSize(Number(e.target.value))}
                  />
                  <output>{size}</output>
                </label>
                <label>
                  Opacité
                  <input
                    type="range"
                    aria-label="Opacité"
                    min=".05"
                    max="1"
                    step=".05"
                    value={opacity}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                  />
                  <output>{Math.round(opacity * 100)}%</output>
                </label>
              </div>
              <div className="resonant-options">
                {["rectangle", "ellipse", "stamp"].includes(tool) && (
                  <label>
                    <input
                      type="checkbox"
                      checked={filled}
                      onChange={(e) => setFilled(e.target.checked)}
                    />
                    Forme pleine
                  </label>
                )}
                {tool === "stamp" && (
                  <label>
                    Tampon
                    <select
                      aria-label="Forme du tampon"
                      value={shape}
                      onChange={(e) => setShape(e.target.value)}
                    >
                      <option value="star">Étoile</option>
                      <option value="circle">Cercle</option>
                      <option value="square">Carré</option>
                      <option value="triangle">Triangle</option>
                    </select>
                  </label>
                )}
                <button
                  disabled={!stats.canUndo}
                  onClick={() => drawing.current.clear()}
                >
                  Effacer tout
                </button>
                <span>{stats.count}/300 gestes</span>
              </div>
            </>
          ) : projective ? (
            <p className="emociel-contemplation">
              {moving
                ? "Laisse-toi porter. Glisse pour orienter le regard."
                : "Explore du regard, au doigt ou avec le gyroscope."}
            </p>
          ) : (
            <div className="resonant-audio">
              <label className="resonant-import">
                Importer mon MP3
                <input
                  type="file"
                  aria-label="Importer un MP3"
                  accept="audio/*,.mp3"
                  onChange={importMusic}
                />
              </label>
              <span>
                {ambience?.name ||
                  "Sans musique · importe ton MP3 (20 Mo max.)"}
              </span>
              <button
                disabled={!ambience?.loaded}
                onClick={async () => {
                  try {
                    await twigs.bank.current.toggleAmbience();
                  } catch (e) {
                    setError(e.message);
                  }
                }}
              >
                {ambience?.playing ? "Pause audio" : "Lire"}
              </button>
              <label>
                Volume
                <input
                  type="range"
                  aria-label="Volume"
                  min="0"
                  max="1"
                  step=".05"
                  value={volume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setVolume(v);
                    twigs.bank.current.setAmbienceVolume(v);
                  }}
                />
              </label>
            </div>
          ))}
      </section>
      {(error || twigs.error) && (
        <p className="resonant-error" role="alert">
          <span>{error || twigs.error}</span>
          <button
            onClick={() => {
              setError("");
              twigs.clearError();
            }}
            aria-label="Fermer le message"
          >
            ×
          </button>
        </p>
      )}
    </main>
  );
}
