import { useEffect, useMemo, useRef, useState } from "react";
import {
  MUSIC_MODES,
  PARAMETERS,
  musicForChoices,
} from "../audio/procedural/musicScore.js";
import { downloadBlob } from "../utils/sensoryComposition.ts";
import "./music.css";
export default function MusicPanel({ choices, audioRef }) {
  const initial = useMemo(() => musicForChoices(choices), [choices]);
  const [open, setOpen] = useState(false),
    [status, setStatus] = useState("stopped"),
    [busy, setBusy] = useState(false),
    [mode, setMode] = useState(initial.mode),
    [parameters, setParameters] = useState(initial.parameters),
    [seed, setSeed] = useState(initial.seed),
    [volume, setVolume] = useState(0.62),
    [error, setError] = useState("");
  const alive = useRef(false),
    module = useRef(null),
    canvas = useRef(null),
    latest = useRef(null);
  latest.current = { seed, mode, parameters, volume };
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (audioRef.current) {
        module.current?.disposeMusicEngine(audioRef.current);
        audioRef.current = null;
      }
    };
  }, [audioRef]);
  useEffect(() => {
    setMode(initial.mode);
    setParameters(initial.parameters);
    setSeed(initial.seed);
    const engine = audioRef.current;
    if (engine) {
      engine.configure(initial);
      engine.newComposition(initial.seed);
    }
  }, [initial, audioRef]);
  useEffect(() => {
    audioRef.current?.configure({ mode, parameters });
  }, [mode, parameters, audioRef]);
  useEffect(() => {
    audioRef.current?.setVolume(volume);
  }, [volume, audioRef]);
  useEffect(() => {
    if (!open) return;
    let id = 0,
      last = 0;
    const draw = (now) => {
      if (now - last > 80) {
        last = now;
        const engine = audioRef.current;
        if (engine) setStatus(engine.status);
        const ctx = canvas.current?.getContext("2d");
        if (ctx) {
          const energy = engine?.getFeatures().energy || 0;
          ctx.clearRect(0, 0, 240, 28);
          ctx.fillStyle = "#bdd6e8";
          for (let i = 0; i < 24; i++) {
            const h =
              2 +
              energy *
                23 *
                (0.45 + 0.55 * Math.sin(i * 0.7 + now * 0.001) ** 2);
            ctx.globalAlpha = 0.25 + energy * 0.6;
            ctx.fillRect(i * 10 + 2, 14 - h / 2, 5, h);
          }
        }
      }
      id = requestAnimationFrame(draw);
    };
    id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [open, audioRef]);
  async function play() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      module.current =
        await import("../audio/procedural/ProceduralMusicEngine.js");
      if (!alive.current) return;
      const engine = module.current.getMusicEngine(latest.current);
      audioRef.current = engine;
      if (engine.seed !== latest.current.seed)
        engine.newComposition(latest.current.seed);
      engine.configure(latest.current);
      engine.setVolume(latest.current.volume);
      await engine.play();
      if (alive.current) setStatus(engine.status);
    } catch (e) {
      if (alive.current) setError("Audio indisponible : " + e.message);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  function newComposition(reuse = false) {
    const value = reuse
      ? seed
      : String(crypto.getRandomValues(new Uint32Array(1))[0]);
    setSeed(value);
    audioRef.current?.newComposition(value);
  }
  async function wav() {
    const engine = audioRef.current;
    if (!engine || busy) return;
    setBusy(true);
    setError("");
    const wasPlaying = engine.status === "playing";
    engine.pause();
    try {
      const blob = await engine.exportWav(30);
      if (alive.current)
        downloadBlob(
          blob,
          "squibble-" +
            engine.seed.replace(/[^\p{L}\p{N}_-]/gu, "_").slice(0, 50) +
            ".wav",
        );
    } catch (e) {
      if (alive.current) setError(e.message);
    } finally {
      if (alive.current) {
        if (wasPlaying) await engine.play();
        setStatus(engine.status);
        setBusy(false);
      }
    }
  }
  return (
    <aside
      className={"squibble-music " + (open ? "is-open" : "")}
      aria-label="Musique générative"
    >
      <button
        className="music-toggle"
        aria-label="Réglages musicaux"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        ♫ <span>Musique</span>
      </button>
      <button
        className="music-quick"
        aria-label={
          status === "playing" ? "Mettre le son en pause" : "Activer le son"
        }
        disabled={busy}
        onClick={() => {
          if (audioRef.current?.status === "playing") {
            audioRef.current.pause();
            setStatus("paused");
          } else play();
        }}
      >
        {status === "playing" ? "Ⅱ" : "▷"}
      </button>
      {open && (
        <div className="music-body">
          <header>
            <strong>Musique vivante</strong>
            <span>
              {status === "playing"
                ? "En lecture"
                : status === "interrupted"
                  ? "Audio interrompu · reprendre"
                  : status === "paused"
                    ? "En pause"
                    : "À l’écoute"}
            </span>
          </header>
          <canvas
            ref={canvas}
            width="240"
            height="28"
            aria-label="Énergie sonore"
          />
          <div className="music-actions">
            <button
              onClick={play}
              disabled={busy || status === "playing"}
              aria-label="Lire la musique"
            >
              ▶
            </button>
            <button
              onClick={() => {
                audioRef.current?.pause();
                setStatus("paused");
              }}
              disabled={!audioRef.current || busy}
              aria-label="Pause musicale"
            >
              Ⅱ
            </button>
            <button
              onClick={() => {
                audioRef.current?.stop();
                setStatus("stopped");
              }}
              disabled={!audioRef.current || busy}
              aria-label="Arrêter la musique"
            >
              ■
            </button>
            <label>
              Volume
              <input
                aria-label="Volume musical"
                type="range"
                min="0"
                max="1"
                step=".01"
                value={volume}
                onChange={(e) => setVolume(+e.target.value)}
              />
            </label>
          </div>
          <label>
            Univers musical
            <select
              aria-label="Univers musical"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              {Object.entries(MUSIC_MODES).map(([id, c]) => (
                <option key={id} value={id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <div className="music-parameters">
            {Object.entries(PARAMETERS).map(([key, c]) => (
              <label key={key}>
                {c.label}
                <input
                  aria-label={c.label}
                  type="range"
                  min="0"
                  max="1"
                  step=".01"
                  value={parameters[key]}
                  onChange={(e) =>
                    setParameters({ ...parameters, [key]: +e.target.value })
                  }
                />
              </label>
            ))}
          </div>
          <div className="music-actions">
            <button onClick={() => newComposition()}>
              Nouvelle composition
            </button>
            <button
              onClick={() => {
                const e = audioRef.current;
                if (e) {
                  e.evolve();
                  setParameters({ ...e.target });
                } else
                  setParameters({
                    ...parameters,
                    complexity: Math.min(1, parameters.complexity + 0.12),
                  });
              }}
            >
              Faire évoluer
            </button>
            <button
              onClick={() => {
                const e = audioRef.current;
                if (e) {
                  e.calm();
                  setParameters({ ...e.target });
                } else
                  setParameters({
                    ...parameters,
                    energy: 0.18,
                    density: 0.22,
                    tension: 0.08,
                    fluidity: 0.88,
                  });
              }}
            >
              Revenir au calme
            </button>
          </div>
          <label>
            Graine
            <input
              aria-label="Graine musicale"
              maxLength={80}
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
            />
          </label>
          <div className="music-actions">
            <button onClick={() => newComposition(true)} disabled={busy}>
              Rejouer cette graine
            </button>
            <button onClick={wav} disabled={!audioRef.current || busy}>
              WAV · 30 s
            </button>
          </div>
          <small>
            {busy
              ? "Préparation en cours…"
              : "Synthèse procédurale · le piano est un timbre de synthèse, sans échantillon acoustique. Export : un nouvel extrait depuis la graine et les réglages actuels."}
          </small>
          {error && <p role="alert">{error}</p>}
        </div>
      )}
    </aside>
  );
}
